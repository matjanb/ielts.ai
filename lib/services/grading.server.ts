import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAnswerCorrect } from '@/lib/utils/answerChecking'
import { listeningRawToBand, readingRawToBand } from '@/lib/utils/bandScore'

/**
 * Server-side grading for scored Reading/Listening tests.
 *
 * Why this lives on the server: the correct answers must NEVER reach the
 * browser during a test, and the score must not be forgeable. The client sends
 * only the user's answers; we read the authoritative `correct_answer` column
 * with the service-role key, grade against the full question set, and persist
 * the attempt. Correct answers are returned only here (post-submission) so the
 * results page can reveal them.
 */

export type GradeSkill = 'reading' | 'listening'

export interface GradeAttemptInput {
  userId: string
  testId: string
  skill: GradeSkill
  /** questionId -> the user's answer */
  answers: Record<string, string>
  /** Optional attempt created at test start; reused only if it belongs to this user+test. */
  attemptId?: string | null
  durationSeconds?: number
}

export interface GradedQuestion {
  questionId: string
  userAnswer: string | null
  isCorrect: boolean
  correctAnswer: string | null
}

export interface GradeResult {
  attemptId: string | null
  score: number
  band: number
  sections: Record<number, { correct: number; total: number }>
  results: GradedQuestion[]
  /** True when this attempt was already graded; saved result returned, nothing re-inserted. */
  replay?: boolean
}

export async function gradeAttempt(input: GradeAttemptInput): Promise<GradeResult> {
  const { userId, testId, skill, answers } = input
  const admin = createAdminClient()

  // The test must exist and match the requested skill (defence against grading
  // a listening test as reading, etc.).
  const { data: test } = await admin.from('tests').select('id, type').eq('id', testId).single()
  if (!test) throw new Error('Test not found')
  if (test.type !== skill) throw new Error('Test/skill mismatch')

  // Every fetch below must be error-checked: a failed query returns data=null,
  // and treating that as "no rows" would grade the attempt as 0/40 and persist
  // the floor band into the user's history.
  const { data: sections, error: sectionsError } = await admin
    .from('test_sections').select('id, section_number').eq('test_id', testId)
  if (sectionsError) throw new Error(`Failed to load test sections: ${sectionsError.message}`)
  const sectionNumberById = new Map<string, number>(
    (sections ?? []).map(s => [s.id, s.section_number]),
  )
  const sectionIds = (sections ?? []).map(s => s.id)
  if (sectionIds.length === 0) throw new Error('Test has no sections')

  // Authoritative question set WITH the correct answers — server-only.
  const { data: questions, error: questionsError } = await admin
    .from('questions')
    .select('id, section_id, correct_answer')
    .in('section_id', sectionIds)
  if (questionsError) throw new Error(`Failed to load questions: ${questionsError.message}`)
  if (!questions || questions.length === 0) throw new Error('Test has no questions')

  // Idempotency guard: if this attempt was already graded, return the saved
  // result and skip every insert. A retried/duplicated POST must not append
  // duplicate band_score_history/study_sessions rows or re-meter usage.
  let attemptId: string | null = null
  if (input.attemptId) {
    const { data: existing, error: existingError } = await admin
      .from('user_attempts')
      .select('id, user_id, test_id, completed_at, total_score, band_score, section_scores')
      .eq('id', input.attemptId)
      .maybeSingle()
    if (existingError) throw new Error(`Failed to load attempt: ${existingError.message}`)
    // Reuse the start-of-test attempt only if it genuinely belongs to this
    // user+test; otherwise create a fresh one.
    if (existing && existing.user_id === userId && existing.test_id === testId) {
      if (existing.completed_at) {
        const { data: savedAnswers, error: savedError } = await admin
          .from('user_answers')
          .select('question_id, user_answer, is_correct')
          .eq('attempt_id', existing.id)
        if (savedError) throw new Error(`Failed to load saved answers: ${savedError.message}`)
        const savedByQuestion = new Map(
          (savedAnswers ?? []).map(a => [a.question_id, a]),
        )
        return {
          attemptId: existing.id,
          score: existing.total_score ?? 0,
          band: existing.band_score ?? 0,
          sections: (existing.section_scores ?? {}) as GradeResult['sections'],
          results: questions.map(q => {
            const saved = savedByQuestion.get(q.id)
            return {
              questionId: q.id,
              userAnswer: saved?.user_answer ?? null,
              isCorrect: saved?.is_correct ?? false,
              correctAnswer: q.correct_answer ?? null,
            }
          }),
          replay: true,
        }
      }
      attemptId = existing.id
    }
  }

  let totalCorrect = 0
  const sectionTally: Record<number, { correct: number; total: number }> = {}
  const results: GradedQuestion[] = []

  // Iterate the DB question set (not the client payload) so a client can't omit
  // questions to inflate its percentage.
  for (const q of questions) {
    const n = sectionNumberById.get(q.section_id) ?? 0
    if (!sectionTally[n]) sectionTally[n] = { correct: 0, total: 0 }
    sectionTally[n].total++
    const userAnswer = typeof answers[q.id] === 'string' ? answers[q.id] : null
    const isCorrect = isAnswerCorrect(userAnswer ?? '', q.correct_answer ?? '')
    if (isCorrect) { totalCorrect++; sectionTally[n].correct++ }
    results.push({ questionId: q.id, userAnswer, isCorrect, correctAnswer: q.correct_answer ?? null })
  }

  // Reading and Listening use their own official 40-question raw→band tables
  // (they differ by up to half a band in the middle of the scale).
  const band = skill === 'reading' ? readingRawToBand(totalCorrect) : listeningRawToBand(totalCorrect)

  if (!attemptId) {
    const { data: created, error: createError } = await admin
      .from('user_attempts').insert({ user_id: userId, test_id: testId }).select('id').single()
    if (createError) throw new Error(`Failed to create attempt: ${createError.message}`)
    attemptId = created?.id ?? null
  }

  if (attemptId) {
    const minutes = input.durationSeconds && input.durationSeconds > 0
      ? Math.max(1, Math.round(input.durationSeconds / 60))
      : (skill === 'reading' ? 60 : 30)

    const answerRows = results.map(r => ({
      attempt_id: attemptId,
      question_id: r.questionId,
      user_answer: r.userAnswer,
      is_correct: r.isCorrect,
    }))

    const [answersRes, attemptRes, historyRes, sessionRes] = await Promise.all([
      answerRows.length
        ? admin.from('user_answers').upsert(answerRows, { onConflict: 'attempt_id,question_id' })
        : Promise.resolve({ error: null }),
      admin.from('user_attempts').update({
        completed_at: new Date().toISOString(),
        total_score: totalCorrect,
        band_score: band,
        section_scores: sectionTally,
      }).eq('id', attemptId),
      admin.from('band_score_history').insert({
        user_id: userId, skill, score: band, source: 'mock_test', source_id: attemptId,
      }),
      admin.from('study_sessions').insert({
        user_id: userId, skill, activity_type: 'mock_test', duration_minutes: minutes,
      }),
    ])
    // The attempt row is the source of truth (and the idempotency marker) —
    // failing to persist it must fail the request so the client retries.
    if (attemptRes.error) throw new Error(`Failed to save attempt: ${attemptRes.error.message}`)
    for (const [name, res] of [['user_answers', answersRes], ['band_score_history', historyRes], ['study_sessions', sessionRes]] as const) {
      if (res.error) console.error(`[gradeAttempt] ${name} insert failed:`, res.error.message)
    }
  }

  return { attemptId, score: totalCorrect, band, sections: sectionTally, results }
}
