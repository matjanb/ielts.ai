/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@/lib/supabase/client'
import { getSubskillAccuracy } from '@/lib/services/tests'

function db() {
  return createClient() as any
}

export interface DailyPlanContext {
  dailyMinutes: number
  bands: Record<string, number | undefined>
  weakHints: string[]
  /** Weakest question type per skill (only when there's enough answered data). */
  weakType: Partial<Record<'reading' | 'listening', string>>
}

const HOURS_TO_MIN: Record<string, number> = {
  '30_min': 30, '1_hour': 60, '2_hours': 120, '3_plus_hours': 180,
}

/**
 * Daily-minute budget + weak-skill signals for the daily plan.
 * Minutes: diagnostic slider first (what the user set), then onboarding, else 60.
 * Weak skills: latest measured bands + the skills flagged in the diagnostic.
 */
export async function getDailyPlanContext(userId: string): Promise<DailyPlanContext> {
  const [diag, onb, hist, readAcc, listenAcc] = await Promise.all([
    db().from('diagnostic_data').select('daily_study_time, weakest_skills').eq('user_id', userId).maybeSingle(),
    db().from('onboarding_data').select('daily_hours, focus_skills').eq('user_id', userId).maybeSingle(),
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

  return { dailyMinutes, bands, weakHints, weakType }
}
