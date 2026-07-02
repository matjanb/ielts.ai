import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'
import { hasActiveSubscription } from '@/lib/api/helpers'
import { sendTelegramMessage } from '@/lib/telegram/api'
import { tgTexts } from '@/lib/telegram/texts'

type Db = SupabaseClient<Database>

const SITE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ielts.camp'

/**
 * Single exit point for coach messages. Always writes the in-app row; then, if
 * the user linked Telegram, re-checks the subscription RIGHT BEFORE sending
 * (paywall check #2 — linking-time was #1): a lapsed subscriber gets exactly
 * one farewell upsell, then silence until they renew. Renewal resumes
 * delivery automatically — telegram_chat_id is kept, nothing to re-link.
 */
export async function sendAgentMessage(
  db: Db,
  opts: {
    userId: string
    signalType: string
    content: string
    resourceUrl?: string | null
    language?: string | null
  },
): Promise<void> {
  const { error } = await db.from('agent_messages').insert({
    user_id: opts.userId,
    signal_type: opts.signalType,
    channel: 'in-app',
    content: opts.content,
    resource_url: opts.resourceUrl ?? null,
  })
  if (error) throw new Error(`sendAgentMessage: in-app insert failed: ${error.message}`)

  const { data: link } = await db
    .from('telegram_links')
    .select('telegram_chat_id, paused_at')
    .eq('user_id', opts.userId)
    .maybeSingle()
  if (!link?.telegram_chat_id) return

  const t = tgTexts(opts.language)

  if (!(await hasActiveSubscription(opts.userId))) {
    if (!link.paused_at) {
      await sendTelegramMessage(link.telegram_chat_id, t.farewell, [
        [{ text: t.btnRenew, url: `${SITE}/subscription` }],
      ])
      await db.from('telegram_links').update({ paused_at: new Date().toISOString() })
        .eq('user_id', opts.userId)
    }
    return
  }
  if (link.paused_at) {
    await db.from('telegram_links').update({ paused_at: null }).eq('user_id', opts.userId)
  }

  const drillUrl = opts.resourceUrl
    ? (opts.resourceUrl.startsWith('/') ? `${SITE}${opts.resourceUrl}` : opts.resourceUrl)
    : null
  const keyboard = [
    [
      ...(drillUrl ? [{ text: t.btnDrill, url: drillUrl }] : []),
      { text: t.btnProgress, callback_data: 'progress' },
    ],
    [{ text: t.btnSnooze, callback_data: 'snooze' }],
  ]

  const messageId = await sendTelegramMessage(link.telegram_chat_id, opts.content, keyboard)
  if (messageId !== null) {
    await db.from('agent_messages').insert({
      user_id: opts.userId,
      signal_type: opts.signalType,
      channel: 'telegram',
      content: opts.content,
      resource_url: opts.resourceUrl ?? null,
      telegram_message_id: messageId,
    })
  }
}
