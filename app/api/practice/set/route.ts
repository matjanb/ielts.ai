import { NextRequest, NextResponse } from 'next/server'
import { getApiUser, hasActiveSubscription, err } from '@/lib/api/helpers'
import { getPracticeSetServer } from '@/lib/services/practice.server'
import type { Difficulty } from '@/lib/services/tests'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const user = await getApiUser()
  if (!user) return err('Unauthorized', 401)

  // Standalone practice drills are a paid feature. The free tier is exactly one
  // full mock (taken through the test pages), nothing else.
  if (!(await hasActiveSubscription(user.id))) return err('Subscription required.', 403)

  let body: { skill?: string; questionType?: string; difficulty?: string; limit?: number }
  try {
    body = await request.json()
  } catch {
    return err('Invalid request body', 400)
  }

  const { skill, questionType } = body
  if ((skill !== 'reading' && skill !== 'listening') || !questionType) {
    return err('skill (reading|listening) and questionType are required', 400)
  }

  const difficulty: Difficulty | 'any' =
    body.difficulty === 'easy' || body.difficulty === 'medium' || body.difficulty === 'hard'
      ? body.difficulty
      : 'any'
  const limit = typeof body.limit === 'number' && body.limit > 0 ? Math.min(body.limit, 9999) : 10

  try {
    const groups = await getPracticeSetServer({ skill, questionType, difficulty, limit })
    return NextResponse.json({ groups })
  } catch (e) {
    console.error('[practice/set]', e)
    return err('Failed to build practice set. Please try again.', 500)
  }
}
