import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/api/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { err } from '@/lib/api/helpers'

export const runtime = 'nodejs'

const YEAR_MS = 365 * 24 * 60 * 60 * 1000

export async function POST(request: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return err('Forbidden', 403)

  let body: { userId?: string; status?: string }
  try {
    body = await request.json()
  } catch {
    return err('Invalid request body', 400)
  }

  const { userId, status } = body
  if (!userId || (status !== 'pro' && status !== 'free')) {
    return err('userId and status (pro|free) are required', 400)
  }

  const db = createAdminClient()
  // Grant → a year of access; revoke → clear the paid period immediately.
  const patch = status === 'pro'
    ? {
        subscription_status: 'pro' as const,
        subscription_expires_at: new Date(Date.now() + YEAR_MS).toISOString(),
        updated_at: new Date().toISOString(),
      }
    : {
        subscription_status: 'free' as const,
        subscription_expires_at: null,
        updated_at: new Date().toISOString(),
      }

  const { error } = await db.from('profiles').update(patch).eq('id', userId)
  if (error) {
    console.error('[admin/subscription]', error)
    return err('Update failed', 500)
  }
  return NextResponse.json({ ok: true })
}
