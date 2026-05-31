import { NextRequest, NextResponse } from 'next/server'
import openai from '@/lib/openai/client'
import { createAdminClient } from '@/lib/supabase/admin'
import { getApiUser, canUseFeature, recordUsage, err } from '@/lib/api/helpers'

export async function POST(request: NextRequest) {
  const user = await getApiUser()
  if (!user) return err('Unauthorized', 401)

  const allowed = await canUseFeature(user.id, 'writing')
  if (!allowed) return err('Monthly writing feedback limit reached. Upgrade to Pro for unlimited access.', 429)

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

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are a certified IELTS examiner with 20 years of experience.
Evaluate the student's IELTS Writing Task ${task_type} response accurately and constructively.
Return ONLY valid JSON matching the specified schema. Band scores must be between 4.0 and 9.0, in increments of 0.5.`,
        },
        {
          role: 'user',
          content: `Task prompt: ${prompt}

Student response (${wordCount} words):
${content}

Minimum required words for Task ${task_type}: ${minWords}

Return JSON:
{
  "band_score": <number>,
  "task_achievement": <number>,
  "coherence_cohesion": <number>,
  "lexical_resource": <number>,
  "grammatical_accuracy": <number>,
  "feedback": {
    "overview": "<2–3 sentence assessment>",
    "strengths": ["<strength 1>", "<strength 2>"],
    "improvements": ["<specific improvement with example>", "<another improvement>"],
    "rewritten_paragraph": "<rewrite the opening paragraph showing the improvements>"
  }
}`,
        },
      ],
      max_tokens: 1000,
      temperature: 0.3,
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    const result = JSON.parse(raw) as {
      band_score: number
      task_achievement: number
      coherence_cohesion: number
      lexical_resource: number
      grammatical_accuracy: number
      feedback: {
        overview: string
        strengths: string[]
        improvements: string[]
        rewritten_paragraph: string
      }
    }

    // Clamp scores to valid range
    const clamp = (n: number) => Math.round(Math.min(9, Math.max(4, n)) * 2) / 2

    const scored = {
      band_score:             clamp(result.band_score),
      task_achievement:       clamp(result.task_achievement),
      coherence_cohesion:     clamp(result.coherence_cohesion),
      lexical_resource:       clamp(result.lexical_resource),
      grammatical_accuracy:   clamp(result.grammatical_accuracy),
    }

    // Save to Supabase
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
        ai_feedback:            JSON.stringify(result.feedback),
      })
      .select('id')
      .single()

    // Save band score to history
    await admin.from('band_score_history').insert({
      user_id:    user.id,
      skill:      'writing',
      score:      scored.band_score,
      source:     'writing_submission',
      source_id:  submission?.id ?? null,
    })

    // Log study session so streak & study-time reflect real usage
    // (~1 min per 25 words, min 5)
    await admin.from('study_sessions').insert({
      user_id:          user.id,
      skill:            'writing',
      activity_type:    'practice',
      duration_minutes: Math.max(5, Math.round(wordCount / 25)),
    })

    // Record usage
    await recordUsage(user.id, 'writing')

    return NextResponse.json({
      submission_id: submission?.id,
      ...scored,
      feedback: result.feedback,
    })
  } catch (e) {
    console.error('[AI writing]', e)
    return err('Failed to generate feedback. Please try again.', 500)
  }
}
