import { NextRequest, NextResponse } from 'next/server'
/* eslint-disable @typescript-eslint/no-explicit-any */
import { getApiUser, err } from '@/lib/api/helpers'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

/**
 * Returns the correct answers for a COMPLETED attempt, and only to its owner.
 * This is the only path through which the browser ever receives correct_answer
 * for a scored test — strictly after the attempt is submitted.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  const user = await getApiUser()
  if (!user) return err('Unauthorized', 401)

  const { attemptId } = await params
  if (!attemptId) return err('attemptId is required', 400)

  const admin = createAdminClient() as any

  const { data: attempt } = await admin
    .from('user_attempts')
    .select('id, user_id, test_id, completed_at')
    .eq('id', attemptId)
    .single()

  if (!attempt || attempt.user_id !== user.id) return err('Not found', 404)
  if (!attempt.completed_at) return err('Attempt is not completed', 409)

  const { data: sections } = await admin
    .from('test_sections').select('id').eq('test_id', attempt.test_id)
  const sectionIds = (sections ?? []).map((s: any) => s.id)
  if (sectionIds.length === 0) return NextResponse.json({ correctAnswers: {} })

  const { data: questions } = await admin
    .from('questions').select('id, correct_answer').in('section_id', sectionIds)

  const correctAnswers: Record<string, string> = {}
  for (const q of (questions ?? []) as any[]) {
    correctAnswers[q.id] = q.correct_answer ?? ''
  }

  return NextResponse.json({ correctAnswers })
}
