import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'
import { analyzeUser, pickPrimarySignal } from './signals.ts'
import { getResourceForSignal } from './resources.ts'
import { antiSpamVerdict } from './antiSpam.ts'
import { composeDigest } from './composer.server'

type Db = SupabaseClient<Database>

/** hard cap per cron run — a runaway user list can't run up the OpenAI bill */
const MAX_USERS_PER_RUN = 200

export type DigestOutcome =
  | 'sent'
  | 'silence'
  | 'already_sent_today'
  | 'same_signal_cooldown'
  | 'inactivity_cooldown'
  | 'error'

export async function digestForUser(db: Db, userId: string, now = new Date()): Promise<DigestOutcome> {
  const signals = await analyzeUser(db, userId, now)
  const primary = pickPrimarySignal(signals)
  if (!primary) return 'silence'

  const { data: recent } = await db
    .from('agent_messages')
    .select('sent_at, signal_type')
    .eq('user_id', userId)
    .order('sent_at', { ascending: false })
    .limit(5)

  const verdict = antiSpamVerdict(recent ?? [], primary.type, now)
  if (verdict) return verdict

  const [resource, profileRes] = await Promise.all([
    getResourceForSignal(db, primary),
    db.from('profiles').select('full_name, preferred_language').eq('id', userId).maybeSingle(),
  ])
  const fullName = profileRes.data?.full_name ?? null

  const content = await composeDigest({
    firstName: fullName ? fullName.trim().split(/\s+/)[0] : null,
    language: profileRes.data?.preferred_language ?? null,
    signal: primary,
    resource,
  })

  const { error: insertErr } = await db.from('agent_messages').insert({
    user_id: userId,
    signal_type: primary.type,
    channel: 'in-app',
    content,
    resource_url: resource?.url ?? null,
  })
  if (insertErr) throw new Error(`digest insert failed: ${insertErr.message}`)

  // Metering only — the digest is not user-initiated, so it bypasses gateAiRequest.
  await db.from('ai_usage').insert({ user_id: userId, feature: 'agent_digest' })

  return 'sent'
}

/** Users with any recorded activity in the last `days` — the cron's audience. */
async function activeUserIds(db: Db, days: number): Promise<string[]> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString()
  const [attempts, writing, speaking, events] = await Promise.all([
    db.from('user_attempts').select('user_id').gte('completed_at', since).limit(2000),
    db.from('writing_submissions').select('user_id').gte('created_at', since).limit(2000),
    db.from('speaking_submissions').select('user_id').gte('created_at', since).limit(2000),
    db.from('user_events').select('user_id').gte('created_at', since).limit(2000),
  ])
  const ids = new Set<string>()
  for (const res of [attempts, writing, speaking, events]) {
    for (const row of res.data ?? []) ids.add(row.user_id)
  }
  return [...ids].slice(0, MAX_USERS_PER_RUN)
}

export async function runDailyDigest(db: Db): Promise<Record<string, number>> {
  const users = await activeUserIds(db, 14)
  const tally: Record<string, number> = {}
  for (const userId of users) {
    let outcome: DigestOutcome
    try {
      outcome = await digestForUser(db, userId)
    } catch (e) {
      console.error(`[agent/digest] user ${userId}:`, e)
      outcome = 'error'
    }
    tally[outcome] = (tally[outcome] ?? 0) + 1
  }
  return { users: users.length, ...tally }
}
