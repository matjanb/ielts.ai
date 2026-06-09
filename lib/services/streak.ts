// Client wrapper for the streak endpoint, which both computes the streak and
// maintains freezes server-side. Shared by the dashboard and progress page.

export interface StreakInfo {
  current: number
  best: number
  todayDone: boolean
  freezes: number
  dailyMinutes: number
  dailyGoal: number
}

const EMPTY: StreakInfo = { current: 0, best: 0, todayDone: false, freezes: 0, dailyMinutes: 0, dailyGoal: 15 }

export async function getStreakInfo(): Promise<StreakInfo> {
  try {
    const res = await fetch('/api/streak', { method: 'POST' })
    if (res.ok) return await res.json()
  } catch { /* fall through */ }
  return EMPTY
}
