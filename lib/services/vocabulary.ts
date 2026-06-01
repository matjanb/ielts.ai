/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@/lib/supabase/client'

function db() {
  return createClient() as any
}

export interface VocabDeck {
  id: string
  slug: string
  title: string
  description: string
  category: 'topic' | 'function'
  color: string
  sort_order: number
}

export interface VocabWord {
  id: string
  deck_id: string
  word: string
  part_of_speech: string
  ipa: string | null
  definition: string
  example: string
  synonyms: string[]
  antonyms: string[]
  band_level: string
}

export type SrsResult = 'again' | 'hard' | 'good' | 'easy'
export type VocabStatus = 'new' | 'learning' | 'learned'

export interface VocabProgress {
  word_id: string
  status: VocabStatus
  ease: number
  interval_days: number
  repetitions: number
  due_at: string
  last_result: SrsResult | null
  reviewed_at: string | null
}

export interface DeckWithStats extends VocabDeck {
  total: number
  learned: number
  due: number
}

export interface VocabStats {
  total: number
  learned: number
  learning: number
  dueToday: number
  retention: number // % of seen words that are 'learned'
}

/* ── Reads ──────────────────────────────────────────────────────────────── */

export async function getDecks(): Promise<VocabDeck[]> {
  const { data } = await db()
    .from('vocabulary_decks')
    .select('*')
    .order('sort_order', { ascending: true })
  return data ?? []
}

export async function getDeckWords(deckId: string): Promise<VocabWord[]> {
  const { data } = await db()
    .from('vocabulary_words')
    .select('*')
    .eq('deck_id', deckId)
    .order('band_level', { ascending: true })
  return data ?? []
}

/** Decks + per-deck total / learned / due counts for the given user (null = signed out). */
export async function getDecksWithStats(userId: string | null): Promise<DeckWithStats[]> {
  const [decks, wordsRes, progRes] = await Promise.all([
    getDecks(),
    db().from('vocabulary_words').select('id, deck_id'),
    userId
      ? db().from('user_vocabulary').select('word_id, status, due_at').eq('user_id', userId)
      : Promise.resolve({ data: [] as any[] }),
  ])

  const words: { id: string; deck_id: string }[] = wordsRes.data ?? []
  const progress: { word_id: string; status: VocabStatus; due_at: string }[] = progRes.data ?? []

  const wordToDeck = new Map(words.map(w => [w.id, w.deck_id]))
  const now = Date.now()
  const learnedByDeck = new Map<string, number>()
  const dueByDeck = new Map<string, number>()

  for (const p of progress) {
    const deckId = wordToDeck.get(p.word_id)
    if (!deckId) continue
    if (p.status === 'learned') learnedByDeck.set(deckId, (learnedByDeck.get(deckId) ?? 0) + 1)
    if (new Date(p.due_at).getTime() <= now) dueByDeck.set(deckId, (dueByDeck.get(deckId) ?? 0) + 1)
  }

  const totalByDeck = new Map<string, number>()
  for (const w of words) totalByDeck.set(w.deck_id, (totalByDeck.get(w.deck_id) ?? 0) + 1)

  return decks.map(d => {
    const total = totalByDeck.get(d.id) ?? 0
    const seenDue = dueByDeck.get(d.id) ?? 0
    const seen = progress.filter(p => wordToDeck.get(p.word_id) === d.id).length
    // unseen words are implicitly available to study ("due") too
    const due = seenDue + (total - seen)
    return { ...d, total, learned: learnedByDeck.get(d.id) ?? 0, due }
  })
}

export async function getStats(userId: string | null): Promise<VocabStats> {
  const wordsRes = await db().from('vocabulary_words').select('id', { count: 'exact', head: true })
  const total = wordsRes.count ?? 0
  if (!userId) return { total, learned: 0, learning: 0, dueToday: 0, retention: 0 }

  const { data } = await db()
    .from('user_vocabulary')
    .select('status, due_at')
    .eq('user_id', userId)
  const rows: { status: VocabStatus; due_at: string }[] = data ?? []

  const now = Date.now()
  const learned = rows.filter(r => r.status === 'learned').length
  const learning = rows.filter(r => r.status === 'learning').length
  const dueToday = rows.filter(r => new Date(r.due_at).getTime() <= now).length
  const seen = learned + learning
  const retention = seen > 0 ? Math.round((learned / seen) * 100) : 0
  return { total, learned, learning, dueToday, retention }
}

