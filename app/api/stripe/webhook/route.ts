/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const stripe = getStripe()
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!stripe || !secret) return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })

  const sig = request.headers.get('stripe-signature')
  if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

  const raw = await request.text() // raw body is required for signature verification
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret)
  } catch (e) {
    console.error('[stripe/webhook] signature verification failed', e)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const admin = createAdminClient()
  async function setStatus(userId: string, status: 'pro' | 'free' | 'cancelled', customerId?: string) {
    const patch: any = { subscription_status: status, updated_at: new Date().toISOString() }
    if (customerId) patch.stripe_customer_id = customerId
    await (admin.from('profiles') as any).update(patch).eq('id', userId)
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object as Stripe.Checkout.Session
        const userId = s.metadata?.user_id || s.client_reference_id || undefined
        const customerId = typeof s.customer === 'string' ? s.customer : undefined
        if (userId) await setStatus(userId, 'pro', customerId)
        break
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.user_id
        const active = sub.status === 'active' || sub.status === 'trialing'
        if (userId) await setStatus(userId, active ? 'pro' : 'cancelled')
        break
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.user_id
        if (userId) await setStatus(userId, 'free')
        break
      }
      default:
        break
    }
  } catch (e) {
    console.error('[stripe/webhook] handler error', e)
    // Still 200 so Stripe doesn't retry forever on a non-signature error.
  }

  return NextResponse.json({ received: true })
}
