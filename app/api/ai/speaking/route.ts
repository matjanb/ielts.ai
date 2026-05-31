import { NextRequest, NextResponse } from 'next/server'
import openai from '@/lib/openai/client'
import { createAdminClient } from '@/lib/supabase/admin'
import { getApiUser, canUseFeature, recordUsage, err } from '@/lib/api/helpers'
import { SPEAKING_RUBRIC, EXAMINER_PERSONA } from '@/lib/ielts/rubrics'
import { clampBand, overallBand } from '@/lib/ielts/band'

const criterion = {
  type: 'object', additionalProperties: false,
  required: ['band', 'evidence'],
  properties: {
    band: { type: 'number', description: 'Band 1.0–9.0 in 0.5 steps' },
    evidence: { type: 'string', description: 'Concrete evidence from the transcript justifying this band against the descriptor' },
  },
} as const

const SPEAKING_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['criteria', 'overview', 'strengths', 'improvements', 'next_band_tip', 'pronunciation_notes'],
  properties: {
    criteria: {
      type: 'object', additionalProperties: false,
      required: ['fluency', 'lexical', 'grammar', 'pronunciation'],
      properties: { fluency: criterion, lexical: criterion, grammar: criterion, pronunciation: criterion },
    },
    overview: { type: 'string' },
    strengths: { type: 'array', items: { type: 'string' } },
    improvements: { type: 'array', items: { type: 'string' } },
    next_band_tip: { type: 'string', description: 'The single most important change to reach the next half band' },
    pronunciation_notes: { type: 'string', description: 'Notes on likely pronunciation, explicitly flagging that this is estimated from text only' },
  },
} as const

interface CriterionResult { band: number; evidence: string }
interface SpeakingResult {
  criteria: { fluency: CriterionResult; lexical: CriterionResult; grammar: CriterionResult; pronunciation: CriterionResult }
  overview: string
  strengths: string[]
  improvements: string[]
  next_band_tip: string
  pronunciation_notes: string
}

