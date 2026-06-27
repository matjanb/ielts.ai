import { NextResponse } from 'next/server'
import { getApiUser } from '@/lib/api/helpers'
import { attributeReferral } from '@/lib/services/referral.server'
import { attributeUtm } from '@/lib/analytics/track.server'

export const runtime = 'nodejs'

// Attribute the signed-in user to the ref_code + UTM cookies, if any. Called right
// after signup on the email-without-confirmation path (which skips /auth/callback).
// attributeUtm also emits signup_completed once, on first attribution.
export async function POST() {
  const user = await getApiUser()
  if (!user) return NextResponse.json({ ok: false }, { status: 401 })
  await attributeReferral(user.id)
  await attributeUtm(user.id)
  return NextResponse.json({ ok: true })
}
