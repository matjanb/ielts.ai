import { NextRequest, NextResponse } from 'next/server'
import { getApiUser, err } from '@/lib/api/helpers'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

// Validate a promo code typed on the subscription page. Returns the Paddle
// discount id to hand to the overlay checkout (Paddle then enforces the real
// price cut). Runs with the service role so the locked-down promo_codes table is
// readable; gating (active / expiry / cap) lives here, not in the client.
export async function POST(request: NextRequest) {
  const user = await getApiUser()
  if (!user) return err('Unauthorized', 401)

  let body: { code?: string }
  try {
    body = await request.json()
  } catch {
    return err('Invalid request body', 400)
  }

  const code = (body.code ?? '').trim().toUpperCase()
  if (!code) return err('Enter a promo code.', 400)

  const db = createAdminClient()
  const { data: promo } = await db
    .from('promo_codes')
    .select('code, paddle_discount_id, description, percent_off, is_active, expires_at, max_redemptions, redemption_count')
    .eq('code', code)
    .maybeSingle()

  if (!promo || !promo.is_active) return err('This promo code is not valid.', 404)
  if (promo.expires_at && new Date(promo.expires_at).getTime() < Date.now()) {
    return err('This promo code has expired.', 410)
  }
  if (promo.max_redemptions != null && promo.redemption_count >= promo.max_redemptions) {
    return err('This promo code has reached its limit.', 410)
  }

  return NextResponse.json({
    code: promo.code,
    discountId: promo.paddle_discount_id,
    percentOff: promo.percent_off,
    description: promo.description,
  })
}
