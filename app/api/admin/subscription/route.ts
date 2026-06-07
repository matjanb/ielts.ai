import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/api/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { err } from '@/lib/api/helpers'
import type { Database } from '@/lib/types/database'

export const runtime = 'nodejs'

const DAY_MS = 24 * 60 * 60 * 1000
const PERIOD_DAYS: Record<string, number> = { month: 30, '3months': 90, year: 365 }

type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export async function POST(request: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return err('Forbidden', 403)

  let body: { userId?: string; period?: string }
  try {
    body = await request.json()
  } catch {
    return err('Invalid request body', 400)
  }

  const { userId, period } = body
  if (!userId || !period) return err('userId and period are required', 400)

  const now = new Date().toISOString()
  const patch: ProfileUpdate = { updated_at: now, subscription_source: 'admin' }

  if (period === 'forever') {
    // Permanent access: the explicit lifetime flag is the ONLY thing that grants
    // forever (see lib/subscription.ts). No expiry date needed.
    patch.subscription_status = 'pro'
    patch.lifetime_access = true
    patch.subscription_expires_at = null
    patch.subscription_plan = 'admin'
  } else if (period === 'revoke') {
    patch.subscription_status = 'free'
    patch.lifetime_access = false
    patch.subscription_expires_at = null
    patch.subscription_plan = null
    patch.subscription_source = null
  } else if (period in PERIOD_DAYS) {
    // Time-limited: access runs via subscription_expires_at and lapses when it
    // passes. lifetime stays off so it can't grant forever.
    patch.subscription_status = 'free'
    patch.lifetime_access = false
    patch.subscription_expires_at = new Date(Date.now() + PERIOD_DAYS[period] * DAY_MS).toISOString()
    patch.subscription_plan = 'admin'
  } else {
    return err('period must be one of: month, 3months, year, forever, revoke', 400)
  }

  const db = createAdminClient()
  const { error } = await db.from('profiles').update(patch).eq('id', userId)
  if (error) {
    console.error('[admin/subscription]', error)
    return err('Update failed', 500)
  }
  return NextResponse.json({ ok: true, expires_at: patch.subscription_expires_at ?? null })
}
