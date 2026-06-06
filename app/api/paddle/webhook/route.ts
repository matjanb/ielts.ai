/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { verifyPaddleSignature } from '@/lib/paddle/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/lib/types/database'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const secret = process.env.PADDLE_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ error: 'Paddle not configured' }, { status: 503 })

  const raw = await request.text() // raw body is required for signature verification
  if (!verifyPaddleSignature(raw, request.headers.get('paddle-signature'), secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  let event: any
  try { event = JSON.parse(raw) } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }

  const admin = createAdminClient()

  // Idempotency: claim this event_id once. A unique-violation means Paddle is
  // retrying an event we already handled — ack and stop so the status can't
  // flip-flop. Any other insert error is logged but we still process (don't drop
  // a real event because the ledger hiccuped).
  const eventId: string | undefined = typeof event?.event_id === 'string' ? event.event_id : undefined
  if (eventId) {
    const { error: claimErr } = await admin
      .from('processed_webhooks')
      .insert({ event_id: eventId, event_type: event?.event_type ?? null })
    if (claimErr) {
      if (claimErr.code === '23505') return NextResponse.json({ received: true, duplicate: true })
      console.error('[paddle/webhook] dedup insert error', claimErr)
    }
  }

  async function setStatus(
    userId: string,
    status: 'pro' | 'free' | 'cancelled',
    customerId?: string,
    periodEnd?: string,
  ) {
    const patch: Database['public']['Tables']['profiles']['Update'] = {
      subscription_status: status,
      updated_at: new Date().toISOString(),
    }
    // NOTE: the live DB column is still named `stripe_customer_id` (the Paddle
    // rename migration 012 was never applied). We store the Paddle customer id
    // here so the whole update doesn't fail on an unknown column. Apply
    // migration 012 to rename it to paddle_customer_id, then update this line.
    if (customerId) patch.stripe_customer_id = customerId
    // Persist the paid-through date. Access is granted until this moment even
    // after cancellation, so the user keeps what they paid for. See
    // lib/subscription.ts (isSubscriptionActive).
    if (periodEnd) patch.subscription_expires_at = periodEnd
    await admin.from('profiles').update(patch).eq('id', userId)
  }

  try {
    const data = event?.data ?? {}
    // user_id is attached as custom data at checkout time.
    const userId: string | undefined = data.custom_data?.user_id
    const customerId = typeof data.customer_id === 'string' ? data.customer_id : undefined
    // End of the current paid period (Paddle Billing), with a sensible fallback.
    const periodEnd: string | undefined =
      (typeof data.current_billing_period?.ends_at === 'string' && data.current_billing_period.ends_at) ||
      (typeof data.next_billed_at === 'string' && data.next_billed_at) ||
      undefined

    if (userId) {
      switch (event.event_type) {
        case 'subscription.created':
        case 'subscription.activated':
        case 'transaction.completed':
          await setStatus(userId, 'pro', customerId, periodEnd)
          break
        case 'subscription.updated': {
          // While active, keep 'pro'. When not active (e.g. cancellation
          // scheduled, paused, past_due), mark 'cancelled' but keep the
          // paid-through date so access lasts until the period actually ends.
          const active = data.status === 'active'
          await setStatus(userId, active ? 'pro' : 'cancelled', customerId, periodEnd)
          break
        }
        case 'subscription.canceled':
          // Fires when the subscription truly ends. Keep periodEnd (now in the
          // past) so isSubscriptionActive resolves to false from here on.
          await setStatus(userId, 'free', customerId, periodEnd)
          break
        default:
          break
      }
    }
  } catch (e) {
    console.error('[paddle/webhook] handler error', e)
    // Still 200 so Paddle doesn't retry forever on a non-signature error.
  }

  return NextResponse.json({ received: true })
}
