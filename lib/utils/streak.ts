// Single source of truth for study-streak maths, shared by the dashboard,
// progress page and notifications so they never disagree.

export interface StreakStats {
  /** Consecutive active days, still alive through today (grace day). */
  current: number
  /** Longest run the user has ever achieved. */
  best: number
  /** Whether there's already an activity logged today. */
  todayDone: boolean
}

const DAY = 86400000

/**
 * A streak counts consecutive days with at least one study session. It stays
 * "alive" through today: if today has no activity yet we count up to yesterday
 * (you still have today to keep it), and it only breaks once a full day is
 * missed — so it doesn't reset to 0 every morning.
 */
export function computeStreak(dates: (string | Date)[]): StreakStats {
  const days = new Set<number>()
  for (const d of dates) {
    const x = new Date(d); x.setHours(0, 0, 0, 0)
    if (!Number.isNaN(x.getTime())) days.add(x.getTime())
  }

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const todayMs = today.getTime()
  const todayDone = days.has(todayMs)

  // Start at today if done, else yesterday (grace). Count back while days connect.
  let current = 0
  let cursor = todayDone ? todayMs : todayMs - DAY
  while (days.has(cursor)) { current++; cursor -= DAY }

  // Longest run across the whole history.
  const sorted = [...days].sort((a, b) => a - b)
  let best = 0, run = 0, prev = NaN
  for (const ms of sorted) {
    run = ms - prev === DAY ? run + 1 : 1
    if (run > best) best = run
    prev = ms
  }

  return { current, best, todayDone }
}
