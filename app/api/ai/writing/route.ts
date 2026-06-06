import { NextRequest, NextResponse } from 'next/server'
import openai from '@/lib/openai/client'
import { createAdminClient } from '@/lib/supabase/admin'
import { getApiUser, hasActiveSubscription, recordUsage, enforceAiLimits, err } from '@/lib/api/helpers'
import { WRITING_TASK1_RUBRIC, WRITING_TASK2_RUBRIC, EXAMINER_PERSONA } from '@/lib/ielts/rubrics'
import { clampBand, overallBand } from '@/lib/ielts/band'

// Structured per-criterion assessment — the model must cite evidence for each
// band it awards, which calibrates scoring far better than "return a number".
const criterion = {
  type: 'object', additionalProperties: false,
  required: ['band', 'evidence'],
  properties: {
    band: { type: 'number', description: 'Band 1.0–9.0 in 0.5 steps for this criterion' },
    evidence: { type: 'string', description: 'Concrete evidence from the response justifying this band against the descriptor' },
  },
} as const

const WRITING_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['criteria', 'overview', 'strengths', 'improvements', 'next_band_tip', 'rewritten_paragraph'],
  properties: {
    criteria: {
      type: 'object', additionalProperties: false,
      required: ['task', 'coherence', 'lexical', 'grammar'],
      properties: { task: criterion, coherence: criterion, lexical: criterion, grammar: criterion },
    },
    overview: { type: 'string', description: '2–3 sentence examiner summary referencing the descriptors' },
    strengths: { type: 'array', items: { type: 'string' } },
    improvements: { type: 'array', items: { type: 'string' }, description: 'Specific, each with a concrete example from the text' },
    next_band_tip: { type: 'string', description: 'The single most important change to reach the next half band' },
    rewritten_paragraph: { type: 'string', description: 'A model rewrite of the opening paragraph at one band higher' },
  },
} as const

interface CriterionResult { band: number; evidence: string }
interface WritingResult {
  criteria: { task: CriterionResult; coherence: CriterionResult; lexical: CriterionResult; grammar: CriterionResult }
  overview: string
  strengths: string[]
  improvements: string[]
  next_band_tip: string
  rewritten_paragraph: string
}

export async function POST(request: NextRequest) {
  const user = await getApiUser()
  if (!user) return err('Unauthorized', 401)

  const allowed = await hasActiveSubscription(user.id)
  if (!allowed) return err('Subscription required.', 403)

  const limited = await enforceAiLimits(user.id, 'writing')
  if (limited) return limited

  let body: { content: string; task_type: '1' | '2'; prompt: string }
  try {
    body = await request.json()
  } catch {
    return err('Invalid request body', 400)
  }

  const { content, task_type, prompt } = body
  if (!content?.trim() || !task_type || !prompt?.trim()) {
    return err('content, task_type, and prompt are required', 400)
  }

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length
  const minWords = task_type === '1' ? 150 : 250
  if (wordCount < 50) {
    return err('Response is too short to evaluate', 400)
  }

  const rubric = task_type === '1' ? WRITING_TASK1_RUBRIC : WRITING_TASK2_RUBRIC
  const taskCriterionName = task_type === '1' ? 'Task Achievement' : 'Task Response'

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.2,
      max_tokens: 1600,
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'ielts_writing_assessment', strict: true, schema: WRITING_SCHEMA },
      },
      messages: [
        {
          role: 'system',
          content: `${EXAMINER_PERSONA}

${rubric}

Assess this IELTS Academic Writing Task ${task_type} response. For each of the four criteria (criteria.task = ${taskCriterionName}, coherence = Coherence & Cohesion, lexical = Lexical Resource, grammar = Grammatical Range & Accuracy) award a band and cite concrete evidence from the text against the descriptor. Penalise under-length responses on the task criterion. Do not average the criteria yourself — the overall band is computed separately. Keep feedback specific and actionable.`,
        },
        {
          role: 'user',
          content: `TASK PROMPT:
${prompt}

MINIMUM WORDS: ${minWords}. ACTUAL WORDS: ${wordCount}.

CANDIDATE RESPONSE:
${content}`,
        },
      ],
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    const result = JSON.parse(raw) as WritingResult

    const task = clampBand(result.criteria.task.band)
    const coherence = clampBand(result.criteria.coherence.band)
    const lexical = clampBand(result.criteria.lexical.band)
    const grammar = clampBand(result.criteria.grammar.band)
    const band = overallBand([task, coherence, lexical, grammar])

    const scored = {
      band_score: band,
      task_achievement: task,
      coherence_cohesion: coherence,
      lexical_resource: lexical,
      grammatical_accuracy: grammar,
    }

    // Feedback payload keeps the keys the Writing page already renders, plus the
    // per-criterion evidence and the "next band" tip.
    const feedback = {
      overview: result.overview,
      strengths: result.strengths,
      improvements: result.improvements,
      rewritten_paragraph: result.rewritten_paragraph,
      next_band_tip: result.next_band_tip,
      criteria: result.criteria,
    }

    const admin = createAdminClient()
    const { data: submission } = await admin
      .from('writing_submissions')
      .insert({
        user_id:                user.id,
        task_type,
        prompt,
        content,
        word_count:             wordCount,
        band_score:             scored.band_score,
        task_achievement:       scored.task_achievement,
        coherence_cohesion:     scored.coherence_cohesion,
        lexical_resource:       scored.lexical_resource,
        grammatical_accuracy:   scored.grammatical_accuracy,
        ai_feedback:            JSON.stringify(feedback),
      })
      .select('id')
      .single()

    await admin.from('band_score_history').insert({
      user_id:    user.id,
      skill:      'writing',
      score:      scored.band_score,
      source:     'writing_submission',
      source_id:  submission?.id ?? null,
    })

    await admin.from('study_sessions').insert({
      user_id:          user.id,
      skill:            'writing',
      activity_type:    'practice',
      duration_minutes: Math.max(5, Math.round(wordCount / 25)),
    })

    await recordUsage(user.id, 'writing')

    return NextResponse.json({
      submission_id: submission?.id,
      ...scored,
      feedback,
    })
  } catch (e) {
    console.error('[AI writing]', e)
    return err('Failed to generate feedback. Please try again.', 500)
  }
}
