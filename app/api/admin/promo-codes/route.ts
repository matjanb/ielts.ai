import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/api/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { err } from '@/lib/api/helpers'

export const runtime = 'nodejs'

// Coerce optional numeric fields ("", null, "30") to a clean int or null.
function toIntOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? Math.trunc(n) : null
}

// List every promo code with its redemption count.
export async function GET() {
  const admin = await getAdminUser()
  if (!admin) return err('Forbidden', 403)

  const db = createAdminClient()
  const { data, error } = await db
    .from('promo_codes')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) {
    console.error('[admin/promo-codes]', error)
    return err('Failed to load promo codes', 500)
  }
  return NextResponse.json({ codes: data ?? [] })
}

// Create a promo code that maps a friendly handle to a Paddle discount id.
export async function POST(request: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return err('Forbidden', 403)

  let body: {
    code?: string
    discountId?: string
    description?: string
    percentOff?: number | string | null
    expiresAt?: string | null
    maxRedemptions?: number | string | null
  }
  try {
    body = await request.json()
  } catch {
    return err('Invalid request body', 400)
  }

  const code = (body.code ?? '').trim().toUpperCase()
  const discountId = (body.discountId ?? '').trim()
  if (!/^[A-Z0-9_-]{2,40}$/.test(code)) {
    return err('Code must be 2–40 chars: letters, numbers, "-" or "_".', 400)
  }
  if (!discountId) return err('Paddle discount ID is required.', 400)

  const db = createAdminClient()
  const { error } = await db.from('promo_codes').insert({
    code,
    paddle_discount_id: discountId,
    description: (body.description ?? '').trim() || null,
    percent_off: toIntOrNull(body.percentOff),
    expires_at: body.expiresAt ? new Date(body.expiresAt).toISOString() : null,
    max_redemptions: toIntOrNull(body.maxRedemptions),
  })
  if (error) {
    if (error.code === '23505') return err('That code already exists.', 409)
    console.error('[admin/promo-codes] insert', error)
    return err('Failed to create promo code', 500)
  }
  return NextResponse.json({ ok: true, code })
}

// Toggle a code active/inactive without deleting it (preserves its stats).
export async function PATCH(request: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return err('Forbidden', 403)

  let body: { code?: string; isActive?: boolean }
  try {
    body = await request.json()
  } catch {
    return err('Invalid request body', 400)
  }

  const code = (body.code ?? '').trim().toUpperCase()
  if (!code || typeof body.isActive !== 'boolean') {
    return err('code and isActive are required', 400)
  }

  const db = createAdminClient()
  const { data, error } = await db
    .from('promo_codes')
    .update({ is_active: body.isActive })
    .eq('code', code)
    .select('code')
  if (error) {
    console.error('[admin/promo-codes] patch', error)
    return err('Failed to update promo code', 500)
  }
  if (!data || data.length === 0) return err('Promo code not found', 404)
  return NextResponse.json({ ok: true })
}

// Permanently delete a promo code. Past redemptions keep their log rows.
export async function DELETE(request: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return err('Forbidden', 403)

  let body: { code?: string }
  try {
    body = await request.json()
  } catch {
    return err('Invalid request body', 400)
  }

  const code = (body.code ?? '').trim().toUpperCase()
  if (!code) return err('Code is required', 400)

  const db = createAdminClient()
  const { data, error } = await db.from('promo_codes').delete().eq('code', code).select('code')
  if (error) {
    console.error('[admin/promo-codes] delete', error)
    return err('Failed to delete promo code', 500)
  }
  if (!data || data.length === 0) return err('Promo code not found', 404)
  return NextResponse.json({ ok: true })
}
