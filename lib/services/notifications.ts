/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@/lib/supabase/client'

function db() {
  return createClient() as any
}

export interface NotifItem {
  id: string
  kind: 'writing' | 'speaking' | 'attempt' | 'streak'
  icon: string
  color: string
  title: string
  /** ISO timestamp */
  time: string
  href?: string
}

/** Convert ISO timestamp to a short relative label ("2m ago", "Yesterday", "May 21"). */
export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  const diffMs = Date.now() - then
  if (diffMs < 0) return 'just now'
  const sec = Math.floor(diffMs / 1000)
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day === 1) return 'Yesterday'
  if (day < 7) return `${day}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const STREAK_MILESTONES = new Set([3, 7, 14, 21, 30, 50, 75, 100])

/**
 * Build a unified notifications feed from the user's real activity.
 * Returns events sorted newest-first, capped at 12.
 */
export async function getNotifications(userId: string): Promise<NotifItem[]> {
  const supabase = db()

  const [writingRes, speakingRes, attemptsRes, sessionsRes] = await Promise.all([
    supabase.from('writing_submissions')
      .select('id, task_type, band_score, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('speaking_submissions')
      .select('id, part, band_score, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('user_attempts')
      .select('id, band_score, total_score, completed_at')
      .eq('user_id', userId)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(5),
    supabase.from('study_sessions')
      .select('created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(60),
  ])

  const items: NotifItem[] = []

  for (const w of (writingRes.data ?? [])) {
    const band = w.band_score != null ? Number(w.band_score).toFixed(1) : null
    items.push({
      id: `w-${w.id}`,
      kind: 'writing',
      icon: 'pencil',
      color: 'var(--warn)',
      title: band
        ? `Writing Task ${w.task_type === '1' ? '1' : '2'} graded — Band ${band}`
        : `Writing Task ${w.task_type === '1' ? '1' : '2'} submitted`,
      time: w.created_at,
      href: '/dashboard/progress',
    })
  }

  for (const s of (speakingRes.data ?? [])) {
    const band = s.band_score != null ? Number(s.band_score).toFixed(1) : null
    items.push({
      id: `s-${s.id}`,
      kind: 'speaking',
      icon: 'mic',
      color: 'var(--danger)',
      title: band
        ? `Speaking Part ${s.part} feedback ready — Band ${band}`
        : `Speaking Part ${s.part} submitted`,
      time: s.created_at,
      href: '/dashboard/speaking',
    })
  }

  for (const a of (attemptsRes.data ?? [])) {
    const band = a.band_score != null ? Number(a.band_score).toFixed(1) : null
    items.push({
      id: `a-${a.id}`,
      kind: 'attempt',
      icon: 'clipboard',
      color: 'var(--accent)',
      title: band
        ? `Practice test completed — Band ${band}`
        : `Practice test completed`,
      time: a.completed_at,
      href: '/dashboard/progress',
    })
  }

  // Streak milestone: compute current streak from study_sessions, push a notif if
  // the streak just reached a milestone (i.e. today's session exists and streak ∈ MILESTONES).
  const sessions = sessionsRes.data ?? []
  if (sessions.length > 0) {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const dayKey = (d: Date) => d.toDateString()
    const sessionDays = new Set<string>(sessions.map((s: any) => {
      const d = new Date(s.created_at); d.setHours(0, 0, 0, 0)
      return dayKey(d)
    }))
    let streak = 0
    const cur = new Date(today)
    while (sessionDays.has(dayKey(cur))) {
      streak++
      cur.setDate(cur.getDate() - 1)
    }
    if (streak > 0 && STREAK_MILESTONES.has(streak)) {
      // Use today's latest session time as the notification timestamp
      const latestToday = sessions.find((s: any) => {
        const d = new Date(s.created_at); d.setHours(0, 0, 0, 0)
        return dayKey(d) === dayKey(today)
      })
      items.push({
        id: `streak-${streak}-${today.toDateString()}`,
        kind: 'streak',
        icon: 'flame',
        color: 'var(--warn)',
        title: `🔥 ${streak}-day streak — keep it up!`,
        time: latestToday?.created_at ?? new Date().toISOString(),
        href: '/dashboard/progress',
      })
    }
  }

  return items
    .filter(n => !!n.time)
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 12)
}
