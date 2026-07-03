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
  /**
   * Bands of the sections finished IN THIS MOCK, written as each completes.
   * This is the source of truth on resume for writing/speaking — their
   * submissions carry no test id, so "latest submission since startedAt" could
   * pick up a standalone drill done mid-mock.
   */
  progress?: Partial<Record<MockSkill, number>>
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
 * Listening/reading bands for an in-progress mock, derived from completed
 * attempts on the chosen tests since `since`. Writing/speaking are NOT
 * recovered from the DB — their submissions carry no test id, so any
 * standalone drill would masquerade as a mock section. They resume from
 * CurrentMock.progress instead.
 */
export async function getMockProgress(opts: {
  userId: string
  listeningTestId: string | null
  readingTestId: string | null
  since: string
}): Promise<MockProgress> {
  const testIds = [opts.listeningTestId, opts.readingTestId].filter(Boolean) as string[]
  if (testIds.length === 0) return {}

  const { data } = await db()
    .from('user_attempts')
    .select('test_id, band_score, completed_at')
    .eq('user_id', opts.userId)
    .in('test_id', testIds)
    .not('completed_at', 'is', null)
    .gte('completed_at', opts.since)
    .order('completed_at', { ascending: false })

  const progress: MockProgress = {}
  // first (newest) completed attempt per chosen test id
  for (const a of (data ?? []) as any[]) {
    if (a.band_score == null) continue
    if (a.test_id === opts.listeningTestId && progress.listening == null) progress.listening = Number(a.band_score)
    if (a.test_id === opts.readingTestId && progress.reading == null) progress.reading = Number(a.band_score)
  }
  return progress
}
