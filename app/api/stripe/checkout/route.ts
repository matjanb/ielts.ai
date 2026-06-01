import { NextRequest, NextResponse } from 'next/server'
import { getApiUser, err } from '@/lib/api/helpers'
import { getStripe, priceIdForPlan } from '@/lib/stripe/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const user = await getApiUser()
  if (!user) return err('Unauthorized', 401)

  const stripe = getStripe()
  if (!stripe) return err('Payments are not configured yet. Add STRIPE_SECRET_KEY.', 503)

  let body: { plan?: string }
  try { body = await request.json() } catch { return err('Invalid request body', 400) }

  const plan = body.plan ?? ''
  const priceId = priceIdForPlan(plan)
  if (!priceId) return err('Unknown or unconfigured plan.', 400)

  const origin =
    request.headers.get('origin') ??
    process.env.NEXT_PUBLIC_APP_URL ??
    'https://ielts.camp'

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard?checkout=success`,
      cancel_url: `${origin}/subscription?checkout=cancelled`,
      client_reference_id: user.id,
      customer_email: user.email ?? undefined,
      allow_promotion_codes: true,
      metadata: { user_id: user.id, plan },
      // Propagate the user id onto the Subscription so webhooks can resolve it.
      subscription_data: { metadata: { user_id: user.id, plan } },
    })
    return NextResponse.json({ url: session.url })
  } catch (e) {
    console.error('[stripe/checkout]', e)
    return err('Could not start checkout. Please try again.', 500)
  }
}
