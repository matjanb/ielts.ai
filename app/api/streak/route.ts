/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { getApiUser } from '@/lib/api/helpers'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const DAY = 86400000
const DAILY_MIN = 5      // minutes for a day to count toward the streak
const DAILY_GOAL = 15    // the daily target shown to the user
const FREEZE_CAP = 3     // max freezes a user can bank
const AWARD_EVERY = 7    // earn one freeze per 7-day streak

const EMPTY = { current: 0, best: 0, todayDone: false, freezes: 0, dailyMinutes: 0, dailyGoal: DAILY_GOAL }

// Computes the streak AND maintains freezes (auto-spend on a missed day, award on
// each new 7-day mark), persisting the result so it recomputes consistently.
//
// All "days" are calendar days in the USER's timezone (the client sends its
// getTimezoneOffset()), not the server's UTC — otherwise a user in Almaty
// (UTC+5) saw their day flip at 05:00 and could "lose" an evening session to
// the wrong date. A day is represented as an integer day number.
export async function POST(request: NextRequest) {
  const user = await getApiUser()
  if (!user) return NextResponse.json(EMPTY)

  // getTimezoneOffset(): UTC = local + offset, so local ms = ms - offset*60000.
  let tzOffset = 0
  try {
    const body = await request.json()
    if (typeof body?.tzOffset === 'number' && Number.isFinite(body.tzOffset) && Math.abs(body.tzOffset) <= 840) {
      tzOffset = Math.round(body.tzOffset)
    }
  } catch { /* no body → assume UTC */ }

  const dayNum = (ms: number) => Math.floor((ms - tzOffset * 60000) / DAY)
  // Frozen days are stored as calendar labels ('YYYY-MM-DD'), not moments in
  // time — parse them as plain day numbers with NO timezone shift.
  const labelToDay = (s: string) => Math.floor(Date.parse(s) / DAY)
  const dayToLabel = (n: number) => new Date(n * DAY).toISOString().slice(0, 10)

  const admin = createAdminClient()
  const since = new Date(Date.now() - 200 * DAY).toISOString()
  const [{ data: sessions }, { data: profile }] = await Promise.all([
    admin.from('study_sessions').select('created_at, duration_minutes').eq('user_id', user.id).gte('created_at', since),
    admin.from('profiles').select('streak_freezes, streak_frozen_days, streak_last_award').eq('id', user.id).maybeSingle(),
  ])

  // day → total minutes studied
  const mins = new Map<number, number>()
  for (const s of (sessions ?? [])) {
    const k = dayNum(new Date(s.created_at).getTime())
    mins.set(k, (mins.get(k) ?? 0) + (s.duration_minutes ?? 0))
  }

  const today = dayNum(Date.now())
  const dailyMinutes = mins.get(today) ?? 0

  let freezes = profile?.streak_freezes ?? 0
  const frozen = new Set<number>(
    (Array.isArray(profile?.streak_frozen_days) ? profile!.streak_frozen_days : [])
      .map((s: any) => labelToDay(String(s)))
      .filter((n: number) => !Number.isNaN(n)),
  )
  let lastAward = profile?.streak_last_award ?? 0

  // A day is active if it met the minute goal, or a freeze already covered it.
  const active = new Set<number>()
  for (const [k, m] of mins) if (m >= DAILY_MIN) active.add(k)
  for (const f of frozen) active.add(f)

  // Auto-spend one freeze to bridge a single missed yesterday — but only if there
  // was a real (≥2-day) run before it, so freezes aren't wasted on a blip.
  const yest = today - 1
  if (!active.has(yest) && active.has(yest - 1) && active.has(yest - 2) && freezes > 0) {
    frozen.add(yest); active.add(yest); freezes--
  }

  // Current streak stays "alive" through today: count from today if done, else
  // from yesterday (you still have today to keep it).
  const todayDone = active.has(today)
  let current = 0
  let cursor = todayDone ? today : today - 1
  while (active.has(cursor)) { current++; cursor-- }

  // Longest run across the whole history.
  const sorted = [...active].sort((a, b) => a - b)
  let best = 0, run = 0, prev = NaN
  for (const n of sorted) {
    run = n - prev === 1 ? run + 1 : 1
    if (run > best) best = run
    prev = n
  }

  // Award a freeze at each new 7-day mark within the current run.
  if (current < lastAward) lastAward = 0
  while (current >= lastAward + AWARD_EVERY && freezes < FREEZE_CAP) { lastAward += AWARD_EVERY; freezes++ }
  if (current === 0) lastAward = 0

  // Only write when the freeze state actually changed — avoids a profile write on
  // every page load (this endpoint is hit on the dashboard and progress page).
  const newFrozen = [...frozen].sort((a, b) => a - b).map(dayToLabel)
  const oldFrozen = Array.isArray(profile?.streak_frozen_days) ? profile!.streak_frozen_days : []
  const changed =
    freezes !== (profile?.streak_freezes ?? 0) ||
    lastAward !== (profile?.streak_last_award ?? 0) ||
    JSON.stringify(newFrozen) !== JSON.stringify(oldFrozen)
  if (changed) {
    await admin.from('profiles').update({
      streak_freezes: freezes,
      streak_frozen_days: newFrozen,
      streak_last_award: lastAward,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id)
  }

  return NextResponse.json({ current, best, todayDone, freezes, dailyMinutes, dailyGoal: DAILY_GOAL })
}
