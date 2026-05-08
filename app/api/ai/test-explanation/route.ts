import { NextRequest, NextResponse } from 'next/server'
import openai from '@/lib/openai/client'
import { getApiUser, canUseFeature, recordUsage, err } from '@/lib/api/helpers'

export async function POST(request: NextRequest) {
  const user = await getApiUser()
  if (!user) return err('Unauthorized', 401)

  const allowed = await canUseFeature(user.id, 'test_explanation')
  if (!allowed) return err('Monthly explanation limit reached. Upgrade to Pro for unlimited access.', 429)

  let body: {
    question_text: string
    correct_answer: string
    user_answer: string
    passage_text?: string
  }
  try {
    body = await request.json()
  } catch {
    return err('Invalid request body', 400)
  }

  const { question_text, correct_answer, user_answer, passage_text } = body
  if (!question_text?.trim() || !correct_answer) {
    return err('question_text and correct_answer are required', 400)
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are an IELTS expert tutor. Explain why the correct answer is correct and help the student understand their mistake.
Be concise, clear, and constructive. Return ONLY valid JSON.`,
        },
        {
          role: 'user',
          content: `${passage_text ? `Passage:\n${passage_text}\n\n` : ''}Question: ${question_text}

Correct answer: ${correct_answer}
Student's answer: ${user_answer || '(no answer given)'}

Return JSON:
{
  "explanation": "<2–3 sentence explanation of why the correct answer is right, with reference to the passage if applicable>",
  "tip": "<one practical strategy tip for answering similar questions in future>"
}`,
        },
      ],
      max_tokens: 300,
      temperature: 0.3,
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    const result = JSON.parse(raw) as { explanation: string; tip: string }

    await recordUsage(user.id, 'test_explanation')

    return NextResponse.json(result)
  } catch (e) {
    console.error('[AI test-explanation]', e)
    return err('Failed to generate explanation. Please try again.', 500)
  }
}
