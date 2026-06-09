/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { getApiUser } from '@/lib/api/helpers'
import { createAdminClient } from '@/lib/supabase/admin'
import { computeStreak } from '@/lib/utils/streak'

export const runtime = 'nodejs'

const DAY = 86400000
const DAILY_MIN = 5      // minutes for a day to count toward the streak
const DAILY_GOAL = 15    // the daily target shown to the user
const FREEZE_CAP = 3     // max freezes a user can bank
const AWARD_EVERY = 7    // earn one freeze per 7-day streak

const dayKey = (ms: number) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime() }
const toISO = (ms: number) => new Date(ms).toISOString().slice(0, 10)

const EMPTY = { current: 0, best: 0, todayDone: false, freezes: 0, dailyMinutes: 0, dailyGoal: DAILY_GOAL }

// Computes the streak AND maintains freezes (auto-spend on a missed day, award on
// each new 7-day mark), persisting the result so it recomputes consistently.
export async function POST() {
  const user = await getApiUser()
  if (!user) return NextResponse.json(EMPTY)

  const admin = createAdminClient()
  const since = new Date(Date.now() - 200 * DAY).toISOString()
  const [{ data: sessions }, { data: profile }] = await Promise.all([
    admin.from('study_sessions').select('created_at, duration_minutes').eq('user_id', user.id).gte('created_at', since),
    admin.from('profiles').select('streak_freezes, streak_frozen_days, streak_last_award').eq('id', user.id).maybeSingle(),
  ])

  // day → total minutes studied
  const mins = new Map<number, number>()
  for (const s of (sessions ?? [])) {
    const k = dayKey(new Date(s.created_at).getTime())
    mins.set(k, (mins.get(k) ?? 0) + (s.duration_minutes ?? 0))
  }

  const today = dayKey(Date.now())
  const dailyMinutes = mins.get(today) ?? 0

  let freezes = profile?.streak_freezes ?? 0
  const frozen = new Set<number>(
    (Array.isArray(profile?.streak_frozen_days) ? profile!.streak_frozen_days : [])
      .map((s: any) => dayKey(new Date(s).getTime()))
      .filter((n: number) => !Number.isNaN(n)),
  )
  let lastAward = profile?.streak_last_award ?? 0

  // A day is active if it met the minute goal, or a freeze already covered it.
  const active = new Set<number>()
  for (const [k, m] of mins) if (m >= DAILY_MIN) active.add(k)
  for (const f of frozen) active.add(f)

  // Auto-spend one freeze to bridge a single missed yesterday — but only if there
  // was a real (≥2-day) run before it, so freezes aren't wasted on a blip.
  const yest = today - DAY
  if (!active.has(yest) && active.has(yest - DAY) && active.has(yest - 2 * DAY) && freezes > 0) {
    frozen.add(yest); active.add(yest); freezes--
  }

  const stats = computeStreak([...active].map(k => new Date(k)))
  const current = stats.current
  const best = stats.best
  const todayDone = active.has(today)

  // Award a freeze at each new 7-day mark within the current run.
  if (current < lastAward) lastAward = 0
  while (current >= lastAward + AWARD_EVERY && freezes < FREEZE_CAP) { lastAward += AWARD_EVERY; freezes++ }
  if (current === 0) lastAward = 0

  await admin.from('profiles').update({
    streak_freezes: freezes,
    streak_frozen_days: [...frozen].sort((a, b) => a - b).map(toISO),
    streak_last_award: lastAward,
    updated_at: new Date().toISOString(),
  }).eq('id', user.id)

  return NextResponse.json({ current, best, todayDone, freezes, dailyMinutes, dailyGoal: DAILY_GOAL })
}
