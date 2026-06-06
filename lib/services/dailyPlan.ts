/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@/lib/supabase/client'
import { getSubskillAccuracy } from '@/lib/services/tests'
import { buildDailyPlan, dailyPlanSummary, dayOfYear, type DailyTask, type DailySummary } from '@/lib/dailyPlan'

// FIXME: this service reads a `diagnostic_data` table (and columns like
// daily_study_time / weakest_skills / exam_date) that do not exist in the live
// DB, so it is effectively broken. Kept untyped until the schema is sorted out.
function db() {
  return createClient() as any
}

export interface DailyPlanContext {
  dailyMinutes: number
  bands: Record<string, number | undefined>
  weakHints: string[]
  /** Weakest question type per skill (only when there's enough answered data). */
  weakType: Partial<Record<'reading' | 'listening', string>>
  /** Approximate days until the exam, from the timeline/exam-date bucket. */
  daysToExam?: number
}

const HOURS_TO_MIN: Record<string, number> = {
  '30_min': 30, '1_hour': 60, '2_hours': 120, '3_plus_hours': 180,
}

/* We don't store a real exam date — only a coarse bucket. Map each bucket to a
 * representative day count so the plan can scale its urgency. */
const BUCKET_TO_DAYS: Record<string, number> = {
  within_1_month: 21, '1_3_months': 60, '3_6_months': 135,
}

/**
 * Daily-minute budget + weak-skill signals for the daily plan.
 * Minutes: diagnostic slider first (what the user set), then onboarding, else 60.
 * Weak skills: latest measured bands + the skills flagged in the diagnostic.
 */
export async function getDailyPlanContext(userId: string): Promise<DailyPlanContext> {
  const [diag, onb, hist, readAcc, listenAcc] = await Promise.all([
    db().from('diagnostic_data').select('daily_study_time, weakest_skills, exam_date').eq('user_id', userId).maybeSingle(),
    db().from('onboarding_data').select('daily_hours, focus_skills, timeline').eq('user_id', userId).maybeSingle(),
    db().from('band_score_history').select('skill, score, recorded_at').eq('user_id', userId).order('recorded_at', { ascending: false }).limit(60),
    getSubskillAccuracy(userId, 'reading').catch(() => []),
    getSubskillAccuracy(userId, 'listening').catch(() => []),
  ])

  // Weakest question type per skill — only trust it once enough questions answered.
  const weakestType = (rows: { type: string; total: number; accuracy: number }[]) => {
    const eligible = rows.filter(r => r.total >= 4)
    return eligible.length ? eligible[0].type : undefined // getSubskillAccuracy is sorted weakest-first
  }
  const weakType: Partial<Record<'reading' | 'listening', string>> = {}
  const rt = weakestType(readAcc as any); if (rt) weakType.reading = rt
  const lt = weakestType(listenAcc as any); if (lt) weakType.listening = lt

  // Daily minutes
  let dailyMinutes = 60
  const diagMin = parseInt(String(diag.data?.daily_study_time ?? ''), 10)
  if (!Number.isNaN(diagMin) && diagMin > 0) dailyMinutes = diagMin
  else if (onb.data?.daily_hours && HOURS_TO_MIN[onb.data.daily_hours]) dailyMinutes = HOURS_TO_MIN[onb.data.daily_hours]
  dailyMinutes = Math.max(15, Math.min(180, dailyMinutes))

  // Latest band per skill
  const bands: Record<string, number | undefined> = {}
  for (const row of (hist.data ?? [])) {
    if (row.skill === 'overall') continue
    if (bands[row.skill] === undefined) bands[row.skill] = Number(row.score)
  }

  const weakHints: string[] = [
    ...(diag.data?.weakest_skills ?? []),
    ...(onb.data?.focus_skills ?? []),
  ]

  // Approximate days to the exam from whichever bucket we have (diagnostic first,
  // then onboarding timeline). 'not_sure'/missing → undefined (relaxed pacing).
  const bucket = diag.data?.exam_date ?? onb.data?.timeline
  const daysToExam = bucket ? BUCKET_TO_DAYS[bucket] : undefined

  return { dailyMinutes, bands, weakHints, weakType, daysToExam }
}

/** Stable per-user, per-day localStorage key for today's done-state. Shared by
 *  both the Overview and the Study Plan page so progress stays in sync. */
export function dailyDoneKey(userId: string): string {
  return `dailyplan:${userId}:${new Date().toISOString().slice(0, 10)}`
}

export interface DailyPlanResult {
  tasks: DailyTask[]
  summary: DailySummary
  doneKey: string
}

/**
 * The single entry point both pages use to render "today" — same context, same
 * day-seed, same localStorage key, so the Overview and Study Plan always agree.
 */
export async function getDailyPlan(userId: string): Promise<DailyPlanResult> {
  const ctx = await getDailyPlanContext(userId)
  const tasks = buildDailyPlan({
    bands: ctx.bands,
    weakHints: ctx.weakHints,
    dailyMinutes: ctx.dailyMinutes,
    daySeed: dayOfYear(),
    weakType: ctx.weakType,
    daysToExam: ctx.daysToExam,
  })
  const summary = dailyPlanSummary({ bands: ctx.bands, weakHints: ctx.weakHints, daysToExam: ctx.daysToExam })
  return { tasks, summary, doneKey: dailyDoneKey(userId) }
}
