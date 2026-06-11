import 'server-only'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSubscriptionActive } from '@/lib/subscription'

export async function getApiUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}

export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('subscription_status, subscription_expires_at, lifetime_access')
    .eq('id', userId)
    .single()

  // Subscription-only — access requires an active paid plan, or a still-valid
  // paid period after cancellation. See lib/subscription.ts.
  return isSubscriptionActive(profile)
}

export async function recordUsage(userId: string, feature: string) {
  const admin = createAdminClient()
  await admin.from('ai_usage').insert({ user_id: userId, feature })
}

// ── Abuse protection for the (expensive) AI endpoints ────────────────────────

// Per-feature daily caps. Generous enough for real study, low enough that a
// runaway loop or a shared account can't run up an unbounded OpenAI bill.
export const AI_DAILY_LIMITS: Record<string, number> = {
  writing:          40,
  writing_coach:    20,
  speaking:         40,
  // A full speaking test fires many small examiner/TTS/transcribe calls (one per
  // turn, ~15 turns), so these per-turn features need much higher daily caps
  // than the once-per-test grade. ~20 full tests/day is plenty for real study.
  speaking_examiner: 400,
  speaking_realtime: 40, // one realtime session (one whole test) per token
  tts:              400,
  transcribe:       400,
  study_plan:       15,
  band_estimate:    80,
  test_explanation: 150,
}

/**
 * In-memory sliding-window burst limiter. Best-effort only: each serverless
 * instance keeps its own map, so this stops a tight per-instance loop, not a
 * distributed flood. The DB-backed daily quota handles sustained abuse. Move to
 * Upstash / Vercel KV when cross-instance guarantees are needed.
 */
const burstHits = new Map<string, number[]>()
function burstLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const recent = (burstHits.get(key) ?? []).filter(t => now - t < windowMs)
  if (recent.length >= limit) { burstHits.set(key, recent); return false }
  recent.push(now)
  burstHits.set(key, recent)
  if (burstHits.size > 5000) {
    for (const [k, v] of burstHits) if (v.every(t => now - t > windowMs)) burstHits.delete(k)
  }
  return true
}

/** How many times this user has used `feature` since 00:00 UTC today. */
async function dailyUsageCount(userId: string, feature: string): Promise<number> {
  const admin = createAdminClient()
  const since = new Date()
  since.setUTCHours(0, 0, 0, 0)
  const { count } = await admin
    .from('ai_usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('feature', feature)
    .gte('created_at', since.toISOString())
  return count ?? 0
}

/**
 * Gate an AI endpoint: a short-window burst cap plus a per-feature daily quota.
 * Returns a 429 response to return directly, or null when the request is allowed.
 */
export async function enforceAiLimits(userId: string, feature: string): Promise<NextResponse | null> {
  if (!burstLimit(`ai:${userId}`, 15, 60_000)) {
    return err('Too many requests. Please slow down and try again in a moment.', 429)
  }
  const limit = AI_DAILY_LIMITS[feature] ?? 60
  const used = await dailyUsageCount(userId, feature)
  if (used >= limit) {
    return err(`You've reached today's limit of ${limit} for this feature. It resets at midnight UTC.`, 429)
  }
  return null
}

export function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

/**
 * One gate for the AI endpoints: authenticate, then check subscription and the
 * rate limit IN PARALLEL (they each hit the DB, so running them concurrently
 * saves a round trip on the per-turn hot path — examiner/tts/transcribe). On
 * success returns the user; otherwise returns the response to send back.
 */
export async function gateAiRequest(feature: string): Promise<
  | { user: NonNullable<Awaited<ReturnType<typeof getApiUser>>>; error: null }
  | { user: null; error: NextResponse }
> {
  const user = await getApiUser()
  if (!user) return { user: null, error: err('Unauthorized', 401) }
  const [allowed, limited] = await Promise.all([
    hasActiveSubscription(user.id),
    enforceAiLimits(user.id, feature),
  ])
  if (!allowed) return { user: null, error: err('Subscription required.', 403) }
  if (limited) return { user: null, error: limited }
  return { user, error: null }
}
