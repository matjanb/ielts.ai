// Pattern-analysis layer for the AI coach agent. Pure code, zero AI calls:
// reads existing tables (user_attempts, user_answers, questions, writing/
// speaking submissions, study_sessions) and turns them into discrete signals.
// Consumers: the instant-reaction constructor and the evening AI digest — both
// receive the same AgentSignals shape, so keep it channel-independent.
//
// abandonment is reserved: it needs the user_events table (test_abandoned,
// session_start/end) which lands in a later stage; until then it stays null.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, SkillType } from '../types/database'

type Db = SupabaseClient<Database>

// ─── Thresholds (tune after calibrating on real data) ───────────────────────

export const AGENT_THRESHOLDS = {
  /** consecutive completed tests without a new best band → plateau */
  plateauTests: 3,
  /** days with zero activity → inactivity nudge */
  inactivityDays: 3,
  /** past this many quiet days the user is churned — the coach goes silent
   *  (win-back is a marketing flow, not a daily-nudge flow) */
  churnedDays: 14,
  /** week-over-week drop in active days (%) that counts as losing momentum */
  frequencyDropPct: 50,
  /** wrong-answer share (%) that marks a question type as failing */
  errorRatePct: 60,
  /** minimum answers of one type before repeated_error can fire */
  errorMinAttempts: 5,
  /** those answers must span at least this many different tests — one bad
   *  test is a bad day, not a stable pattern */
  errorMinTests: 2,
  /** recent completed listening/reading attempts mined for per-question stats */
  answerWindowAttempts: 15,
  /** minimum answers in a (part, type) bucket before it can be a weak area */
  weakAreaMinAttempts: 4,
} as const

// ─── Signal shapes ───────────────────────────────────────────────────────────

export type WeakArea = {
  part: number | null
  questionType: string
  errorRate: number // 0–100
  attempts: number
}

export type PlateauSignal = {
  module: SkillType
  currentBand: number
  testsWithoutImprovement: number
  weakArea: WeakArea | null
}

export type InactivitySignal = {
  daysSinceLastActivity: number
  activeDaysThisWeek: number
  activeDaysLastWeek: number
  frequencyDropPct: number // 0–100, week over week
  /** true once the quiet stretch exceeds churnedDays — the agent stays silent */
  churned: boolean
}

export type RepeatedErrorSignal = {
  module: SkillType
  questionType: string
  part: number | null
  errorRate: number // 0–100
  attempts: number
}

export type PositiveSignal =
  | { kind: 'broke_plateau'; module: SkillType; previousBand: number; currentBand: number }
  | { kind: 'aha_moment'; module: SkillType; questionType: string; previousErrorRate: number }
  | { kind: 'closed_weak_skill'; module: SkillType; questionType: string; beforeErrorRate: number; afterErrorRate: number }

export type AgentSignals = {
  userId: string
  generatedAt: string
  plateau: PlateauSignal | null
  inactivity: InactivitySignal | null
  repeatedError: RepeatedErrorSignal | null
  abandonment: null // reserved for user_events (stage 1)
  positive: PositiveSignal[]
  /** raw numbers behind the signals — for threshold calibration, not for messaging */
  metrics: {
    bandSeries: Partial<Record<SkillType, number[]>>
    answersAnalyzed: number
    lastActivityAt: string | null
  }
}

export type PrimarySignal =
  | { type: 'inactivity'; signal: InactivitySignal }
  | { type: 'plateau'; signal: PlateauSignal }
  | { type: 'repeated_error'; signal: RepeatedErrorSignal }
  | { type: 'positive'; signal: PositiveSignal }

// ─── Internal row shapes ─────────────────────────────────────────────────────

type BandPoint = { band: number; at: string }
type AnswerRow = {
  module: SkillType
  part: number | null
  questionType: string
  correct: boolean
  /** position in chronological attempt order, for "recent K" slicing */
  order: number
}

// ─── Data loading ────────────────────────────────────────────────────────────

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

