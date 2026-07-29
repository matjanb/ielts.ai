import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'
import { isSubscriptionActive } from '@/lib/subscription'
import { sendTelegramMessage } from './api'

type Db = SupabaseClient<Database>

export type BroadcastAudience = 'all' | 'free' | 'pro'

type Recipient = { userId: string; chatId: number; pro: boolean }

/** Every linked chat with its plan, so drafts can show audience counts. */
export async function linkedRecipients(db: Db): Promise<Recipient[]> {
  const { data: links } = await db
    .from('telegram_links')
    .select('user_id, telegram_chat_id')
    .not('telegram_chat_id', 'is', null)
  if (!links?.length) return []

  const { data: profiles } = await db
    .from('profiles')
    .select('id, lifetime_access, subscription_expires_at')
    .in('id', links.map(l => l.user_id))
  const proById = new Map((profiles ?? []).map(p => [p.id, isSubscriptionActive(p)]))

  return links.map(l => ({
    userId: l.user_id,
    chatId: l.telegram_chat_id!,
    pro: proById.get(l.user_id) ?? false,
  }))
}

export function filterAudience(recipients: Recipient[], audience: BroadcastAudience): Recipient[] {
  if (audience === 'free') return recipients.filter(r => !r.pro)
  if (audience === 'pro') return recipients.filter(r => r.pro)
  return recipients
}

/**
 * Sends a confirmed broadcast to its audience, sequentially with a small
 * delay (Telegram allows ~30 msg/s) and a wall-clock budget so the webhook
 * function never exceeds its platform limit. Each delivery is logged to
 * agent_messages (signal_type 'broadcast') so emoji reactions map back and
 * the reply-window check has something to look at.
 */
export async function runBroadcast(
  db: Db,
  opts: { broadcastId: string; content: string; recipients: Recipient[]; excludeChatId?: number },
): Promise<{ sent: number; failed: number }> {
  const started = Date.now()
  const BUDGET_MS = 270_000
  const targets = opts.recipients.filter(r => r.chatId !== opts.excludeChatId)

  let sent = 0
  let failed = 0
  const rows: Database['public']['Tables']['agent_messages']['Insert'][] = []

  for (const r of targets) {
    if (Date.now() - started > BUDGET_MS) {
      failed += targets.length - sent - failed
      break
    }
    const messageId = await sendTelegramMessage(r.chatId, opts.content)
    if (messageId === null) {
      failed++
    } else {
      sent++
      rows.push({
        user_id: r.userId,
        signal_type: 'broadcast',
        channel: 'telegram',
        content: opts.content,
        telegram_message_id: messageId,
      })
    }
    await new Promise(resolve => setTimeout(resolve, 50))
  }

  if (rows.length) {
    const { error } = await db.from('agent_messages').insert(rows)
    if (error) console.error('[broadcast] agent_messages insert failed:', error.message)
  }
  await db.from('telegram_broadcasts').update({
    status: 'sent',
    sent_at: new Date().toISOString(),
    sent_count: sent,
    failed_count: failed,
  }).eq('id', opts.broadcastId)

  return { sent, failed }
}

/** True if this user got a broadcast in the last 7 days — their free-text is
 *  then treated as an answer (relayed to admins) rather than idle chatter. */
export async function hasRecentBroadcast(db: Db, userId: string): Promise<boolean> {
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString()
  const { count, error } = await db
    .from('agent_messages')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('signal_type', 'broadcast')
    .gte('sent_at', since)
  return !error && (count ?? 0) > 0
}

/** Linked chats of every is_admin profile — where user replies get relayed. */
export async function adminChatIds(db: Db): Promise<number[]> {
  const { data: admins } = await db.from('profiles').select('id').eq('is_admin', true)
  if (!admins?.length) return []
  const { data: links } = await db
    .from('telegram_links')
    .select('telegram_chat_id')
    .in('user_id', admins.map(a => a.id))
    .not('telegram_chat_id', 'is', null)
  return (links ?? []).map(l => l.telegram_chat_id!)
}
