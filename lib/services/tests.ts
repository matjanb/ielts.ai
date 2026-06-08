/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@/lib/supabase/client'
import type { IeltsTest, TestSection, Question } from '@/lib/types/database'

function db() {
  return createClient()
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

// Columns safe to send to the browser DURING a test. Deliberately omits
// `correct_answer` so answers never reach the client before submission —
// grading happens server-side via /api/attempts/grade.
const SAFE_QUESTION_COLUMNS =
  'id, section_id, question_number, question_type, question_text, image_url, options, points, passage_text, passage_group'

/**
 * Load a test's questions WITHOUT the correct answers, for the live test UI.
 * Use this (not getQuestionsBySectionIds) anywhere a test is in progress.
 */
export async function getTestQuestions(sectionIds: string[]): Promise<Question[]> {
  if (sectionIds.length === 0) return []
  const { data } = await db()
    .from('questions')
    .select(SAFE_QUESTION_COLUMNS)
    .in('section_id', sectionIds)
    .order('question_number')
  // Intentionally omits correct_answer; treated as Question for rendering.
  return (data ?? []) as Question[]
}

export async function getListeningTests(): Promise<IeltsTest[]> {
  const { data } = await db()
    .from('tests')
    .select('id, title, book_number, test_number, difficulty, type, created_at')
    .eq('type', 'listening')
    .order('created_at', { ascending: true })
  return data ?? []
}

export async function getReadingTests(): Promise<IeltsTest[]> {
  const { data } = await db()
    .from('tests')
    .select('id, title, book_number, test_number, difficulty, type, created_at')
    .eq('type', 'reading')
    .order('created_at', { ascending: true })
  return data ?? []
}

export async function getWritingTests(): Promise<IeltsTest[]> {
  const { data } = await db()
    .from('tests')
    .select('id, title, book_number, test_number, difficulty, type, created_at')
    .eq('type', 'writing')
    .order('created_at', { ascending: true })
  return data ?? []
}

export async function getWritingPromptsForTest(testId: string): Promise<WritingPrompt[]> {
  const supabase = db()

  const { data: test } = await supabase
    .from('tests')
    .select('id, title')
    .eq('id', testId)
    .single()
  if (!test) return []

  const { data: sections } = await supabase
    .from('test_sections')
    .select('id, test_id, section_number, title')
    .eq('test_id', testId)
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

  return (questions ?? []).map((q: any): WritingPrompt => {
    const opts = (q.options ?? {}) as Record<string, unknown>
    const taskType: '1' | '2' = String(opts.task_type) === '1' ? '1' : '2'
    const section = sectionById.get(q.section_id)
    return {
      taskType,
      title: section?.title ?? `Task ${taskType}`,
      text: q.question_text,
      note: typeof opts.note === 'string' ? opts.note : '',
      minutes: typeof opts.minutes === 'number' ? opts.minutes : (taskType === '1' ? 20 : 40),
      minWords: typeof opts.min_words === 'number' ? opts.min_words : (taskType === '1' ? 150 : 250),
      imageUrl: q.image_url ?? null,
    }
  })
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
  multiple_choice:   'Multiple choice',
  true_false:        'True / False / Not Given',
  matching:          'Matching',
  matching_headings: 'Matching headings',
  fill_blank:        'Sentence / form completion',
  // Granular listening subtypes (from question_subtype).
  note_completion:       'Note completion',
  form_completion:       'Form completion',
  table_completion:      'Table completion',
  summary_completion:    'Summary completion',
  sentence_completion:   'Sentence completion',
  flow_chart_completion: 'Flow-chart completion',
  map_labelling:         'Map / plan labelling',
  diagram_labelling:     'Diagram labelling',
  short_answer:          'Short answer',
}

export function questionTypeLabel(type: string): string {
  return QTYPE_LABELS[type] ?? type
}

// Types that can't be practised as standalone drills: map/diagram labelling need
// the shared map/diagram image and letter answers, which only make sense inside
// the full test. They're excluded from the weak-spots drill list.
const NON_DRILLABLE = new Set(['map_labelling', 'diagram_labelling'])

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface PracticeFilters {
  /** Question types available for this skill, with how many questions exist. */
  types: { type: string; label: string; count: number }[]
  /** count[type][difficulty] — drives which difficulty chips are live per type. */
  countByTypeDifficulty: Record<string, Partial<Record<Difficulty, number>>>
}

/**
 * Which question types and difficulties actually exist for a skill — so the
 * drill config only ever offers real options (no empty/fabricated filters).
 */
export async function getPracticeFilters(skill: 'listening' | 'reading'): Promise<PracticeFilters> {
  const supabase = db()

  const { data: tests } = await supabase.from('tests').select('id').eq('type', skill)
  const testIds = (tests ?? []).map((t: any) => t.id)
  if (testIds.length === 0) return { types: [], countByTypeDifficulty: {} }

  const { data: sections } = await supabase
    .from('test_sections').select('id, difficulty').in('test_id', testIds)
  const diffBySection = new Map<string, Difficulty | null>(
    (sections ?? []).map((s: any) => [s.id, s.difficulty ?? null]),
  )
  const sectionIds = (sections ?? []).map((s: any) => s.id)
  if (sectionIds.length === 0) return { types: [], countByTypeDifficulty: {} }

  const { data: questions } = await supabase
    .from('questions').select('section_id, question_type, question_subtype').in('section_id', sectionIds)

  const total: Record<string, number> = {}
  const matrix: Record<string, Partial<Record<Difficulty, number>>> = {}
  for (const q of (questions ?? []) as any[]) {
    if (q.question_type === 'essay') continue
    // Effective type: the granular subtype (listening) when present, else the
    // coarse question_type (reading already has granular types).
    const type = q.question_subtype ?? q.question_type
    if (NON_DRILLABLE.has(type)) continue
    total[type] = (total[type] ?? 0) + 1
    const diff = diffBySection.get(q.section_id)
    if (diff) {
      matrix[type] ??= {}
      matrix[type][diff] = (matrix[type][diff] ?? 0) + 1
    }
  }

  const types = Object.entries(total)
    .map(([type, count]) => ({ type, label: questionTypeLabel(type), count }))
    .sort((a, b) => b.count - a.count)

  return { types, countByTypeDifficulty: matrix }
}

export interface PracticeGroup {
  sectionId: string
  title: string
  /** Reading passage body (sections store it in `instructions`). */
  passage: string | null
  audioUrl: string | null
  difficulty: Difficulty | null
  questions: Question[]
}

/**
 * Build a focused drill: every question of `questionType` for the skill, at the
 * chosen difficulty ('any' = all), grouped under its source passage/audio section
 * (needed for context), sections shuffled, capped to roughly `limit` questions.
 */
export async function getPracticeSet(opts: {
  skill: 'listening' | 'reading'
  questionType: string
  difficulty: Difficulty | 'any'
  limit: number
}): Promise<PracticeGroup[]> {
  const supabase = db()

  const { data: tests } = await supabase.from('tests').select('id').eq('type', opts.skill)
  const testIds = (tests ?? []).map((t: any) => t.id)
  if (testIds.length === 0) return []

  let sectionsQuery = supabase
    .from('test_sections')
    .select('id, title, instructions, audio_url, difficulty')
    .in('test_id', testIds)
  if (opts.difficulty !== 'any') sectionsQuery = sectionsQuery.eq('difficulty', opts.difficulty)
  const { data: sections } = await sectionsQuery
  const sectionList = (sections ?? []) as any[]
  if (sectionList.length === 0) return []

  const questions = await getQuestionsBySectionIds(sectionList.map(s => s.id))
  const bySection = new Map<string, Question[]>()
  for (const q of questions) {
    if (q.question_type !== opts.questionType) continue
    if (!bySection.has(q.section_id)) bySection.set(q.section_id, [])
    bySection.get(q.section_id)!.push(q)
  }

  // shuffle sections that actually have matching questions
  const usable = sectionList.filter(s => bySection.has(s.id))
  for (let i = usable.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[usable[i], usable[j]] = [usable[j], usable[i]]
  }

  const groups: PracticeGroup[] = []
  let count = 0
  for (const s of usable) {
    if (count >= opts.limit) break
    const qs = bySection.get(s.id)!
    groups.push({
      sectionId: s.id,
      title: s.title,
      passage: opts.skill === 'reading' ? (s.instructions ?? null) : null,
      audioUrl: s.audio_url ?? null,
      difficulty: s.difficulty ?? null,
      questions: qs,
    })
    count += qs.length
  }
  return groups
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
    .select('id, question_type, question_subtype')
    .in('id', questionIds)
  // Effective type: granular subtype (listening) when present, else question_type.
  const typeById = new Map<string, string>((questions ?? []).map((q: any) => [q.id, q.question_subtype ?? q.question_type]))

  // 5. Group by type
  const buckets: Record<string, { correct: number; total: number }> = {}
  for (const a of answers as any[]) {
    const qtype = typeById.get(a.question_id)
    if (!qtype || NON_DRILLABLE.has(qtype)) continue
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