/**
 * Build a study queue for a deck: words whose progress is due (or never seen),
 * due/new first, capped at `limit`.
 */
export async function getStudyQueue(userId: string | null, deckId: string, limit = 20): Promise<VocabWord[]> {
  const words = await getDeckWords(deckId)
  if (!userId || words.length === 0) return words.slice(0, limit)

  const { data } = await db()
    .from('user_vocabulary')
    .select('word_id, due_at')
    .eq('user_id', userId)
    .in('word_id', words.map(w => w.id))
  const dueAt = new Map<string, number>((data ?? []).map((r: any) => [r.word_id, new Date(r.due_at).getTime()]))

  const now = Date.now()
  const ready = words.filter(w => !dueAt.has(w.id) || (dueAt.get(w.id) ?? 0) <= now)
  // new words first, then by soonest due
  ready.sort((a, b) => {
    const da = dueAt.has(a.id) ? dueAt.get(a.id)! : -1
    const db_ = dueAt.has(b.id) ? dueAt.get(b.id)! : -1
    return da - db_
  })
  return (ready.length ? ready : words).slice(0, limit)
}

/** Cross-deck review queue: words already seen and now due, soonest first. */
export async function getDueQueue(userId: string | null, limit = 20): Promise<VocabWord[]> {
  if (!userId) return []
  const { data } = await db()
    .from('user_vocabulary')
    .select('due_at, vocabulary_words(*)')
    .eq('user_id', userId)
    .lte('due_at', new Date().toISOString())
    .order('due_at', { ascending: true })
    .limit(limit)
  return (data ?? []).filter((r: any) => r.vocabulary_words).map((r: any) => r.vocabulary_words)
}

/** Recently learned words (status='learned', most recently reviewed). */
export async function getRecentlyLearned(userId: string | null, limit = 8): Promise<(VocabWord & { repetitions: number })[]> {
  if (!userId) return []
  const { data } = await db()
    .from('user_vocabulary')
    .select('word_id, repetitions, reviewed_at, vocabulary_words(*)')
    .eq('user_id', userId)
    .eq('status', 'learned')
    .order('reviewed_at', { ascending: false })
    .limit(limit)
  return (data ?? [])
    .filter((r: any) => r.vocabulary_words)
    .map((r: any) => ({ ...r.vocabulary_words, repetitions: r.repetitions }))
}

/* ── Writes: SM-2-ish spaced repetition ─────────────────────────────────── */

function computeNext(prev: VocabProgress | null, result: SrsResult) {
  let ease = prev?.ease ?? 2.5
  let reps = prev?.repetitions ?? 0
  const prevInterval = prev?.interval_days ?? 0
  let interval: number
  let status: VocabStatus

  if (result === 'again') {
    ease = Math.max(1.3, ease - 0.2)
    reps = 0
    interval = 0 // re-show within the same session
    status = 'learning'
  } else if (result === 'hard') {
    ease = Math.max(1.3, ease - 0.15)
    reps += 1
    interval = Math.max(1, Math.round((prevInterval || 1) * 1.2))
    status = interval >= 21 ? 'learned' : 'learning'
  } else if (result === 'good') {
    reps += 1
    interval = reps <= 1 ? 1 : reps === 2 ? 3 : Math.round((prevInterval || 1) * ease)
    status = interval >= 7 ? 'learned' : 'learning'
  } else {
    // easy
    ease += 0.15
    reps += 1
    interval = Math.max(4, Math.round((prevInterval || 1) * ease * 1.3))
    status = 'learned'
  }

  const dueAt = new Date(Date.now() + interval * 86400000).toISOString()
  return { ease: Math.round(ease * 100) / 100, interval_days: interval, repetitions: reps, status, due_at: dueAt }
}

export async function reviewWord(userId: string, wordId: string, result: SrsResult): Promise<void> {
  const { data: prev } = await db()
    .from('user_vocabulary')
    .select('*')
    .eq('user_id', userId)
    .eq('word_id', wordId)
    .maybeSingle()

  const next = computeNext(prev ?? null, result)
  await db()
    .from('user_vocabulary')
    .upsert(
      {
        user_id: userId,
        word_id: wordId,
        ...next,
        last_result: result,
        reviewed_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,word_id' }
    )
}
