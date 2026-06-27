import { NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/api/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { err } from '@/lib/api/helpers'

export const runtime = 'nodejs'

// Funnel for the admin panel: last 30 days, grouped by utm_source. Counts
// distinct actors (anon_id, or user_id) per step + the headline conversions.
export async function GET() {
  const admin = await getAdminUser()
  if (!admin) return err('Forbidden', 403)

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await createAdminClient()
    .from('funnel_events')
    .select('event, utm_source, anon_id, user_id')
    .gte('created_at', since)
    .limit(100000)

  if (error) {
    console.error('[admin/funnel]', error)
    return err('Failed to load funnel', 500)
  }

  // source -> event -> set of distinct actors
  const bySource = new Map<string, Map<string, Set<string>>>()
  for (const row of data ?? []) {
    const source = row.utm_source || 'direct'
    const actor = row.anon_id || row.user_id
    if (!actor) continue
    if (!bySource.has(source)) bySource.set(source, new Map())
    const m = bySource.get(source)!
    if (!m.has(row.event)) m.set(row.event, new Set())
    m.get(row.event)!.add(actor)
  }

  const pct = (a: number, b: number) => (b > 0 ? Math.round((1000 * a) / b) / 10 : null)
  const rows = [...bySource.entries()].map(([source, m]) => {
    const c = (e: string) => m.get(e)?.size ?? 0
    return {
      source,
      landing: c('landing_viewed'),
      signups: c('signup_completed'),
      mockStarted: c('mock_test_started'),
      paywall: c('paywall_viewed'),
      checkout: c('checkout_started'),
      purchases: c('purchase_completed'),
      signupToPaywallPct: pct(c('paywall_viewed'), c('signup_completed')),
      paywallToPurchasePct: pct(c('purchase_completed'), c('paywall_viewed')),
    }
  }).sort((a, b) => b.signups - a.signups || b.landing - a.landing)

  return NextResponse.json({ rows })
}
