/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@/lib/supabase/client'

function db() {
  return createClient()
}

const STORAGE_KEY = 'mock:current'

export interface CurrentMock {
  id: string
  startedAt: string // ISO — only sections completed after this count toward the mock
  listeningTestId: string | null
  readingTestId: string | null
  writingTestId: string | null
  /** Cached titles so the run screen can label sections without refetching. */
  listeningTitle?: string
  readingTitle?: string
  writingTitle?: string
}

export type MockSkill = 'listening' | 'reading' | 'writing' | 'speaking'

export function saveCurrentMock(mock: CurrentMock) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(mock))
}

export function loadCurrentMock(): CurrentMock | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try { return JSON.parse(raw) as CurrentMock } catch { return null }
}

export function clearCurrentMock() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}

export type MockProgress = Partial<Record<MockSkill, number>>

/**
 * Per-section bands for an in-progress mock, derived from the user's real
 * activity since `since`: completed listening/reading attempts on the chosen
 * tests, and the latest writing/speaking submissions.
 */
export async function getMockProgress(opts: {
  userId: string
  listeningTestId: string | null
  readingTestId: string | null
  since: string
}): Promise<MockProgress> {
  const supabase = db()
  const testIds = [opts.listeningTestId, opts.readingTestId].filter(Boolean) as string[]

  const [attemptsRes, writingRes, speakingRes] = await Promise.all([
    testIds.length
      ? supabase.from('user_attempts')
          .select('test_id, band_score, completed_at')
          .eq('user_id', opts.userId)
          .in('test_id', testIds)
          .not('completed_at', 'is', null)
          .gte('completed_at', opts.since)
          .order('completed_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    supabase.from('writing_submissions')
      .select('band_score, created_at')
      .eq('user_id', opts.userId)
      .gte('created_at', opts.since)
      .order('created_at', { ascending: false })
      .limit(1),
    supabase.from('speaking_submissions')
      .select('band_score, created_at')
      .eq('user_id', opts.userId)
      .gte('created_at', opts.since)
      .order('created_at', { ascending: false })
      .limit(1),
  ])

  const progress: MockProgress = {}

  // first (newest) completed attempt per chosen test id
  for (const a of (attemptsRes.data ?? []) as any[]) {
    if (a.band_score == null) continue
    if (a.test_id === opts.listeningTestId && progress.listening == null) progress.listening = Number(a.band_score)
    if (a.test_id === opts.readingTestId && progress.reading == null) progress.reading = Number(a.band_score)
  }

  const w = (writingRes.data ?? [])[0]
  if (w?.band_score != null) progress.writing = Number(w.band_score)
  const s = (speakingRes.data ?? [])[0]
  if (s?.band_score != null) progress.speaking = Number(s.band_score)

  return progress
}
