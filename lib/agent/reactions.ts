// Instant post-test reactions — zero AI tokens. The server picks an honest
// branch from real data (buildInstantReaction), and renderReaction assembles
// the text from per-locale piece banks: [greeting] + [observation with a real
// number] + [closer]. Pure and channel-independent: the in-app banner uses it
// today, Telegram delivery reuses it as-is later.
//
// Honesty rules: a decline never gets praise, and a low band (< 4) never gets
// a celebratory closer even when it improved — quiet encouragement instead.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, SkillType } from '../types/database'
// Explicit .ts extension so plain Node (calibration scripts, future cron
// tooling) can import this module without a bundler.
import { REACTION_PIECES, type ReactionLocale, type ReactionTone } from './reactionPieces.ts'

export type ReactionBranch = 'first_test' | 'progress' | 'decline' | 'plateau'

export type ReactionContext = {
  branch: ReactionBranch
  module: SkillType
  band: number
  prevBand: number | null
  delta: number | null
  /** completed tests of this module, including the one just finished */
  testsCount: number
  /** consecutive tests (incl. this one) at exactly this band — fuels
   *  "3rd test in a row at 6.5" wording once it reaches 3 */
  sameBandStreak: number
  firstName: string | null
  /** server-rendered text in the user's language; clients prefer it so the
   *  banner, the notification feed and Telegram all say the same thing */
  text?: string
}

/** Bands celebrate only from here up — "stuck at 2.5, great job" is a tone bug. */
const CELEBRATE_MIN_BAND = 4

// ─── Branch selection (pure) ─────────────────────────────────────────────────

export function pickReactionBranch(prevBand: number | null, band: number): ReactionBranch {
  if (prevBand === null) return 'first_test'
  if (band > prevBand) return 'progress'
  if (band < prevBand) return 'decline'
  return 'plateau'
}

function toneFor(ctx: ReactionContext): ReactionTone {
  switch (ctx.branch) {
    case 'first_test': return 'welcome'
    case 'decline':    return 'support'
    case 'plateau':    return 'steady'
    case 'progress':   return ctx.band >= CELEBRATE_MIN_BAND ? 'celebrate' : 'steady'
  }
}

// ─── Text assembly (pure) ────────────────────────────────────────────────────

function fmtBand(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

function fill(template: string, ctx: ReactionContext): string {
  return template
    .replaceAll('{name}', ctx.firstName ?? '')
    .replaceAll('{module}', MODULE_LABELS[ctx.module])
    .replaceAll('{band}', fmtBand(ctx.band))
    .replaceAll('{prev}', ctx.prevBand !== null ? fmtBand(ctx.prevBand) : '')
    .replaceAll('{delta}', ctx.delta !== null ? `${ctx.delta > 0 ? '+' : ''}${fmtBand(ctx.delta)}` : '')
    .replaceAll('{streak}', String(ctx.sameBandStreak))
}

// IELTS skill names stay in English across all locales — that is how the exam
// itself and the rest of the app refer to them.
const MODULE_LABELS: Record<SkillType, string> = {
  listening: 'Listening',
  reading: 'Reading',
  writing: 'Writing',
  speaking: 'Speaking',
}

function pick<T>(items: T[], rand: () => number): T {
  return items[Math.floor(rand() * items.length) % items.length]
}

export function renderReaction(
  locale: string,
  ctx: ReactionContext,
  rand: () => number = Math.random,
): string {
  const pieces = REACTION_PIECES[locale as ReactionLocale] ?? REACTION_PIECES.en
  const greeting = ctx.firstName
    ? fill(pick(pieces.greetingsNamed, rand), ctx)
    : pick(pieces.greetingsPlain, rand)
  // A 3+ streak at the same band is the story — say the number, not just "again".
  const observationBank =
    ctx.branch === 'plateau' && ctx.sameBandStreak >= 3
      ? pieces.plateauStreak
      : pieces.observations[ctx.branch]
  const observation = fill(pick(observationBank, rand), ctx)
  const closer = pick(pieces.closers[toneFor(ctx)], rand)
  return `${greeting} ${observation} ${closer}`
}

// ─── Context loading (server) ────────────────────────────────────────────────

/**
 * Builds the reaction context for a just-graded listening/reading attempt.
 * `excludeAttemptId` keeps the current attempt out of the "previous results",
 * since grading has already persisted it.
 */
export async function buildInstantReaction(
  db: SupabaseClient<Database>,
  userId: string,
  module: SkillType,
  band: number,
  excludeAttemptId: string | null,
): Promise<ReactionContext> {
  const [attemptsRes, testsRes, profileRes] = await Promise.all([
    db.from('user_attempts')
      .select('id, test_id, band_score, completed_at')
      .eq('user_id', userId)
      .not('completed_at', 'is', null)
      .not('band_score', 'is', null)
      .order('completed_at', { ascending: true })
      .limit(200),
    db.from('tests').select('id, type').eq('type', module),
    db.from('profiles').select('full_name, preferred_language').eq('id', userId).maybeSingle(),
  ])

  const moduleTestIds = new Set((testsRes.data ?? []).map(t => t.id))
  const prior = (attemptsRes.data ?? []).filter(
    a => moduleTestIds.has(a.test_id) && a.id !== excludeAttemptId
  )
  const prevBand = prior.length ? prior[prior.length - 1].band_score : null
  const fullName = profileRes.data?.full_name ?? null

  // Consecutive tests at exactly this band, counting backwards incl. this one.
  let sameBandStreak = 1
  for (let i = prior.length - 1; i >= 0 && prior[i].band_score === band; i--) sameBandStreak++

  const ctx: ReactionContext = {
    branch: pickReactionBranch(prevBand, band),
    module,
    band,
    prevBand,
    delta: prevBand !== null ? Math.round((band - prevBand) * 10) / 10 : null,
    testsCount: prior.length + 1,
    sameBandStreak,
    firstName: fullName ? fullName.trim().split(/\s+/)[0] : null,
  }
  ctx.text = renderReaction(profileRes.data?.preferred_language ?? 'en', ctx)
  return ctx
}
