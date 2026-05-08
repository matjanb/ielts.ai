import { NextRequest, NextResponse } from 'next/server'
import openai from '@/lib/openai/client'
import { createAdminClient } from '@/lib/supabase/admin'
import { getApiUser, canUseFeature, recordUsage, err } from '@/lib/api/helpers'

export async function POST(request: NextRequest) {
  const user = await getApiUser()
  if (!user) return err('Unauthorized', 401)

  const allowed = await canUseFeature(user.id, 'band_estimate')
  if (!allowed) return err('Band estimate limit reached.', 429)

  let body: {
    correct: number
    total: number
    sections?: Record<string, { correct: number; total: number }>
    test_id?: string
  }
  try {
    body = await request.json()
  } catch {
    return err('Invalid request body', 400)
  }

  const { correct, total, sections, test_id } = body
  if (typeof correct !== 'number' || typeof total !== 'number' || total === 0) {
    return err('correct and total are required numeric fields', 400)
  }

  const pct = (correct / total) * 100

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are an IELTS scoring expert. Convert raw test scores to IELTS band scores accurately.
Return ONLY valid JSON. Band scores must be between 4.0 and 9.0.`,
        },
        {
          role: 'user',
          content: `Convert these test results to IELTS band scores:

Overall: ${correct}/${total} correct (${pct.toFixed(1)}%)
${sections ? `Sections: ${JSON.stringify(sections)}` : ''}

Return JSON:
{
  "overall_band": <number>,
  "reading_band": <number or null>,
  "listening_band": <number or null>,
  "notes": "<1–2 sentence interpretation of the score and what it means for the student>"
}`,
        },
      ],
      max_tokens: 200,
      temperature: 0.1,
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    const result = JSON.parse(raw) as {
      overall_band: number
      reading_band: number | null
      listening_band: number | null
      notes: string
    }

    const clamp = (n: number | null) =>
      n == null ? null : Math.round(Math.min(9, Math.max(4, n)) * 2) / 2

    const overall = clamp(result.overall_band) ?? 5

    const admin = createAdminClient()

    // Update profile with latest overall score as a band score history entry
    await admin.from('band_score_history').insert({
      user_id:   user.id,
      skill:     'overall',
      score:     overall,
      source:    'mock_test',
      source_id: test_id ?? null,
    })

    // Also record per-section if available
    if (result.reading_band) {
      await admin.from('band_score_history').insert({
        user_id:   user.id,
        skill:     'reading',
        score:     clamp(result.reading_band) ?? overall,
        source:    'mock_test',
        source_id: test_id ?? null,
      })
    }

    await recordUsage(user.id, 'band_estimate')

    return NextResponse.json({
      overall_band:   overall,
      reading_band:   clamp(result.reading_band),
      listening_band: clamp(result.listening_band),
      notes:          result.notes,
    })
  } catch (e) {
    console.error('[AI band-estimate]', e)
    return err('Failed to estimate band score. Please try again.', 500)
  }
}
