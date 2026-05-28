/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@/lib/supabase/client'
import type { UserAttempt, UserAnswer } from '@/lib/types/database'

function db() {
  return createClient() as any
}

export async function createAttempt(userId: string, testId: string): Promise<string | null> {
  const { data } = await db()
    .from('user_attempts')
    .insert({ user_id: userId, test_id: testId })
    .select('id')
    .single()
  return data?.id ?? null
}

export async function saveAnswer(attemptId: string, questionId: string, userAnswer: string | null) {
  await db()
    .from('user_answers')
    .upsert(
      { attempt_id: attemptId, question_id: questionId, user_answer: userAnswer },
      { onConflict: 'attempt_id,question_id' }
    )
}

export async function saveAnswerWithResult(
  attemptId: string,
  questionId: string,
  userAnswer: string | null,
  isCorrect: boolean
) {
  await db()
    .from('user_answers')
    .upsert(
      { attempt_id: attemptId, question_id: questionId, user_answer: userAnswer, is_correct: isCorrect },
      { onConflict: 'attempt_id,question_id' }
    )
}

export async function completeAttempt(
  attemptId: string,
  totalScore: number,
  bandScore: number,
  sectionScores: Record<string, unknown>
) {
  await db()
    .from('user_attempts')
    .update({
      completed_at: new Date().toISOString(),
      total_score: totalScore,
      band_score: bandScore,
      section_scores: sectionScores,
    })
    .eq('id', attemptId)
}

export async function getAttemptWithAnswers(attemptId: string) {
  const db_ = db()
  const [attempt, answers] = await Promise.all([
    db_.from('user_attempts').select('*').eq('id', attemptId).single(),
    db_.from('user_answers').select('*').eq('attempt_id', attemptId),
  ])
  return {
    attempt: attempt.data as UserAttempt | null,
    answers: (answers.data ?? []) as UserAnswer[],
  }
}

export async function saveBandScoreHistory(
  userId: string,
  skill: string,
  score: number,
  attemptId?: string
) {
  await db()
    .from('band_score_history')
    .insert({
      user_id: userId,
      skill,
      score,
      source: 'mock_test',
      source_id: attemptId ?? null,
    })
}
