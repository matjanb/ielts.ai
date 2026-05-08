import { NextResponse } from 'next/server'
import openai from '@/lib/openai/client'
import { createAdminClient } from '@/lib/supabase/admin'
import { getApiUser, canUseFeature, recordUsage, err } from '@/lib/api/helpers'

export async function POST() {
  const user = await getApiUser()
  if (!user) return err('Unauthorized', 401)

  const allowed = await canUseFeature(user.id, 'study_plan')
  if (!allowed) return err('Study plan regeneration limit reached. Upgrade to Pro for unlimited access.', 429)

  const admin = createAdminClient()

  // Load user's onboarding data
  const { data: od } = await admin
    .from('onboarding_data')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!od) return err('Onboarding data not found. Please complete onboarding first.', 400)

  const dailyMinutes = od.daily_hours === '30_min' ? 30
    : od.daily_hours === '1_hour' ? 60
    : od.daily_hours === '2_hours' ? 120
    : 180

  const weekCount = od.timeline === 'within_1_month' ? 4
    : od.timeline === '1_3_months' ? 8
    : od.timeline === '3_6_months' ? 12
    : 8

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are an expert IELTS tutor creating personalized study plans.
Create practical, achievable plans tailored to the student's profile.
Return ONLY valid JSON. Day tasks should be specific and actionable.`,
        },
        {
          role: 'user',
          content: `Create a ${weekCount}-week IELTS study plan for this student:

- Experience: ${od.experience ?? 'unknown'}
- Current level: ${od.current_level ?? 'intermediate'}
- Target band score: ${od.target_band ?? 7}
- Exam timeline: ${od.timeline ?? 'not_sure'}
- Focus skills: ${od.focus_skills?.join(', ') || 'all'}
- Study goal: ${od.study_goal ?? 'personal'}
- Available study time: ${dailyMinutes} minutes/day

Return JSON:
{
  "overview": "<2–3 sentence personalised summary of the plan>",
  "weekly_hours": <total weekly study hours>,
  "weeks": [
    {
      "week": 1,
      "theme": "<week theme, e.g. Foundation & Assessment>",
      "focus_skill": "<primary skill for this week>",
      "daily_tasks": [
        { "day": "Monday", "activity": "<specific activity>", "duration": "<X min>", "skill": "<skill>" },
        { "day": "Tuesday", "activity": "<specific activity>", "duration": "<X min>", "skill": "<skill>" },
        { "day": "Wednesday", "activity": "<specific activity>", "duration": "<X min>", "skill": "<skill>" },
        { "day": "Thursday", "activity": "<specific activity>", "duration": "<X min>", "skill": "<skill>" },
        { "day": "Friday", "activity": "<specific activity>", "duration": "<X min>", "skill": "<skill>" },
        { "day": "Weekend", "activity": "<mock test or review>", "duration": "<X min>", "skill": "mixed" }
      ],
      "weekly_goal": "<measurable goal for this week>",
      "tip": "<one motivational or strategic tip>"
    }
  ]
}

Generate all ${weekCount} weeks.`,
        },
      ],
      max_tokens: 4000,
      temperature: 0.5,
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    const plan = JSON.parse(raw)

    // Update study plan in Supabase
    await admin
      .from('study_plans')
      .upsert(
        {
          user_id:        user.id,
          weeks_duration: weekCount,
          target_band:    od.target_band ?? 7,
          focus_skills:   od.focus_skills ?? [],
          daily_minutes:  dailyMinutes,
          plan_data:      plan,
          updated_at:     new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )

    await recordUsage(user.id, 'study_plan')

    return NextResponse.json({ plan })
  } catch (e) {
    console.error('[AI study-plan]', e)
    return err('Failed to generate study plan. Please try again.', 500)
  }
}
