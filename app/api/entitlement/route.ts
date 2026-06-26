import { NextResponse } from 'next/server'
import { getApiUser, getEntitlement, err } from '@/lib/api/helpers'

export const runtime = 'nodejs'

// Lets the client tailor the UI to the user's billing state (free-mock banner,
// nav lock badges, plan label) without leaking how the paywall is enforced.
export async function GET() {
  const user = await getApiUser()
  if (!user) return err('Unauthorized', 401)
  return NextResponse.json(await getEntitlement(user.id))
}
