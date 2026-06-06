/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { verifyPaddleSignature } from '@/lib/paddle/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

  async function setStatus(userId: string, status: 'pro' | 'free' | 'cancelled', customerId?: string) {
    const patch: any = { subscription_status: status, updated_at: new Date().toISOString() }
    if (customerId) patch.paddle_customer_id = customerId
    await (admin.from('profiles') as any).update(patch).eq('id', userId)
  }

  try {
    const data = event?.data ?? {}
    // user_id is attached as custom data at checkout time.
    const userId: string | undefined = data.custom_data?.user_id
    const customerId = typeof data.customer_id === 'string' ? data.customer_id : undefined

    if (userId) {
      switch (event.event_type) {
        case 'subscription.created':
        case 'subscription.activated':
        case 'transaction.completed':
          await setStatus(userId, 'pro', customerId)
          break
        case 'subscription.updated': {
          // No free trial — only a genuinely active (paid) subscription grants access.
          const active = data.status === 'active'
          await setStatus(userId, active ? 'pro' : 'cancelled', customerId)
          break
        }
        case 'subscription.canceled':
          await setStatus(userId, 'free', customerId)
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
