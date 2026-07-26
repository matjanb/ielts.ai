import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'
import { hasActiveSubscription } from '@/lib/api/helpers'
import { sendTelegramMessage } from '@/lib/telegram/api'
import { tgUpsells } from '@/lib/telegram/texts'

type Db = SupabaseClient<Database>

const SITE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ielts.camp'

// One nudge per 72h across ALL kinds, and a lifetime cap so churned users
// aren't nagged forever. Event triggers (mock finished, checks exhausted)
// share the same budget as the inactivity cron.
const COOLDOWN_HOURS = 72
const LIFETIME_CAP = 10

export type UpsellKind = 'mock' | 'checker_limit' | 'inactive'

/**
 * Hard-sell nudge to a FREE user's linked Telegram. Templates only, no AI.
 * No-ops (returns false) when the user isn't linked, is subscribed, is inside
 * the cooldown, or has hit the lifetime cap — callers fire and forget.
 */
export async function sendUpsell(
  db: Db,
  opts: { userId: string; kind: UpsellKind; band?: string },
): Promise<boolean> {
  const { data: link } = await db
    .from('telegram_links')
    .select('telegram_chat_id')
    .eq('user_id', opts.userId)
    .maybeSingle()
  if (!link?.telegram_chat_id) return false

  if (await hasActiveSubscription(opts.userId)) return false

  const since = new Date(Date.now() - COOLDOWN_HOURS * 3_600_000).toISOString()
  const [recentRes, totalRes] = await Promise.all([
    db.from('agent_messages')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', opts.userId)
      .eq('signal_type', 'upsell')
      .gte('sent_at', since),
    db.from('agent_messages')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', opts.userId)
      .eq('signal_type', 'upsell'),
  ])
  // Fail-closed: a count error must not turn into spam.
  if (recentRes.error || totalRes.error) return false
  if ((recentRes.count ?? 0) > 0 || (totalRes.count ?? 0) >= LIFETIME_CAP) return false

  const { data: profile } = await db
    .from('profiles')
    .select('preferred_language')
    .eq('id', opts.userId)
    .maybeSingle()
  const u = tgUpsells(profile?.preferred_language)

  const content =
    opts.kind === 'mock' ? u.mock(opts.band ?? '—') :
    opts.kind === 'checker_limit' ? u.checkerLimit :
    u.inactive

  const messageId = await sendTelegramMessage(link.telegram_chat_id, content, [
    [{ text: u.btnUpgrade, url: `${SITE}/subscription` }],
  ])
  if (messageId === null) return false

  await db.from('agent_messages').insert({
    user_id: opts.userId,
    signal_type: 'upsell',
    channel: 'telegram',
    content,
    telegram_message_id: messageId,
  })
  return true
}
