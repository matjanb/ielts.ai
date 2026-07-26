import { NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/api/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { err } from '@/lib/api/helpers'

export const runtime = 'nodejs'

// Telegram bot analytics for the admin panel: link totals, onboarding-step
// conversion (last 30 days) and upsell delivery volume.
export async function GET() {
  const admin = await getAdminUser()
  if (!admin) return err('Forbidden', 403)

  const db = createAdminClient()
  const now = Date.now()
  const since7 = new Date(now - 7 * 86_400_000).toISOString()
  const since30 = new Date(now - 30 * 86_400_000).toISOString()

  const [linksRes, tgEventsRes, upsellsRes] = await Promise.all([
    db.from('telegram_links')
      .select('user_id, linked_at, telegram_chat_id')
      .not('telegram_chat_id', 'is', null)
      .order('linked_at', { ascending: false })
      .limit(1000),
    db.from('funnel_events')
      .select('event, user_id, anon_id')
      .in('event', ['onboarding_tg_viewed', 'onboarding_tg_connected', 'onboarding_tg_skipped'])
      .gte('created_at', since30)
      .limit(50000),
    db.from('agent_messages')
      .select('user_id, sent_at')
      .eq('signal_type', 'upsell')
      .limit(50000),
  ])
  if (linksRes.error || tgEventsRes.error || upsellsRes.error) {
    console.error('[admin/telegram]', linksRes.error ?? tgEventsRes.error ?? upsellsRes.error)
    return err('Failed to load telegram analytics', 500)
  }

  const links = linksRes.data ?? []

  // Plan + name for the most recent links (the table below the tiles).
  const recentLinks = links.slice(0, 20)
  const { data: profiles } = recentLinks.length
    ? await db.from('profiles')
        .select('id, full_name, has_paid, lifetime_access, subscription_expires_at')
        .in('id', recentLinks.map(l => l.user_id))
    : { data: [] }
  const profileById = new Map((profiles ?? []).map(p => [p.id, p]))

  const upsells = upsellsRes.data ?? []
  const upsellsByUser = new Map<string, number>()
  for (const u of upsells) upsellsByUser.set(u.user_id, (upsellsByUser.get(u.user_id) ?? 0) + 1)

  const uniq = (event: string) => {
    const s = new Set<string>()
    for (const row of tgEventsRes.data ?? []) {
      const actor = row.user_id || row.anon_id
      if (row.event === event && actor) s.add(actor)
    }
    return s.size
  }
  const viewed = uniq('onboarding_tg_viewed')
  const connected = uniq('onboarding_tg_connected')

  return NextResponse.json({
    totals: {
      linked: links.length,
      linked7d: links.filter(l => l.linked_at && l.linked_at >= since7).length,
      linked30d: links.filter(l => l.linked_at && l.linked_at >= since30).length,
      upsellsSent: upsells.length,
      upsellsSent7d: upsells.filter(u => u.sent_at >= since7).length,
      upsellUsers: upsellsByUser.size,
    },
    onboarding: {
      viewed,
      connected,
      skipped: uniq('onboarding_tg_skipped'),
      connectRatePct: viewed > 0 ? Math.round((1000 * connected) / viewed) / 10 : null,
    },
    recent: recentLinks.map(l => {
      const p = profileById.get(l.user_id)
      const pro = !!(p?.lifetime_access || (p?.subscription_expires_at && p.subscription_expires_at > new Date().toISOString()))
      return {
        userId: l.user_id,
        name: p?.full_name ?? '—',
        linkedAt: l.linked_at,
        plan: pro ? 'pro' : 'free',
        upsells: upsellsByUser.get(l.user_id) ?? 0,
      }
    }),
  })
}
