/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@/lib/supabase/client'
import type { IeltsTest, TestSection, Question } from '@/lib/types/database'

function db() {
  return createClient() as any
}

export async function getTestById(testId: string): Promise<IeltsTest | null> {
  const { data } = await db()
    .from('tests')
    .select('*')
    .eq('id', testId)
    .single()
  return data
}

export async function getSectionsByTestId(testId: string): Promise<TestSection[]> {
  const { data } = await db()
    .from('test_sections')
    .select('*')
    .eq('test_id', testId)
    .order('section_number')
  return data ?? []
}

export async function getQuestionsBySectionIds(sectionIds: string[]): Promise<Question[]> {
  const { data } = await db()
    .from('questions')
    .select('*')
    .in('section_id', sectionIds)
    .order('question_number')
  return data ?? []
}

export async function getListeningTests(): Promise<IeltsTest[]> {
  const { data } = await db()
    .from('tests')
    .select('id, title, book_number, test_number, difficulty')
    .eq('type', 'listening')
    .order('created_at', { ascending: true })
  return data ?? []
}

export async function getReadingTests(): Promise<IeltsTest[]> {
  const { data } = await db()
    .from('tests')
    .select('id, title, book_number, test_number, difficulty')
    .eq('type', 'reading')
    .order('created_at', { ascending: true })
  return data ?? []
}

export interface WritingPrompt {
  taskType: '1' | '2'
  title: string
  text: string
  note: string
  minutes: number
  minWords: number
  imageUrl: string | null
}

/**
 * Load Writing prompts from the seeded writing tests. Each task is one essay
 * question; task metadata (min words, suggested minutes, note) lives in the
 * question's `options` JSON. Returns [] if no writing test has been seeded.
 */
export async function getWritingPrompts(): Promise<WritingPrompt[]> {
  const supabase = db()

  const { data: tests } = await supabase
    .from('tests')
    .select('id, title')
    .eq('type', 'writing')
    .order('created_at', { ascending: true })
  const testIds = (tests ?? []).map((t: any) => t.id)
  if (testIds.length === 0) return []

  const { data: sections } = await supabase
    .from('test_sections')
    .select('id, test_id, section_number, title')
    .in('test_id', testIds)
    .order('section_number')
  const sectionIds = (sections ?? []).map((s: any) => s.id)
  if (sectionIds.length === 0) return []

  const { data: questions } = await supabase
    .from('questions')
    .select('section_id, question_text, options, image_url')
    .in('section_id', sectionIds)
    .eq('question_type', 'essay')
    .order('question_number')

  const sectionById = new Map<string, any>((sections ?? []).map((s: any) => [s.id, s]))
  const testTitleById = new Map<string, string>((tests ?? []).map((t: any) => [t.id, t.title]))

  return (questions ?? []).map((q: any): WritingPrompt => {
    const opts = (q.options ?? {}) as Record<string, unknown>
    const taskType: '1' | '2' = String(opts.task_type) === '1' ? '1' : '2'
    const section = sectionById.get(q.section_id)
    const testTitle = section ? testTitleById.get(section.test_id) ?? '' : ''
    return {
      taskType,
      title: testTitle ? `${testTitle} · ${section?.title ?? `Task ${taskType}`}` : (section?.title ?? `Task ${taskType}`),
      text: q.question_text,
      note: typeof opts.note === 'string' ? opts.note : '',
      minutes: typeof opts.minutes === 'number' ? opts.minutes : (taskType === '1' ? 20 : 40),
      minWords: typeof opts.min_words === 'number' ? opts.min_words : (taskType === '1' ? 150 : 250),
      imageUrl: q.image_url ?? null,
    }
  })
}

// Human-readable labels per DB question_type
const QTYPE_LABELS: Record<string, string> = {
  multiple_choice: 'Multiple choice',
  true_false:      'True / False / Not Given',
  matching:        'Matching',
  fill_blank:      'Sentence / form completion',
}

export interface SubskillStat { type: string; label: string; correct: number; total: number; accuracy: number }

/**
 * Real per-question-type accuracy for a skill, computed from the user's
 * completed attempts → answers → question types. Returns [] if no data yet.
 */
export async function getSubskillAccuracy(userId: string, skill: 'listening' | 'reading'): Promise<SubskillStat[]> {
  const supabase = db()

  // 1. Tests of this skill
  const { data: tests } = await supabase.from('tests').select('id').eq('type', skill)
  const testIds = (tests ?? []).map((t: any) => t.id)
  if (testIds.length === 0) return []

  // 2. This user's completed attempts on those tests
  const { data: attempts } = await supabase
    .from('user_attempts')
    .select('id')
    .eq('user_id', userId)
    .in('test_id', testIds)
    .not('completed_at', 'is', null)
  const attemptIds = (attempts ?? []).map((a: any) => a.id)
  if (attemptIds.length === 0) return []

  // 3. Answers for those attempts
  const { data: answers } = await supabase
    .from('user_answers')
    .select('question_id, is_correct')
    .in('attempt_id', attemptIds)
  if (!answers || answers.length === 0) return []

  // 4. Question types for those questions
  const questionIds = [...new Set((answers as any[]).map(a => a.question_id))]
  const { data: questions } = await supabase
    .from('questions')
    .select('id, question_type')
    .in('id', questionIds)
  const typeById = new Map<string, string>((questions ?? []).map((q: any) => [q.id, q.question_type]))

  // 5. Group by type
  const buckets: Record<string, { correct: number; total: number }> = {}
  for (const a of answers as any[]) {
    const qtype = typeById.get(a.question_id)
    if (!qtype) continue
    if (!buckets[qtype]) buckets[qtype] = { correct: 0, total: 0 }
    buckets[qtype].total++
    if (a.is_correct) buckets[qtype].correct++
  }

  return Object.entries(buckets)
    .map(([type, b]) => ({
      type,
      label: QTYPE_LABELS[type] ?? type,
      correct: b.correct,
      total: b.total,
      accuracy: b.total > 0 ? b.correct / b.total : 0,
    }))
    .sort((a, b) => a.accuracy - b.accuracy) // weakest first
}