async function loadBandSeriesAndActivity(db: Db, userId: string) {
  // Fetch newest-first then reverse: `ascending+limit` would keep the OLDEST
  // rows, so a heavy user's latest test would fall outside the window and the
  // coach would analyse stale history.
  const [attemptsRes, testsRes, writingRes, speakingRes, sessionsRes] = await Promise.all([
    db.from('user_attempts')
      .select('id, test_id, band_score, completed_at')
      .eq('user_id', userId)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(200),
    db.from('tests').select('id, type'),
    db.from('writing_submissions')
      .select('band_score, created_at')
      .eq('user_id', userId)
      .not('band_score', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100),
    db.from('speaking_submissions')
      .select('band_score, created_at')
      .eq('user_id', userId)
      .not('band_score', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100),
    db.from('study_sessions')
      .select('created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(300),
  ])

  const firstError = attemptsRes.error ?? testsRes.error ?? writingRes.error ?? speakingRes.error ?? sessionsRes.error
  if (firstError) throw new Error(`analyzeUser: failed to load user data: ${firstError.message}`)

  const typeByTest = new Map((testsRes.data ?? []).map(t => [t.id, t.type as SkillType]))

  // Everything downstream (band series trends, slice(-N) answer windows)
  // assumes chronological order — restore it after the newest-first fetch.
  const attempts = (attemptsRes.data ?? [])
    .reverse()
    .map(a => ({ ...a, module: typeByTest.get(a.test_id) }))
    .filter((a): a is typeof a & { module: SkillType } => a.module === 'listening' || a.module === 'reading')
  const writingRows = (writingRes.data ?? []).reverse()
  const speakingRows = (speakingRes.data ?? []).reverse()

  const series: Partial<Record<SkillType, BandPoint[]>> = {}
  for (const a of attempts) {
    if (a.band_score == null) continue
    ;(series[a.module] ??= []).push({ band: a.band_score, at: a.completed_at! })
  }
  for (const w of writingRows) (series.writing ??= []).push({ band: w.band_score!, at: w.created_at })
  for (const s of speakingRows) (series.speaking ??= []).push({ band: s.band_score!, at: s.created_at })

  const activityDates = [
    ...attempts.map(a => a.completed_at!),
    ...writingRows.map(w => w.created_at),
    ...speakingRows.map(s => s.created_at),
    ...(sessionsRes.data ?? []).map(s => s.created_at),
  ]

  return { attempts, series, activityDates }
}

async function loadAnswerRows(
  db: Db,
  attempts: { id: string; module: SkillType }[]
): Promise<AnswerRow[]> {
  const recent = attempts.slice(-AGENT_THRESHOLDS.answerWindowAttempts)
  if (recent.length === 0) return []

  const orderByAttempt = new Map(recent.map((a, i) => [a.id, i]))
  const moduleByAttempt = new Map(recent.map(a => [a.id, a.module]))

  const { data: answers, error } = await db
    .from('user_answers')
    .select('attempt_id, question_id, is_correct')
    .in('attempt_id', recent.map(a => a.id))
  if (error) throw new Error(`analyzeUser: failed to load answers: ${error.message}`)

  const graded = (answers ?? []).filter(a => a.is_correct !== null)
  if (graded.length === 0) return []

  const questionIds = [...new Set(graded.map(a => a.question_id))]
  const questions: { id: string; question_type: string; question_subtype: string | null; section_id: string }[] = []
  for (const ids of chunk(questionIds, 200)) {
    const { data, error: qErr } = await db
      .from('questions')
      .select('id, question_type, question_subtype, section_id')
      .in('id', ids)
    if (qErr) throw new Error(`analyzeUser: failed to load questions: ${qErr.message}`)
    questions.push(...(data ?? []))
  }
  const questionById = new Map(questions.map(q => [q.id, q]))

  const sectionIds = [...new Set(questions.map(q => q.section_id))]
  const partBySection = new Map<string, number>()
  for (const ids of chunk(sectionIds, 200)) {
    const { data, error: sErr } = await db
      .from('test_sections')
      .select('id, section_number')
      .in('id', ids)
    if (sErr) throw new Error(`analyzeUser: failed to load sections: ${sErr.message}`)
    for (const s of data ?? []) partBySection.set(s.id, s.section_number)
  }

  return graded
    .map(a => {
      const q = questionById.get(a.question_id)
      if (!q) return null
      return {
        module: moduleByAttempt.get(a.attempt_id)!,
        part: partBySection.get(q.section_id) ?? null,
        questionType: q.question_subtype ?? q.question_type,
        correct: a.is_correct!,
        order: orderByAttempt.get(a.attempt_id)!,
      }
    })
    .filter((r): r is AnswerRow => r !== null)
    .sort((a, b) => a.order - b.order)
}

// ─── Signal detection (pure functions over loaded rows) ──────────────────────

/** Trailing tests that did not beat the best band seen before them. */
function stuckStreak(bands: number[]): number {
  let peak = -Infinity
  let lastImprovement = 0
  bands.forEach((band, i) => {
    if (band > peak) {
      peak = band
      lastImprovement = i
    }
  })
  return bands.length - 1 - lastImprovement
}

function errorStats(rows: AnswerRow[]): { errorRate: number; attempts: number } {
  const wrong = rows.filter(r => !r.correct).length
  return { errorRate: Math.round((wrong / rows.length) * 100), attempts: rows.length }
}

function dominantPart(rows: AnswerRow[]): number | null {
  const counts = new Map<number, number>()
  for (const r of rows) {
    if (!r.correct && r.part !== null) counts.set(r.part, (counts.get(r.part) ?? 0) + 1)
  }
  let best: number | null = null
  let bestCount = 0
  for (const [part, count] of counts) {
    if (count > bestCount) { best = part; bestCount = count }
  }
  return best
}

function detectPlateau(
  series: Partial<Record<SkillType, BandPoint[]>>,
  answerRows: AnswerRow[]
): PlateauSignal | null {
  const t = AGENT_THRESHOLDS
  let worst: PlateauSignal | null = null
  for (const [module, points] of Object.entries(series) as [SkillType, BandPoint[]][]) {
    if (points.length < t.plateauTests + 1) continue
    const streak = stuckStreak(points.map(p => p.band))
    if (streak < t.plateauTests) continue
    if (worst && streak <= worst.testsWithoutImprovement) continue
    worst = {
      module,
      currentBand: points[points.length - 1].band,
      testsWithoutImprovement: streak,
      weakArea: findWeakArea(answerRows.filter(r => r.module === module)),
    }
  }
  return worst
}

function findWeakArea(rows: AnswerRow[]): WeakArea | null {
  const buckets = new Map<string, AnswerRow[]>()
  for (const r of rows) {
    const key = `${r.part ?? '?'}|${r.questionType}`
    ;(buckets.get(key) ?? buckets.set(key, []).get(key)!).push(r)
  }
  let worst: WeakArea | null = null
  for (const bucket of buckets.values()) {
    if (bucket.length < AGENT_THRESHOLDS.weakAreaMinAttempts) continue
    const { errorRate, attempts } = errorStats(bucket)
    if (errorRate < 50) continue
    if (worst && errorRate <= worst.errorRate) continue
    worst = { part: bucket[0].part, questionType: bucket[0].questionType, errorRate, attempts }
  }
  return worst
}

function detectInactivity(activityDates: string[], now: Date): InactivitySignal | null {
  if (activityDates.length === 0) return null
  const t = AGENT_THRESHOLDS
  const dayMs = 24 * 60 * 60 * 1000
  const last = Math.max(...activityDates.map(d => new Date(d).getTime()))
  const daysSince = Math.floor((now.getTime() - last) / dayMs)

  const dayKey = (ms: number) => new Date(ms).toISOString().slice(0, 10)
  const thisWeek = new Set<string>()
  const lastWeek = new Set<string>()
  for (const d of activityDates) {
    const age = now.getTime() - new Date(d).getTime()
    if (age < 7 * dayMs) thisWeek.add(dayKey(new Date(d).getTime()))
    else if (age < 14 * dayMs) lastWeek.add(dayKey(new Date(d).getTime()))
  }
  const dropPct = lastWeek.size > 0
    ? Math.max(0, Math.round((1 - thisWeek.size / lastWeek.size) * 100))
    : 0

  const significant =
    daysSince >= t.inactivityDays ||
    (lastWeek.size >= 3 && dropPct >= t.frequencyDropPct)
  if (!significant) return null

  return {
    daysSinceLastActivity: daysSince,
    activeDaysThisWeek: thisWeek.size,
    activeDaysLastWeek: lastWeek.size,
    frequencyDropPct: dropPct,
    churned: daysSince > t.churnedDays,
  }
}

function detectRepeatedError(rows: AnswerRow[]): RepeatedErrorSignal | null {
  const t = AGENT_THRESHOLDS
  const buckets = new Map<string, AnswerRow[]>()
  for (const r of rows) {
    const key = `${r.module}|${r.questionType}`
    ;(buckets.get(key) ?? buckets.set(key, []).get(key)!).push(r)
  }
  let worst: RepeatedErrorSignal | null = null
  for (const bucket of buckets.values()) {
    if (bucket.length < t.errorMinAttempts) continue
    const recent = bucket.slice(-t.errorMinAttempts)
    if (new Set(recent.map(r => r.order)).size < t.errorMinTests) continue
    const { errorRate } = errorStats(recent)
    if (errorRate < t.errorRatePct) continue
    if (worst && errorRate <= worst.errorRate) continue
    worst = {
      module: recent[0].module,
      questionType: recent[0].questionType,
      part: dominantPart(recent),
      errorRate,
      attempts: recent.length,
    }
  }
  return worst
}

function detectPositive(
  series: Partial<Record<SkillType, BandPoint[]>>,
  rows: AnswerRow[]
): PositiveSignal[] {
  const t = AGENT_THRESHOLDS
  const out: PositiveSignal[] = []

  for (const [module, points] of Object.entries(series) as [SkillType, BandPoint[]][]) {
    if (points.length < t.plateauTests + 1) continue
    const bands = points.map(p => p.band)
    const current = bands[bands.length - 1]
    const previous = bands.slice(-t.plateauTests - 1, -1)
    const previousPeak = Math.max(...previous)
    if (current > previousPeak && stuckStreak(bands.slice(0, -1)) >= t.plateauTests - 1) {
      out.push({ kind: 'broke_plateau', module, previousBand: previousPeak, currentBand: current })
    }
  }

  const buckets = new Map<string, AnswerRow[]>()
  for (const r of rows) {
    const key = `${r.module}|${r.questionType}`
    ;(buckets.get(key) ?? buckets.set(key, []).get(key)!).push(r)
  }
  for (const bucket of buckets.values()) {
    const last = bucket[bucket.length - 1]
    const prior = bucket.slice(0, -1)
    if (last.correct && prior.length >= 3) {
      const { errorRate } = errorStats(prior)
      if (errorRate >= t.errorRatePct) {
        out.push({
          kind: 'aha_moment',
          module: last.module,
          questionType: last.questionType,
          previousErrorRate: errorRate,
        })
      }
    }
    if (bucket.length >= 2 * t.errorMinAttempts) {
      const before = errorStats(bucket.slice(0, t.errorMinAttempts))
      const after = errorStats(bucket.slice(-t.errorMinAttempts))
      if (before.errorRate >= t.errorRatePct && after.errorRate <= 20) {
        out.push({
          kind: 'closed_weak_skill',
          module: bucket[0].module,
          questionType: bucket[0].questionType,
          beforeErrorRate: before.errorRate,
          afterErrorRate: after.errorRate,
        })
      }
    }
  }

  return out
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function analyzeUser(db: Db, userId: string, now = new Date()): Promise<AgentSignals> {
  const { attempts, series, activityDates } = await loadBandSeriesAndActivity(db, userId)
  const answerRows = await loadAnswerRows(db, attempts)

  const lastActivity = activityDates.length
    ? new Date(Math.max(...activityDates.map(d => new Date(d).getTime()))).toISOString()
    : null

  return {
    userId,
    generatedAt: now.toISOString(),
    plateau: detectPlateau(series, answerRows),
    inactivity: detectInactivity(activityDates, now),
    repeatedError: detectRepeatedError(answerRows),
    abandonment: null,
    positive: detectPositive(series, answerRows),
    metrics: {
      bandSeries: Object.fromEntries(
        (Object.entries(series) as [SkillType, BandPoint[]][]).map(([m, pts]) => [m, pts.map(p => p.band)])
      ),
      answersAnalyzed: answerRows.length,
      lastActivityAt: lastActivity,
    },
  }
}

/**
 * One message = one problem. Returns the single most important signal for
 * today, or null — and null means the agent stays silent (anti-spam is a
 * feature, not a failure mode).
 */
export function pickPrimarySignal(signals: AgentSignals): PrimarySignal | null {
  // A churned user gets silence across the board: nudging someone gone for
  // weeks is spam, and telling them about a plateau they left behind is worse.
  if (signals.inactivity?.churned) return null
  if (signals.inactivity) return { type: 'inactivity', signal: signals.inactivity }
  if (signals.plateau) return { type: 'plateau', signal: signals.plateau }
  if (signals.repeatedError) return { type: 'repeated_error', signal: signals.repeatedError }
  if (signals.positive.length > 0) return { type: 'positive', signal: signals.positive[0] }
  return null
}
