import { NextResponse } from 'next/server'
import { getApiUser } from '@/lib/api/helpers'
import { attributeReferral } from '@/lib/services/referral.server'

export const runtime = 'nodejs'

// Attribute the signed-in user to the ref_code cookie, if any. Called right after
// signup on the email-without-confirmation path (which skips /auth/callback).
export async function POST() {
  const user = await getApiUser()
  if (!user) return NextResponse.json({ ok: false }, { status: 401 })
  await attributeReferral(user.id)
  return NextResponse.json({ ok: true })
}
