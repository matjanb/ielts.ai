import { NextRequest, NextResponse } from 'next/server'
import { getApiUser, canUseAiFeature, recordUsage, err } from '@/lib/api/helpers'
import { gradeAttempt, type GradeSkill } from '@/lib/services/grading.server'

export const runtime = 'nodejs'

const MAX_ANSWERS = 200
const MAX_ANSWER_LEN = 500

export async function POST(request: NextRequest) {
  const user = await getApiUser()
  if (!user) return err('Unauthorized', 401)

  let body: {
    testId?: string
    skill?: string
    answers?: Record<string, unknown>
    attemptId?: string | null
    durationSeconds?: number
  }
  try {
    body = await request.json()
  } catch {
    return err('Invalid request body', 400)
  }

  const { testId, skill } = body
  if (!testId || (skill !== 'reading' && skill !== 'listening')) {
    return err('testId and a valid skill (reading|listening) are required', 400)
  }

  // Free users get one Reading and one Listening test (their slice of the single
  // free mock); after that the skill is paid. Recorded below so it counts once.
  if (!(await canUseAiFeature(user.id, skill))) return err('Subscription required.', 403)
  if (typeof body.answers !== 'object' || body.answers === null || Array.isArray(body.answers)) {
    return err('answers must be an object of questionId -> answer', 400)
  }

  const entries = Object.entries(body.answers)
  if (entries.length > MAX_ANSWERS) return err('Too many answers', 400)

  // Coerce + clamp every submitted answer so a malicious client can't push huge
  // payloads through to grading.
  const answers: Record<string, string> = {}
  for (const [questionId, value] of entries) {
    if (typeof questionId !== 'string' || questionId.length > 64) continue
    if (value == null) continue
    answers[questionId] = String(value).slice(0, MAX_ANSWER_LEN)
  }

  const durationSeconds =
    typeof body.durationSeconds === 'number' && body.durationSeconds > 0 && body.durationSeconds < 86_400
      ? body.durationSeconds
      : undefined

  try {
    const result = await gradeAttempt({
      userId: user.id,
      testId,
      skill: skill as GradeSkill,
      answers,
      attemptId: typeof body.attemptId === 'string' ? body.attemptId : null,
      durationSeconds,
    })
    // Meter the free allowance (also harmless for subscribers, whose caps are ignored).
    await recordUsage(user.id, skill)
    return NextResponse.json(result)
  } catch (e) {
    console.error('[attempts/grade]', e)
    return err('Failed to grade attempt. Please try again.', 500)
  }
}
