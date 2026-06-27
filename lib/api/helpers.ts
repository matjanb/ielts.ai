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

// ── Free-tier entitlement for the (expensive) AI endpoints ───────────────────

// Non-subscribers get exactly ONE full mock test, then everything locks. We
// meter this off lifetime ai_usage counts (every graded action is logged there,
// including Reading/Listening which we record for metering even though they
// spend no tokens). One mock = 1 Reading + 1 Listening + Writing Task 1 & 2 +
// one Speaking session. Every other feature (coach/roast, study plan,
// writing-coach chat, per-question explanations, standalone practice drills,
// vocabulary) is paid-only — 0 free uses.
export const FREE_LIFETIME_ALLOWANCE: Record<string, number> = {
  reading:           1, // one Reading test of the free mock
  listening:         1, // one Listening test of the free mock
  writing:           2, // Task 1 + Task 2 of the free mock
  speaking:          1, // one speaking session grade
  transcribe:        1, // that session's transcription
  speaking_realtime: 1, // one realtime speaking session
  band_estimate:     1, // one predicted overall band for the free mock
}

/** Lifetime count of how many times this user has used `feature`. */
async function lifetimeUsageCount(userId: string, feature: string): Promise<number> {
  const admin = createAdminClient()
  const { count } = await admin
    .from('ai_usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('feature', feature)
  return count ?? 0
}

/**
 * May this user use a token-spending AI feature right now? Active subscribers
 * always can; otherwise only while still within the one-free-mock allowance for
 * this specific feature. See FREE_LIFETIME_ALLOWANCE.
 */
export async function canUseAiFeature(userId: string, feature: string): Promise<boolean> {
  if (await hasActiveSubscription(userId)) return true
  const free = FREE_LIFETIME_ALLOWANCE[feature] ?? 0
  if (free <= 0) return false
  return (await lifetimeUsageCount(userId, feature)) < free
}

export interface Entitlement {
  subscribed: boolean
  freeMockUsed: boolean
  // Nav/area keys the free user can no longer open (drives nav locks + the
  // central route guard). Empty for subscribers.
  locked: string[]
  // Whether the user finished the 3-question onboarding (gates the dashboard).
  onboardingCompleted: boolean
}

// Areas a free user can never open — their whole free allowance is the one mock,
// taken inside /mock-tests/run. Standalone skills, practice drills, vocabulary,
// the study plan and the AI coach are paid from the start.
const FREE_ALWAYS_LOCKED = ['reading', 'listening', 'writing', 'speaking', 'vocabulary', 'studyPlan', 'roast', 'practice']

/**
 * Billing + onboarding state the client needs to tailor the UI. The free tier is
 * exactly ONE mock: standalone areas above are always locked, and Mock Tests
 * locks once `profiles.free_mock_used` flips (set atomically by /api/mock/start).
 * Driven by the authoritative flag, not derived ai_usage counts.
 */
export async function getEntitlement(userId: string): Promise<Entitlement> {
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('subscription_status, subscription_expires_at, lifetime_access, onboarding_completed, free_mock_used')
    .eq('id', userId)
    .single<{ subscription_status: string; subscription_expires_at: string | null; lifetime_access: boolean | null; onboarding_completed: boolean | null; free_mock_used: boolean | null }>()

  const onboardingCompleted = profile?.onboarding_completed === true

  if (isSubscriptionActive(profile)) {
    return { subscribed: true, freeMockUsed: true, locked: [], onboardingCompleted }
  }

  const freeMockUsed = profile?.free_mock_used === true
  const locked = [...FREE_ALWAYS_LOCKED]
  if (freeMockUsed) locked.push('mockTests')

  return { subscribed: false, freeMockUsed, locked, onboardingCompleted }
}

// ── Abuse protection for the (expensive) AI endpoints ────────────────────────

// Per-feature daily caps. Generous enough for real study, low enough that a
// runaway loop or a shared account can't run up an unbounded OpenAI bill.
export const AI_DAILY_LIMITS: Record<string, number> = {
  writing:          40,
  writing_coach:    20,
  speaking:         40,
  // A realtime test ends with one Whisper pass over the recording to derive the
  // session's fluency metrics, so transcribe needs a higher cap than the
  // once-per-test grade — but still one call per test, not per turn.
  speaking_realtime: 40, // one realtime session (one whole test) per token
  transcribe:       80,
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
    canUseAiFeature(user.id, feature),
    enforceAiLimits(user.id, feature),
  ])
  if (!allowed) return { user: null, error: err('Subscription required.', 403) }
  if (limited) return { user: null, error: limited }
  return { user, error: null }
}
