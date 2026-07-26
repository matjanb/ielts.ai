import { NextRequest, NextResponse } from 'next/server'
import { getApiUser, err } from '@/lib/api/helpers'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendUpsell } from '@/lib/agent/upsell.server'

export const runtime = 'nodejs'

const FULL_MOCK = ['listening', 'reading', 'writing', 'speaking'] as const
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Records the overall band of a completed FULL mock into band_score_history.
 * Server-side because the old client-side insert was (a) duplicated on a
 * refresh of the results screen, and (b) written for partial mocks too, where
 * an average over 1-2 sections isn't an IELTS overall. Dedup key:
 * source_id = the mock's client-generated uuid.
 */
export async function POST(request: NextRequest) {
  const user = await getApiUser()
  if (!user) return err('Unauthorized', 401)

  let body: { mockId?: string; overall?: number; skills?: string[] }
  try { body = await request.json() } catch { return err('Invalid request body', 400) }

  const { mockId, overall, skills } = body
  if (typeof overall !== 'number' || !Number.isFinite(overall) || overall < 0 || overall > 9) {
    return err('overall must be a band between 0 and 9', 400)
  }
  // Old clients could fall back to a non-uuid mock id — nothing to dedup on,
  // so skip persisting rather than risk duplicate rows.
  if (typeof mockId !== 'string' || !UUID_RE.test(mockId)) {
    return NextResponse.json({ persisted: false, reason: 'no valid mock id' })
  }
  const full = Array.isArray(skills) && FULL_MOCK.every(s => skills.includes(s))
  if (!full) return NextResponse.json({ persisted: false, reason: 'partial mock' })

  const admin = createAdminClient()

  const { data: existing, error: exErr } = await admin
    .from('band_score_history')
    .select('id')
    .eq('user_id', user.id)
    .eq('skill', 'overall')
    .eq('source_id', mockId)
    .limit(1)
  if (exErr) return err('Failed to record overall band', 500)
  if (existing?.length) return NextResponse.json({ persisted: false, reason: 'already recorded' })

  const { error } = await admin.from('band_score_history').insert({
    user_id: user.id,
    skill: 'overall',
    score: Math.round(overall * 2) / 2,
    source: 'mock_test',
    source_id: mockId,
  })
  if (error) {
    console.error('[mock/overall]', error)
    return err('Failed to record overall band', 500)
  }

  // Full mock just finished — the highest-intent moment a free user has.
  // sendUpsell no-ops for subscribers/unlinked/cooldown; never blocks the result.
  try {
    await sendUpsell(admin, {
      userId: user.id,
      kind: 'mock',
      band: (Math.round(overall * 2) / 2).toFixed(1),
    })
  } catch (e) {
    console.error('[mock/overall] upsell:', e)
  }

  return NextResponse.json({ persisted: true })
}
