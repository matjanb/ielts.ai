import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/api/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { err } from '@/lib/api/helpers'

export const runtime = 'nodejs'

// Without ?code → every referral code with its funnel (signups + paid).
// With ?code=<code> → the actual people that code brought in (email + paid).
export async function GET(request: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return err('Forbidden', 403)

  const db = createAdminClient()
  const code = request.nextUrl.searchParams.get('code')?.trim().toLowerCase()

  if (code) {
    const { data, error } = await db.rpc('admin_referral_users', { ref_code: code })
    if (error) {
      console.error('[admin/referrals] users', error)
      return err('Failed to load referred users', 500)
    }
    return NextResponse.json({ users: data ?? [] })
  }

  const { data, error } = await db.rpc('admin_referral_stats', {})
  if (error) {
    console.error('[admin/referrals]', error)
    return err('Failed to load referrals', 500)
  }
  return NextResponse.json({ referrers: data ?? [] })
}

// Create a new referral code (creator handle).
export async function POST(request: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return err('Forbidden', 403)

  let body: { code?: string; name?: string }
  try {
    body = await request.json()
  } catch {
    return err('Invalid request body', 400)
  }

  const code = (body.code ?? '').trim().toLowerCase()
  const name = (body.name ?? '').trim() || null
  if (!/^[a-z0-9_-]{2,40}$/.test(code)) {
    return err('Code must be 2–40 chars: letters, numbers, "-" or "_".', 400)
  }

  const db = createAdminClient()
  const { error } = await db.from('referrers').insert({ code, name })
  if (error) {
    if (error.code === '23505') return err('That code is already taken.', 409)
    console.error('[admin/referrals] insert', error)
    return err('Failed to create referral code', 500)
  }
  return NextResponse.json({ ok: true, code })
}

// Deactivate a referral code (soft-delete). We never hard-delete: the funnel
// stats join `referrers` by code, so removing the row would silently drop every
// past signup from the panel even though their `referred_by` citation survives.
// Setting is_active=false stops new attributions while keeping the history visible.
export async function DELETE(request: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return err('Forbidden', 403)

  let body: { code?: string }
  try {
    body = await request.json()
  } catch {
    return err('Invalid request body', 400)
  }

  const code = (body.code ?? '').trim().toLowerCase()
  if (!code) return err('Code is required', 400)

  const db = createAdminClient()
  const { data, error } = await db
    .from('referrers').update({ is_active: false }).eq('code', code).select('code')
  if (error) {
    console.error('[admin/referrals] deactivate', error)
    return err('Failed to deactivate referral code', 500)
  }
  if (!data || data.length === 0) return err('Referral code not found', 404)
  return NextResponse.json({ ok: true, code })
}

// Toggle a referral code's active state (reactivate a soft-deleted code, or
// pause one). Only attributions to is_active codes are credited at signup.
export async function PATCH(request: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return err('Forbidden', 403)

  let body: { code?: string; is_active?: boolean }
  try {
    body = await request.json()
  } catch {
    return err('Invalid request body', 400)
  }

  const code = (body.code ?? '').trim().toLowerCase()
  if (!code) return err('Code is required', 400)
  if (typeof body.is_active !== 'boolean') return err('is_active must be a boolean', 400)

  const db = createAdminClient()
  const { data, error } = await db
    .from('referrers').update({ is_active: body.is_active }).eq('code', code).select('code')
  if (error) {
    console.error('[admin/referrals] toggle', error)
    return err('Failed to update referral code', 500)
  }
  if (!data || data.length === 0) return err('Referral code not found', 404)
  return NextResponse.json({ ok: true, code, is_active: body.is_active })
}
