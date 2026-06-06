import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAnswerCorrect } from '@/lib/utils/answerChecking'
import { listeningRawToBand } from '@/lib/utils/bandScore'

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
}

export async function gradeAttempt(input: GradeAttemptInput): Promise<GradeResult> {
  const { userId, testId, skill, answers } = input
  const admin = createAdminClient()

  // The test must exist and match the requested skill (defence against grading
  // a listening test as reading, etc.).
  const { data: test } = await admin.from('tests').select('id, type').eq('id', testId).single()
  if (!test) throw new Error('Test not found')
  if (test.type !== skill) throw new Error('Test/skill mismatch')

  const { data: sections } = await admin
    .from('test_sections').select('id, section_number').eq('test_id', testId)
  const sectionNumberById = new Map<string, number>(
    (sections ?? []).map(s => [s.id, s.section_number]),
  )
  const sectionIds = (sections ?? []).map(s => s.id)
  if (sectionIds.length === 0) throw new Error('Test has no sections')

  // Authoritative question set WITH the correct answers — server-only.
  const { data: questions } = await admin
    .from('questions')
    .select('id, section_id, correct_answer')
    .in('section_id', sectionIds)

  let totalCorrect = 0
  const sectionTally: Record<number, { correct: number; total: number }> = {}
  const results: GradedQuestion[] = []

  // Iterate the DB question set (not the client payload) so a client can't omit
  // questions to inflate its percentage.
  for (const q of questions ?? []) {
    const n = sectionNumberById.get(q.section_id) ?? 0
    if (!sectionTally[n]) sectionTally[n] = { correct: 0, total: 0 }
    sectionTally[n].total++
    const userAnswer = typeof answers[q.id] === 'string' ? answers[q.id] : null
    const isCorrect = isAnswerCorrect(userAnswer ?? '', q.correct_answer ?? '')
    if (isCorrect) { totalCorrect++; sectionTally[n].correct++ }
    results.push({ questionId: q.id, userAnswer, isCorrect, correctAnswer: q.correct_answer ?? null })
  }

  // Reading & Listening share the same 40-question raw→band conversion.
  const band = listeningRawToBand(totalCorrect)

  // Reuse the start-of-test attempt only if it genuinely belongs to this
  // user+test; otherwise create a fresh one.
  let attemptId: string | null = null
  if (input.attemptId) {
    const { data: existing } = await admin
      .from('user_attempts').select('id, user_id, test_id').eq('id', input.attemptId).single()
    if (existing && existing.user_id === userId && existing.test_id === testId) {
      attemptId = existing.id
    }
  }
  if (!attemptId) {
    const { data: created } = await admin
      .from('user_attempts').insert({ user_id: userId, test_id: testId }).select('id').single()
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

    await Promise.all([
      answerRows.length
        ? admin.from('user_answers').upsert(answerRows, { onConflict: 'attempt_id,question_id' })
        : Promise.resolve(),
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
  }

  return { attemptId, score: totalCorrect, band, sections: sectionTally, results }
}
