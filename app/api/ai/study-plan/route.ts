/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import openai from '@/lib/openai/client'
import { createAdminClient } from '@/lib/supabase/admin'
import { getApiUser, hasActiveSubscription, recordUsage, enforceAiLimits, err } from '@/lib/api/helpers'

/* Strict JSON schema — keeps the model's output in lockstep with what the page
 * renders. `qtype` lets a reading/listening task deep-link straight into the
 * matching targeted-practice drill. */
const TASK = {
  type: 'object', additionalProperties: false,
  required: ['day', 'skill', 'activity', 'minutes', 'qtype'],
  properties: {
    day: { type: 'string', description: 'Monday–Friday, or "Weekend"' },
    skill: { type: 'string', enum: ['listening', 'reading', 'writing', 'speaking', 'vocabulary', 'mock', 'grammar', 'review'] },
    activity: { type: 'string', description: 'Specific, actionable task' },
    minutes: { type: 'integer', description: 'Estimated minutes for this task' },
    qtype: { type: 'string', description: 'For a reading/listening drill, the exact question-type id to practise (true_false, multiple_choice, matching, matching_headings, fill_blank). Empty string "" for any other task.' },
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

const QT_READABLE: Record<string, string> = {
  true_false: 'True/False/Not Given', multiple_choice: 'Multiple choice',
  matching: 'Matching', matching_headings: 'Matching headings', fill_blank: 'Sentence/note completion',
  note_completion: 'Note completion', form_completion: 'Form completion', table_completion: 'Table completion',
  summary_completion: 'Summary completion', sentence_completion: 'Sentence completion',
  flow_chart_completion: 'Flow-chart completion', map_labelling: 'Map/plan labelling',
  diagram_labelling: 'Diagram labelling', short_answer: 'Short answer',
}
const WRITING_CRITERIA = [
  { key: 'task_achievement', label: 'Task Achievement/Response' },
  { key: 'coherence_cohesion', label: 'Coherence & Cohesion' },
  { key: 'lexical_resource', label: 'Lexical Resource' },
  { key: 'grammatical_accuracy', label: 'Grammatical Range & Accuracy' },
] as const

export async function POST() {
  const user = await getApiUser()
  if (!user) return err('Unauthorized', 401)

  const allowed = await hasActiveSubscription(user.id)
  if (!allowed) return err('Subscription required.', 403)

  const limited = await enforceAiLimits(user.id, 'study_plan')
  if (limited) return limited

  const admin = createAdminClient()
  const userId = user.id

  // Onboarding is optional — fall back to sensible defaults.
  const { data: odRow } = await admin
    .from('onboarding_data').select('*').eq('user_id', user.id).maybeSingle()
  const od: any = odRow ?? {}

  // Target band: profiles.target_band_score is the single source of truth (what
  // Settings updates and the dashboard reads). Fall back to onboarding, then 7.
  const { data: profileRow } = await admin
    .from('profiles').select('target_band_score').eq('id', user.id).maybeSingle()
  const targetBand = profileRow?.target_band_score ?? od.target_band ?? 7

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

  // ── Latest measured band per skill ──
  const { data: history } = await admin
    .from('band_score_history')
    .select('skill, score, recorded_at')
    .eq('user_id', user.id)
    .order('recorded_at', { ascending: false })
    .limit(60)
  const latestBySkill: Record<string, number> = {}
  for (const row of history ?? []) {
    if (latestBySkill[row.skill] === undefined) latestBySkill[row.skill] = Number(row.score)
  }
  const progressLine = Object.keys(latestBySkill).length
    ? `Recent measured band scores (most recent first): ${Object.entries(latestBySkill).map(([s, v]) => `${s} ${v}`).join(', ')}.`
    : 'No measured scores yet — start with a diagnostic-style assessment in week 1.'

  // Focus = the two weakest *measured* skills (overrides the onboarding "stated"
  // focus); fall back to onboarding focus, then an even spread.
  type CoreSkill = 'listening' | 'reading' | 'writing' | 'speaking'
  const CORE: CoreSkill[] = ['listening', 'reading', 'writing', 'speaking']
  const measuredWeak = CORE.filter(s => latestBySkill[s] !== undefined).sort((a, b) => latestBySkill[a] - latestBySkill[b])
  const onboardingFocus: CoreSkill[] = (Array.isArray(od.focus_skills) ? od.focus_skills : [])
    .filter((s: unknown): s is CoreSkill => CORE.includes(s as CoreSkill))
  const focusSkills: CoreSkill[] = measuredWeak.length ? measuredWeak.slice(0, 2) : onboardingFocus

  // ── Weakest question types in reading & listening (from real answers) ──
  async function weakTypes(skill: 'reading' | 'listening') {
    const { data: tests } = await admin.from('tests').select('id').eq('type', skill)
    const testIds = (tests ?? []).map(t => t.id)
    if (!testIds.length) return [] as { type: string; accuracy: number }[]
    const { data: attempts } = await admin
      .from('user_attempts').select('id').eq('user_id', userId).in('test_id', testIds).not('completed_at', 'is', null)
    const attemptIds = (attempts ?? []).map(a => a.id)
    if (!attemptIds.length) return []
    const { data: answers } = await admin
      .from('user_answers').select('question_id, is_correct').in('attempt_id', attemptIds)
    if (!answers?.length) return []
    const qIds = [...new Set(answers.map(a => a.question_id))]
    const { data: questions } = await admin.from('questions').select('id, question_type, question_subtype').in('id', qIds)
    // Effective type: granular listening subtype when present, else question_type.
    const typeById = new Map((questions ?? []).map(q => [q.id, q.question_subtype ?? q.question_type]))
    const bucket: Record<string, { c: number; t: number }> = {}
    for (const a of answers) {
      const qt = typeById.get(a.question_id); if (!qt) continue
      const b = (bucket[qt] ??= { c: 0, t: 0 }); b.t++; if (a.is_correct) b.c++
    }
    // map/diagram labelling can't be drilled standalone (they need the shared
    // map image), so never surface them as a weak-type drill target.
    const NON_DRILLABLE = new Set(['map_labelling', 'diagram_labelling'])
    return Object.entries(bucket)
      .map(([type, b]) => ({ type, accuracy: b.c / b.t, total: b.t }))
      .filter(b => b.total >= 4 && b.accuracy < 0.7 && !NON_DRILLABLE.has(b.type))
      .sort((a, b) => a.accuracy - b.accuracy)
  }
  const [readWeak, listenWeak] = await Promise.all([weakTypes('reading'), weakTypes('listening')])
  const fmtTypes = (rows: { type: string; accuracy: number }[]) =>
    rows.slice(0, 3).map(r => `${QT_READABLE[r.type] ?? r.type} [id:${r.type}] (${Math.round(r.accuracy * 100)}%)`).join(', ')
  const qtypeLines: string[] = []
  if (readWeak.length) qtypeLines.push(`Reading weak question types: ${fmtTypes(readWeak)}.`)
  if (listenWeak.length) qtypeLines.push(`Listening weak question types: ${fmtTypes(listenWeak)}.`)

  // ── Weakest writing criteria (from graded essays) ──
  const { data: ws } = await admin
    .from('writing_submissions')
    .select('task_achievement, coherence_cohesion, lexical_resource, grammatical_accuracy')
    .eq('user_id', user.id).order('created_at', { ascending: false }).limit(20)
  const writingWeak = WRITING_CRITERIA
    .map(c => {
      const vals = (ws ?? []).map(r => (r as any)[c.key]).filter((v: any) => typeof v === 'number') as number[]
      return vals.length ? { label: c.label as string, avg: vals.reduce((a, b) => a + b, 0) / vals.length } : null
    })
    .filter((x): x is { label: string; avg: number } => x !== null)
    .sort((a, b) => a.avg - b.avg)
  const writingLine = writingWeak.length
    ? `Weakest writing criteria: ${writingWeak.slice(0, 2).map(w => `${w.label} (avg ${w.avg.toFixed(1)})`).join(', ')}.`
    : ''

  const weakBlock = [
    focusSkills.length ? `Center the plan on these weakest skills (most time, daily practice, earliest weeks): ${focusSkills.join(', ')}.` : 'No measured weaknesses yet — cover all four skills evenly and assess early.',
    ...qtypeLines,
    writingLine,
    qtypeLines.length ? 'For reading/listening drill tasks targeting a weak question type, set that task\'s qtype to the exact id shown in [id:...] so the student is taken straight to that drill.' : '',
  ].filter(Boolean).join('\n')

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
Weight time toward the student's weakest skills and their specific weak question types. Include at least one full mock test and regular review/vocabulary sessions across the plan.`,
        },
        {
          role: 'user',
          content: `Create a ${weekCount}-week IELTS study plan.

Student profile:
- Experience: ${od.experience ?? 'unknown'}
- Current level: ${od.current_level ?? 'intermediate'}
- Target band: ${targetBand}
- Timeline: ${od.timeline ?? 'not_sure'}
- Study goal: ${od.study_goal ?? 'personal'}
- Available time: ${dailyMinutes} minutes/day

${progressLine}
${weakBlock}

Produce exactly ${weekCount} weeks. Each week has 6 day entries: Monday–Friday plus one "Weekend" entry (a mock test or consolidation). Keep each day's minutes near ${dailyMinutes}. Set qtype to "" for any task that is not a reading/listening drill of a specific question type.`,
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
          target_band:    targetBand,
          focus_skills:   focusSkills,
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
    return NextResponse.json(saved)
  } catch (e) {
    console.error('[AI study-plan]', e)
    return err('Failed to generate study plan. Please try again.', 500)
  }
}
