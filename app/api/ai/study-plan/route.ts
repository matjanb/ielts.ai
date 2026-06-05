import { NextResponse } from 'next/server'
import openai from '@/lib/openai/client'
import { createAdminClient } from '@/lib/supabase/admin'
import { getApiUser, hasActiveSubscription, recordUsage, err } from '@/lib/api/helpers'

/* Strict JSON schema — keeps the model's output in lockstep with what the
 * page renders (week.tasks[], each with day/skill/activity/minutes). */
const TASK = {
  type: 'object', additionalProperties: false,
  required: ['day', 'skill', 'activity', 'minutes'],
  properties: {
    day: { type: 'string', description: 'Monday–Friday, or "Weekend"' },
    skill: { type: 'string', enum: ['listening', 'reading', 'writing', 'speaking', 'vocabulary', 'mock', 'grammar', 'review'] },
    activity: { type: 'string', description: 'Specific, actionable task' },
    minutes: { type: 'integer', description: 'Estimated minutes for this task' },
  },
} as const

const WEEK = {
  type: 'object', additionalProperties: false,
  required: ['week', 'theme', 'focus_skill', 'weekly_goal', 'tip', 'tasks'],
  properties: {
    week: { type: 'integer' },
    theme: { type: 'string', description: 'Short week theme, e.g. "Foundation & assessment"' },
    focus_skill: { type: 'string', enum: ['listening', 'reading', 'writing', 'speaking', 'vocabulary', 'mixed'] },
    weekly_goal: { type: 'string', description: 'One measurable goal for the week' },
    tip: { type: 'string', description: 'One strategic or motivational tip' },
    tasks: { type: 'array', items: TASK },
  },
} as const

const PLAN_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['overview', 'weeks'],
  properties: {
    overview: { type: 'string', description: '2–3 sentence personalised summary of the plan' },
    weeks: { type: 'array', items: WEEK },
  },
} as const

export async function POST() {
  const user = await getApiUser()
  if (!user) return err('Unauthorized', 401)

  const allowed = await hasActiveSubscription(user.id)
  if (!allowed) return err('Subscription required.', 403)

  const admin = createAdminClient()

  // Onboarding is optional — fall back to sensible defaults so anyone can
  // generate a plan even if they skipped (or never completed) onboarding.
  const { data: odRow } = await admin
    .from('onboarding_data')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const od: any = odRow ?? {}

  const dailyMinutes = !od.daily_hours ? 60
    : od.daily_hours === '30_min' ? 30
    : od.daily_hours === '1_hour' ? 60
    : od.daily_hours === '2_hours' ? 120
    : 180

  const weekCount = !od.timeline ? 8
    : od.timeline === 'within_1_month' ? 4
    : od.timeline === '1_3_months' ? 8
    : od.timeline === '3_6_months' ? 12
    : 8

  // ── Adaptive context: latest real band per skill from the app's history ──
  const { data: history } = await admin
    .from('band_score_history')
    .select('skill, score, recorded_at')
    .eq('user_id', user.id)
    .order('recorded_at', { ascending: false })
    .limit(40)

  const latestBySkill: Record<string, number> = {}
  for (const row of history ?? []) {
    if (latestBySkill[row.skill] === undefined) latestBySkill[row.skill] = Number(row.score)
  }
  const progressLine = Object.keys(latestBySkill).length
    ? `Recent measured band scores (most recent first): ${Object.entries(latestBySkill).map(([s, v]) => `${s} ${v}`).join(', ')}. Prioritise the lowest-scoring skills.`
    : 'No measured scores yet — start with a diagnostic-style assessment in week 1.'

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.4,
      max_tokens: 4000,
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'ielts_study_plan', strict: true, schema: PLAN_SCHEMA },
      },
      messages: [
        {
          role: 'system',
          content: `You are an expert IELTS tutor who builds practical, week-by-week study plans.
Every task must be specific and actionable (what to do, which skill, how long), and the total daily load must stay close to the student's available time.
Weight time toward the student's weakest skills. Include at least one full mock test and regular review/vocabulary sessions across the plan.`,
        },
        {
          role: 'user',
          content: `Create a ${weekCount}-week IELTS study plan.

Student profile:
- Experience: ${od.experience ?? 'unknown'}
- Current level: ${od.current_level ?? 'intermediate'}
- Target band: ${od.target_band ?? 7}
- Timeline: ${od.timeline ?? 'not_sure'}
- Stated focus skills: ${od.focus_skills?.join(', ') || 'all'}
- Study goal: ${od.study_goal ?? 'personal'}
- Available time: ${dailyMinutes} minutes/day

${progressLine}

Produce exactly ${weekCount} weeks. Each week has 6 day entries: Monday–Friday plus one "Weekend" entry (a mock test or consolidation). Keep each day's minutes near ${dailyMinutes}.`,
        },
      ],
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    const plan = JSON.parse(raw)

    const { data: saved, error: saveErr } = await admin
      .from('study_plans')
      .upsert(
        {
          user_id:        user.id,
          weeks_duration: weekCount,
          target_band:    od.target_band ?? 7,
          focus_skills:   od.focus_skills ?? [],
          daily_minutes:  dailyMinutes,
          plan_data:      plan,
          started_at:     new Date().toISOString().slice(0, 10),
          progress:       {},
          updated_at:     new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single()

    if (saveErr) {
      console.error('[AI study-plan] save', saveErr)
      return err('Failed to save the study plan. Please try again.', 500)
    }

    await recordUsage(user.id, 'study_plan')

    // Return the full saved row so the client can render immediately.
    return NextResponse.json(saved)
  } catch (e) {
    console.error('[AI study-plan]', e)
    return err('Failed to generate study plan. Please try again.', 500)
  }
}
