import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, SkillType } from '@/lib/types/database'
import { createAdminClient } from '@/lib/supabase/admin'
import { hasActiveSubscription } from '@/lib/api/helpers'
import { sendTelegramMessage, answerCallbackQuery } from '@/lib/telegram/api'
import { tgTexts, TG_ADMIN, type TgTexts } from '@/lib/telegram/texts'
import {
  linkedRecipients, filterAudience, runBroadcast, hasRecentBroadcast, adminChatIds,
  type BroadcastAudience,
} from '@/lib/telegram/broadcast.server'

export const runtime = 'nodejs'
// A confirmed broadcast is sent inline from the callback handler; give the
// function room for a few hundred sequential sendMessage calls.
export const maxDuration = 300

type Db = SupabaseClient<Database>

// Telegram webhook. HARD RULE: incoming traffic never touches the AI — every
// reply below is a template or a code-computed figure. The only AI in the
// coach is the evening digest (outbound, 1/day).
//
// Registered with a secret_token (setWebhook), echoed back by Telegram in
// this header on every update.
export async function POST(req: NextRequest) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (!secret || req.headers.get('x-telegram-bot-api-secret-token') !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  let update: Record<string, unknown>
  try {
    update = await req.json()
  } catch {
    return NextResponse.json({ ok: true }) // malformed — ack anyway, no retries
  }

  const db = createAdminClient()
  try {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const u = update as any
    if (u.message) await handleMessage(db, u.message)
    else if (u.callback_query) await handleCallback(db, u.callback_query)
    else if (u.message_reaction) await handleReaction(db, u.message_reaction)
    /* eslint-enable @typescript-eslint/no-explicit-any */
  } catch (e) {
    console.error('[telegram/webhook]', e)
  }
  // Always 200: Telegram re-delivers on failure and we'd rather drop one
  // update than loop on a poison message.
  return NextResponse.json({ ok: true })
}

async function linkByChat(db: Db, chatId: number) {
  const { data } = await db
    .from('telegram_links')
    .select('user_id, telegram_chat_id')
    .eq('telegram_chat_id', chatId)
    .maybeSingle()
  return data ?? null
}

