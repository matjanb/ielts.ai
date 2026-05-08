import { NextRequest, NextResponse } from 'next/server'
import openai from '@/lib/openai/client'
import { createAdminClient } from '@/lib/supabase/admin'
import { getApiUser, canUseFeature, recordUsage, err } from '@/lib/api/helpers'

export async function POST(request: NextRequest) {
  const user = await getApiUser()
  if (!user) return err('Unauthorized', 401)

  const allowed = await canUseFeature(user.id, 'speaking')
  if (!allowed) return err('Monthly speaking feedback limit reached. Upgrade to Pro for unlimited access.', 429)

  let body: { transcript: string; part: 1 | 2 | 3; topic: string }
  try {
    body = await request.json()
  } catch {
    return err('Invalid request body', 400)
  }

  const { transcript, part, topic } = body
  if (!transcript?.trim() || !part || !topic?.trim()) {
    return err('transcript, part, and topic are required', 400)
  }

  if (transcript.trim().split(/\s+/).length < 20) {
    return err('Transcript is too short to evaluate', 400)
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are a certified IELTS examiner specialising in Speaking assessment.
Evaluate the student's spoken response fairly and constructively.
Return ONLY valid JSON. Band scores must be between 4.0 and 9.0, in increments of 0.5.
Note: Pronunciation score is estimated from text patterns (hedging, fillers, vocabulary complexity).`,
        },
        {
          role: 'user',
          content: `IELTS Speaking Part ${part}
Topic: ${topic}

Student transcript:
${transcript}

Return JSON:
{
  "band_score": <number>,
  "fluency_score": <number>,
  "lexical_score": <number>,
  "grammar_score": <number>,
  "pronunciation_notes": "<brief notes on likely pronunciation patterns based on vocabulary and structure used>",
  "feedback": {
    "overview": "<2–3 sentence overall assessment>",
    "strengths": ["<strength 1>", "<strength 2>"],
    "improvements": ["<improvement with example>", "<another improvement>"]
  }
}`,
        },
      ],
      max_tokens: 800,
      temperature: 0.3,
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    const result = JSON.parse(raw) as {
      band_score: number
      fluency_score: number
      lexical_score: number
      grammar_score: number
      pronunciation_notes: string
      feedback: {
        overview: string
        strengths: string[]
        improvements: string[]
      }
    }

    const clamp = (n: number) => Math.round(Math.min(9, Math.max(4, n)) * 2) / 2

    const scored = {
      band_score:          clamp(result.band_score),
      fluency_score:       clamp(result.fluency_score),
      lexical_score:       clamp(result.lexical_score),
      grammar_score:       clamp(result.grammar_score),
      pronunciation_score: clamp((result.fluency_score + result.grammar_score) / 2),
    }

    const admin = createAdminClient()
    const { data: submission } = await admin
      .from('speaking_submissions')
      .insert({
        user_id:             user.id,
        part,
        topic,
        transcript,
        band_score:          scored.band_score,
        fluency_score:       scored.fluency_score,
        pronunciation_score: scored.pronunciation_score,
        lexical_score:       scored.lexical_score,
        grammar_score:       scored.grammar_score,
        ai_feedback:         JSON.stringify({ notes: result.pronunciation_notes, ...result.feedback }),
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

    await recordUsage(user.id, 'speaking')

    return NextResponse.json({
      submission_id:       submission?.id,
      pronunciation_notes: result.pronunciation_notes,
      feedback:            result.feedback,
      ...scored,
    })
  } catch (e) {
    console.error('[AI speaking]', e)
    return err('Failed to generate feedback. Please try again.', 500)
  }
}
