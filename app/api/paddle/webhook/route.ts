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
          const active = data.status === 'active' || data.status === 'trialing'
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