async function textsFor(db: Db, userId: string | null): Promise<TgTexts> {
  if (!userId) return tgTexts(null)
  const { data } = await db.from('profiles').select('preferred_language').eq('id', userId).maybeSingle()
  return tgTexts(data?.preferred_language)
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function handleMessage(db: Db, message: any): Promise<void> {
  const chatId: number | undefined = message.chat?.id
  const raw: string = typeof message.text === 'string' ? message.text : ''
  if (!chatId) return

  const existing = await linkByChat(db, chatId)

  // Extract a candidate link code: "/start CODE" or the bare code itself.
  const candidate = (raw.startsWith('/start') ? raw.split(/\s+/)[1] ?? '' : raw)
    .trim().toUpperCase()

  if (!existing) {
    if (/^[A-Z2-9]{8}$/.test(candidate)) {
      const { data: match } = await db
        .from('telegram_links')
        .select('user_id, link_code_expires_at')
        .eq('link_code', candidate)
        .maybeSingle()
      if (match && match.link_code_expires_at && new Date(match.link_code_expires_at) > new Date()) {
        await db.from('telegram_links').update({
          telegram_chat_id: chatId,
          linked_at: new Date().toISOString(),
          link_code: null,
          link_code_expires_at: null,
          paused_at: null,
        }).eq('user_id', match.user_id)
        const t = await textsFor(db, match.user_id)
        // Free accounts get the bonus/expectations welcome; the "evening
        // reviews at 20:00" promise is only true for subscribers.
        const subscribed = await hasActiveSubscription(match.user_id)
        await sendTelegramMessage(chatId, subscribed ? t.linked : t.linkedFree)
        return
      }
      await sendTelegramMessage(chatId, tgTexts(null).badCode)
      return
    }
    await sendTelegramMessage(chatId, tgTexts(null).linkPrompt)
    return
  }

  const { data: profile } = await db
    .from('profiles')
    .select('is_admin, preferred_language, full_name, lifetime_access, subscription_expires_at')
    .eq('id', existing.user_id)
    .maybeSingle()

  // Admins get a broadcast console instead of the canned replies.
  if (profile?.is_admin && raw.startsWith('/')) {
    await handleAdminCommand(db, chatId, existing.user_id, raw)
    return
  }

  const t = tgTexts(profile?.preferred_language)

  // Linked user free-texting the bot. Relay it to the admins' chats (that's
  // how broadcast answers come home), then ack: a "thanks, passed along" if
  // they were recently asked something, the usual redirect otherwise.
  if (raw && !raw.startsWith('/')) {
    const admins = await adminChatIds(db)
    const plan = hasActiveSub(profile) ? 'pro' : 'free'
    const relay = TG_ADMIN.reply(profile?.full_name || '—', plan, raw)
    for (const adminChat of admins) {
      if (adminChat !== chatId) await sendTelegramMessage(adminChat, relay)
    }
    if (await hasRecentBroadcast(db, existing.user_id)) {
      await sendTelegramMessage(chatId, t.replyAck)
      return
    }
  }
  await sendTelegramMessage(chatId, t.freeText)
}

function hasActiveSub(p: { lifetime_access: boolean | null; subscription_expires_at: string | null } | null | undefined): boolean {
  return !!(p?.lifetime_access || (p?.subscription_expires_at && p.subscription_expires_at > new Date().toISOString()))
}

async function handleAdminCommand(db: Db, chatId: number, userId: string, raw: string): Promise<void> {
  if (!raw.startsWith('/broadcast')) {
    await sendTelegramMessage(chatId, TG_ADMIN.help)
    return
  }

  const content = raw.slice('/broadcast'.length).trim()
  if (!content) {
    await sendTelegramMessage(chatId, TG_ADMIN.usage)
    return
  }

  const { data: draft, error } = await db
    .from('telegram_broadcasts')
    .insert({ created_by: userId, content })
    .select('id')
    .single()
  if (error || !draft) {
    console.error('[telegram/broadcast] draft insert failed:', error?.message)
    return
  }

  const recipients = await linkedRecipients(db)
  const free = recipients.filter(r => !r.pro).length
  await sendTelegramMessage(chatId, TG_ADMIN.preview(content), [
    [{ text: TG_ADMIN.btnAll(recipients.length), callback_data: `bc:all:${draft.id}` }],
    [
      { text: TG_ADMIN.btnFree(free), callback_data: `bc:free:${draft.id}` },
      { text: TG_ADMIN.btnPro(recipients.length - free), callback_data: `bc:pro:${draft.id}` },
    ],
    [{ text: TG_ADMIN.btnCancel, callback_data: `bc:cancel:${draft.id}` }],
  ])
}

async function handleBroadcastCallback(db: Db, cb: any, chatId: number, userId: string): Promise<void> {
  const [, action, broadcastId] = (cb.data as string).split(':')

  const { data: profile } = await db.from('profiles').select('is_admin').eq('id', userId).maybeSingle()
  if (!profile?.is_admin || !broadcastId) {
    await answerCallbackQuery(cb.id)
    return
  }

  if (action === 'cancel') {
    await db.from('telegram_broadcasts')
      .update({ status: 'cancelled' })
      .eq('id', broadcastId)
      .eq('status', 'draft')
    await answerCallbackQuery(cb.id, TG_ADMIN.cancelled)
    return
  }

  if (action !== 'all' && action !== 'free' && action !== 'pro') {
    await answerCallbackQuery(cb.id)
    return
  }

  // Claim draft → sending atomically: Telegram re-delivers unanswered
  // callbacks, and a double-tap must not send the broadcast twice.
  const { data: claimed } = await db
    .from('telegram_broadcasts')
    .update({ status: 'sending', audience: action })
    .eq('id', broadcastId)
    .eq('status', 'draft')
    .select('id, content')
    .maybeSingle()
  if (!claimed) {
    await answerCallbackQuery(cb.id, TG_ADMIN.alreadyHandled)
    return
  }

  // Answer before the long send loop so Telegram stops retrying the callback.
  await answerCallbackQuery(cb.id, TG_ADMIN.sending)

  const recipients = filterAudience(await linkedRecipients(db), action as BroadcastAudience)
  if (!recipients.length) {
    await db.from('telegram_broadcasts')
      .update({ status: 'sent', sent_at: new Date().toISOString(), sent_count: 0, failed_count: 0 })
      .eq('id', broadcastId)
    await sendTelegramMessage(chatId, TG_ADMIN.noRecipients)
    return
  }

  const { sent, failed } = await runBroadcast(db, {
    broadcastId,
    content: claimed.content,
    recipients,
    excludeChatId: chatId,
  })
  await sendTelegramMessage(chatId, TG_ADMIN.done(sent, failed))
}

async function handleCallback(db: Db, cb: any): Promise<void> {
  const chatId: number | undefined = cb.message?.chat?.id
  const data: string = typeof cb.data === 'string' ? cb.data : ''
  if (!chatId) { await answerCallbackQuery(cb.id); return }

  const link = await linkByChat(db, chatId)
  if (!link) { await answerCallbackQuery(cb.id); return }

  if (data.startsWith('bc:')) {
    await handleBroadcastCallback(db, cb, chatId, link.user_id)
    return
  }

  const t = await textsFor(db, link.user_id)

  if (data === 'snooze') {
    // Remember the snooze on the message it was pressed under.
    if (cb.message?.message_id) {
      await db.from('agent_messages')
        .update({ user_reaction: 'snooze' })
        .eq('user_id', link.user_id)
        .eq('telegram_message_id', cb.message.message_id)
    }
    await answerCallbackQuery(cb.id, t.snoozeAck)
    return
  }

  if (data === 'progress') {
    await answerCallbackQuery(cb.id)
    const summary = await progressSummary(db, link.user_id)
    await sendTelegramMessage(chatId, summary ? `${t.progressTitle}\n${summary}` : t.noData)
    return
  }

  await answerCallbackQuery(cb.id)
}

async function handleReaction(db: Db, reaction: any): Promise<void> {
  const chatId: number | undefined = reaction.chat?.id
  const messageId: number | undefined = reaction.message_id
  if (!chatId || !messageId) return
  const link = await linkByChat(db, chatId)
  if (!link) return

  const newest = Array.isArray(reaction.new_reaction) ? reaction.new_reaction[0] : null
  const emoji: string | null = newest?.type === 'emoji' ? newest.emoji : null
  // Reaction removed (empty new_reaction) → clear; otherwise store the emoji.
  await db.from('agent_messages')
    .update({ user_reaction: emoji })
    .eq('user_id', link.user_id)
    .eq('telegram_message_id', messageId)
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Latest band per module — pure DB math, no tokens. */
async function progressSummary(db: Db, userId: string): Promise<string | null> {
  const [attemptsRes, testsRes, writingRes, speakingRes] = await Promise.all([
    db.from('user_attempts')
      .select('test_id, band_score, completed_at')
      .eq('user_id', userId)
      .not('completed_at', 'is', null)
      .not('band_score', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(50),
    db.from('tests').select('id, type'),
    db.from('writing_submissions')
      .select('band_score')
      .eq('user_id', userId)
      .not('band_score', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1),
    db.from('speaking_submissions')
      .select('band_score')
      .eq('user_id', userId)
      .not('band_score', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1),
  ])

  const typeByTest = new Map((testsRes.data ?? []).map(t => [t.id, t.type as SkillType]))
  const latest: Partial<Record<SkillType, number>> = {}
  for (const a of attemptsRes.data ?? []) {
    const type = typeByTest.get(a.test_id)
    if ((type === 'listening' || type === 'reading') && latest[type] === undefined) {
      latest[type] = a.band_score!
    }
  }
  if (writingRes.data?.[0]) latest.writing = writingRes.data[0].band_score!
  if (speakingRes.data?.[0]) latest.speaking = speakingRes.data[0].band_score!

  const parts = (['listening', 'reading', 'writing', 'speaking'] as const)
    .filter(m => latest[m] !== undefined)
    .map(m => `${m[0].toUpperCase()}${m.slice(1)} ${latest[m]}`)
  return parts.length ? parts.join(' · ') : null
}
