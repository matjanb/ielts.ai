/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import openai from '@/lib/openai/client'
import { createAdminClient } from '@/lib/supabase/admin'
import { getApiUser, hasActiveSubscription, recordUsage, enforceAiLimits, err } from '@/lib/api/helpers'

export const runtime = 'nodejs'

// Personalised coaching plan synthesised from the student's recent grades and
// the recurring errors the grader recorded — not generic advice.
const SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['focus', 'tips'],
  properties: {
    focus: { type: 'string', description: 'One sentence: the single most important thing to work on next' },
    tips: { type: 'array', items: { type: 'string' }, description: '3–4 specific, actionable tips targeting recurring weaknesses' },
  },
} as const

export async function POST() {
  const user = await getApiUser()
  if (!user) return err('Unauthorized', 401)
  if (!(await hasActiveSubscription(user.id))) return err('Subscription required.', 403)
  const limited = await enforceAiLimits(user.id, 'writing_coach')
  if (limited) return limited

  const admin = createAdminClient()
  const { data: subs } = await admin
    .from('writing_submissions')
    .select('task_achievement, coherence_cohesion, lexical_resource, grammatical_accuracy, ai_feedback, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)
  const rows = (subs ?? []) as any[]
  if (rows.length === 0) return NextResponse.json({ empty: true })

  const avg = (k: string): number | null => {
    const v = rows.map(r => r[k]).filter((x: any) => typeof x === 'number') as number[]
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
  }
  const errorTypes: Record<string, number> = {}
  const sampleErrors: string[] = []
  const improvements: string[] = []
  for (const r of rows) {
    try {
      const fb = typeof r.ai_feedback === 'string' ? JSON.parse(r.ai_feedback) : r.ai_feedback
      for (const c of (fb?.corrections ?? [])) {
        if (c?.type) errorTypes[c.type] = (errorTypes[c.type] ?? 0) + 1
        if (sampleErrors.length < 8 && c?.quote) sampleErrors.push(`"${c.quote}" → "${c.fix}"`)
      }
      for (const im of (fb?.improvements ?? [])) {
        if (improvements.length < 8 && typeof im === 'string') improvements.push(im)
      }
    } catch { /* skip unparseable feedback */ }
  }

  const fmt = (n: number | null) => (n == null ? 'n/a' : n.toFixed(1))
  const profile = `Essays graded: ${rows.length}
Average bands — Task: ${fmt(avg('task_achievement'))}, Coherence & Cohesion: ${fmt(avg('coherence_cohesion'))}, Lexical Resource: ${fmt(avg('lexical_resource'))}, Grammar: ${fmt(avg('grammatical_accuracy'))}
Most frequent error types: ${Object.entries(errorTypes).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} (${v})`).join(', ') || 'none recorded'}
Recurring mistakes (their words → fix):
${sampleErrors.map(s => '- ' + s).join('\n') || '- none recorded'}
Past improvement notes:
${improvements.map(s => '- ' + s).join('\n') || '- none'}`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      max_tokens: 700,
      response_format: { type: 'json_schema', json_schema: { name: 'writing_coach', strict: true, schema: SCHEMA } },
      messages: [
        {
          role: 'system',
          content: `You are an experienced IELTS writing coach. From the student's recent grading history (band averages, most frequent error types, and real example mistakes), produce a short personalised plan. Prioritise their lowest criterion and the errors that recur most. Each tip must be specific and actionable — say what to practise and how, and reference their actual recurring mistakes where possible. No generic filler.`,
        },
        { role: 'user', content: profile },
      ],
    })
    const result = JSON.parse(completion.choices[0]?.message?.content ?? '{}')
    await recordUsage(user.id, 'writing_coach')
    return NextResponse.json(result)
  } catch (e) {
    console.error('[AI writing-coach]', e)
    return err('Failed to generate advice. Please try again.', 500)
  }
}
