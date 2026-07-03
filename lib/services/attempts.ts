 
import { createClient } from '@/lib/supabase/client'
import type { UserAttempt, UserAnswer, SkillType } from '@/lib/types/database'

function db() {
  return createClient()
}

/** Log a completed study activity so streak & study-time stats reflect real usage. */
export async function logStudySession(
  userId: string,
  skill: string,
  durationMinutes: number,
  activityType = 'practice'
) {
  await db()
    .from('study_sessions')
    .insert({
      user_id: userId,
      skill: skill as SkillType,
      activity_type: activityType,
      duration_minutes: Math.max(1, Math.round(durationMinutes)),
    })
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

