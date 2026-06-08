/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { verifyPaddleSignature } from '@/lib/paddle/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/lib/types/database'

export const runtime = 'nodejs'

const DAY_MS = 24 * 60 * 60 * 1000

// Plan id -> nominal length, used only as a fallback when Paddle doesn't send a
// period end (e.g. a one-time charge). 31 days is the safe default for an
// unrecognised plan: access still lapses instead of lasting forever.
const PLAN_DAYS: Record<string, number> = { '1mo': 30, '3mo': 90, '12mo': 365 }
const FALLBACK_DAYS = 31

/** Reverse map: Paddle Price ID -> our plan id ('1mo' | '3mo' | '12mo'). */
function priceIdToPlan(priceId?: string): string | undefined {
  if (!priceId) return undefined
  if (priceId === process.env.NEXT_PUBLIC_PADDLE_PRICE_1MO) return '1mo'
  if (priceId === process.env.NEXT_PUBLIC_PADDLE_PRICE_3MO) return '3mo'
  if (priceId === process.env.NEXT_PUBLIC_PADDLE_PRICE_12MO) return '12mo'
  return undefined
}

/** Pull the purchased plan id out of an event's line items, if recognisable. */
function planFromEvent(data: any): string | undefined {
  const items: any[] = Array.isArray(data?.items) ? data.items : []
  for (const it of items) {
    const plan = priceIdToPlan(it?.price?.id ?? it?.price_id)
    if (plan) return plan
  }
  return undefined
}

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

  // Apply a profile change. `expiresAt` is written verbatim when provided
  // (undefined leaves the existing date untouched). Access is decided by
  // lib/subscription.ts from lifetime_access + subscription_expires_at, never
  // from subscription_status alone — so every paid grant MUST carry a date.
  async function setStatus(
    userId: string,
    status: 'pro' | 'free' | 'cancelled',
    opts: { customerId?: string; expiresAt?: string; plan?: string; source?: 'paddle'; paid?: boolean } = {},
  ) {
    const patch: Database['public']['Tables']['profiles']['Update'] = {
      subscription_status: status,
      // Paddle is never a lifetime grant — only the admin "forever" sets this.
      lifetime_access: false,
      updated_at: new Date().toISOString(),
    }
    // A real payment marks the account as having paid at least once (for referral
    // conversion counts). We only ever set it true — it never gets cleared.
    if (opts.paid) patch.has_paid = true
    // NOTE: the live DB column is still named `stripe_customer_id` (the Paddle
    // rename migration 012 was never applied). We store the Paddle customer id
    // here so the whole update doesn't fail on an unknown column. Apply
    // migration 012 to rename it to paddle_customer_id, then update this line.
    if (opts.customerId) patch.stripe_customer_id = opts.customerId
    if (opts.expiresAt) patch.subscription_expires_at = opts.expiresAt
    if (opts.plan) patch.subscription_plan = opts.plan
    if (opts.source) patch.subscription_source = opts.source
    await admin.from('profiles').update(patch).eq('id', userId)
  }

  try {
    const data = event?.data ?? {}
    // user_id is attached as custom data at checkout time.
    const userId: string | undefined = data.custom_data?.user_id
    const customerId = typeof data.customer_id === 'string' ? data.customer_id : undefined
    const plan = planFromEvent(data)
    // End of the current paid period as reported by Paddle (the authoritative
    // date for an active subscription).
    const paddlePeriodEnd: string | undefined =
      (typeof data.current_billing_period?.ends_at === 'string' && data.current_billing_period.ends_at) ||
      (typeof data.next_billed_at === 'string' && data.next_billed_at) ||
      undefined

    // A GRANT always needs a future paid-through date. Prefer Paddle's; if it's
    // missing (e.g. a one-time charge), fall back to the plan's nominal length so
    // access is bounded instead of permanent.
    const grantExpiry = (): string => {
      if (paddlePeriodEnd && new Date(paddlePeriodEnd).getTime() > Date.now()) return paddlePeriodEnd
      const days = (plan && PLAN_DAYS[plan]) || FALLBACK_DAYS
      if (!paddlePeriodEnd) {
        console.warn(`[paddle/webhook] no period end from Paddle; bounding access to ${days}d (plan=${plan ?? 'unknown'})`)
      }
      return new Date(Date.now() + days * DAY_MS).toISOString()
    }

    if (userId) {
      switch (event.event_type) {
        case 'subscription.created':
        case 'subscription.activated':
        case 'transaction.completed':
          await setStatus(userId, 'pro', { customerId, expiresAt: grantExpiry(), plan, source: 'paddle', paid: true })
          break
        case 'subscription.updated': {
          // While active, keep 'pro' and extend the paid-through date. When not
          // active (cancellation scheduled, paused, past_due), mark 'cancelled'
          // but keep Paddle's period end so access lasts until it actually ends.
          const active = data.status === 'active'
          if (active) {
            await setStatus(userId, 'pro', { customerId, expiresAt: grantExpiry(), plan, source: 'paddle', paid: true })
          } else {
            await setStatus(userId, 'cancelled', { customerId, expiresAt: paddlePeriodEnd, plan, source: 'paddle' })
          }
          break
        }
        case 'subscription.canceled':
          // Fires when the subscription truly ends. Use Paddle's period end (now
          // in the past); if absent, end access now. Either way it lapses.
          await setStatus(userId, 'free', {
            customerId,
            expiresAt: paddlePeriodEnd ?? new Date().toISOString(),
            plan,
            source: 'paddle',
          })
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
