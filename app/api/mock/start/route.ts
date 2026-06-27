import { NextResponse } from 'next/server'
import { getApiUser, hasActiveSubscription, err } from '@/lib/api/helpers'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

// Claim the single free mock. Subscribers pass through untouched. For a free
// user this flips profiles.free_mock_used with a CONDITIONAL update
// (… WHERE free_mock_used = false) so it's atomic — two tabs racing can't both
// be granted: exactly one UPDATE affects a row, the other affects none.
export async function POST() {
  const user = await getApiUser()
  if (!user) return err('Unauthorized', 401)

  if (await hasActiveSubscription(user.id)) return NextResponse.json({ ok: true })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('profiles')
    .update({ free_mock_used: true, free_mock_started_at: new Date().toISOString() })
    .eq('id', user.id)
    .eq('free_mock_used', false)
    .select('id')

  if (error) {
    console.error('[mock/start]', error)
    return err('Could not start mock. Please try again.', 500)
  }
  // Zero rows affected → the flag was already true → free mock already used.
  if (!data || data.length === 0) return err('Free mock already used', 403)

  return NextResponse.json({ ok: true })
}