export async function POST(request: NextRequest) {
  const user = await getApiUser()
  if (!user) return err('Unauthorized', 401)

  const allowed = await canUseFeature(user.id, 'speaking')
  if (!allowed) return err('Monthly speaking feedback limit reached. Upgrade to Pro for unlimited access.', 429)

  interface Turn { part: number; question: string; answer: string }
  let body: { transcript?: string; part?: 1 | 2 | 3; topic?: string; turns?: Turn[] }
  try {
    body = await request.json()
  } catch {
    return err('Invalid request body', 400)
  }

  // Build the candidate transcript either from a full Part 1–3 session (turns)
  // or from a single legacy response (transcript/part/topic).
  let candidateTranscript: string
  let contextHeader: string
  let sessionMode = false
  let storePart: 1 | 2 | 3 = body.part ?? 1
  let storeTopic = body.topic ?? ''

  const turns = (body.turns ?? []).filter(tn => tn?.answer?.trim())
  if (turns.length > 0) {
    sessionMode = true
    candidateTranscript = turns
      .map(tn => `[Part ${tn.part}] Examiner: ${tn.question}\nCandidate: ${tn.answer.trim()}`)
      .join('\n\n')
    contextHeader = 'FULL IELTS SPEAKING TEST (Parts 1–3) — examiner questions and the candidate\'s spoken answers:'
    storePart = 2
    storeTopic = body.topic?.trim() || 'Full speaking test'
  } else {
    const { transcript, part, topic } = body
    if (!transcript?.trim() || !part || !topic?.trim()) {
      return err('transcript, part, and topic are required', 400)
    }
    candidateTranscript = transcript.trim()
    contextHeader = `IELTS Speaking Part ${part} ${part === 2 ? 'CUE CARD' : 'QUESTION'}: ${topic}\n\nCANDIDATE TRANSCRIPT:`
    storePart = part
    storeTopic = topic
  }

  if (candidateTranscript.split(/\s+/).filter(Boolean).length < 20) {
    return err('Response is too short to evaluate. Please answer more fully.', 400)
  }

  const assessScope = sessionMode
    ? 'Assess this full IELTS Speaking test (Parts 1–3). Judge the candidate\'s overall speaking ability across all parts as a single examiner would — one band per criterion for the whole test.'
    : 'Assess this IELTS Speaking response.'

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.2,
      max_tokens: 1300,
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'ielts_speaking_assessment', strict: true, schema: SPEAKING_SCHEMA },
      },
      messages: [
        {
          role: 'system',
          content: `${EXAMINER_PERSONA}

${SPEAKING_RUBRIC}

SPEAKING BAND ANCHORS (apply strictly):
- Band 2: barely communicates; mostly isolated words, long pauses, breakdowns.
- Band 3: only simple, short responses; frequent breakdowns; very limited range; answers do not develop.
- Band 4: conveys basic meaning on familiar topics, but answers are short, error-prone and underdeveloped, with frequent grammatical and lexical mistakes.
- Band 5: keeps simple exchanges going with some flexibility, but limited range and frequent errors; little complex language.
- Band 6: generally effective communication, some complex language and reasonable development despite noticeable errors.
- Band 7+: fluent, flexible and largely accurate, with well-developed answers.
A test of very short, repetitive, error-heavy one-line answers is band 3 — not 4 or 5.

${assessScope} The input is a transcript only (no audio is available), so judge fluency from hesitation/repetition markers and sentence flow in the text, and judge pronunciation conservatively per the text-only note in the descriptors — never invent a confident pronunciation band. For each criterion (fluency = Fluency & Coherence, lexical = Lexical Resource, grammar = Grammatical Range & Accuracy, pronunciation) award a band and cite evidence. Do not average the criteria yourself.`,
        },
        {
          role: 'user',
          content: `${contextHeader}
${candidateTranscript}`,
        },
      ],
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    const result = JSON.parse(raw) as SpeakingResult

    const fluency = clampBand(result.criteria.fluency.band)
    const lexical = clampBand(result.criteria.lexical.band)
    const grammar = clampBand(result.criteria.grammar.band)
    const pronunciation = clampBand(result.criteria.pronunciation.band)
    const band = overallBand([fluency, lexical, grammar, pronunciation])

    const scored = {
      band_score: band,
      fluency_score: fluency,
      lexical_score: lexical,
      grammar_score: grammar,
      pronunciation_score: pronunciation,
    }

    const feedback = {
      overview: result.overview,
      strengths: result.strengths,
      improvements: result.improvements,
      next_band_tip: result.next_band_tip,
      criteria: result.criteria,
    }

    const admin = createAdminClient()
    const { data: submission } = await admin
      .from('speaking_submissions')
      .insert({
        user_id:             user.id,
        part:                storePart,
        topic:               storeTopic,
        transcript:          candidateTranscript,
        band_score:          scored.band_score,
        fluency_score:       scored.fluency_score,
        pronunciation_score: scored.pronunciation_score,
        lexical_score:       scored.lexical_score,
        grammar_score:       scored.grammar_score,
        ai_feedback:         JSON.stringify({ notes: result.pronunciation_notes, ...feedback }),
      })
      .select('id')
      .single()

    await admin.from('band_score_history').insert({
      user_id:   user.id,
      skill:     'speaking',
      score:     scored.band_score,
      source:    'speaking_submission',
      source_id: submission?.id ?? null,
    })

    await admin.from('study_sessions').insert({
      user_id:          user.id,
      skill:            'speaking',
      activity_type:    sessionMode ? 'mock_test' : 'practice',
      duration_minutes: sessionMode ? 14 : (storePart === 2 ? 8 : 5),
    })

    await recordUsage(user.id, 'speaking')

    return NextResponse.json({
      submission_id:       submission?.id,
      pronunciation_notes: result.pronunciation_notes,
      feedback,
      ...scored,
    })
  } catch (e) {
    console.error('[AI speaking]', e)
    return err('Failed to generate feedback. Please try again.', 500)
  }
}
