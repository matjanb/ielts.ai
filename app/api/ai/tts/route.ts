import { NextRequest, NextResponse } from 'next/server'
import openai from '@/lib/openai/client'
import { getApiUser, hasActiveSubscription, enforceAiLimits, recordUsage, err } from '@/lib/api/helpers'

// Voices the examiner's questions so the test is taken by ear, like the real
// exam. Returns raw MP3 bytes the client plays back. Kept tiny and stateless —
// the examiner text comes from /api/ai/speaking/examiner.

const MAX_CHARS = 600 // an examiner question is short; cap to bound TTS cost

export async function POST(request: NextRequest) {
  const user = await getApiUser()
  if (!user) return err('Unauthorized', 401)

  const allowed = await hasActiveSubscription(user.id)
  if (!allowed) return err('Subscription required.', 403)

  const limited = await enforceAiLimits(user.id, 'tts')
  if (limited) return limited

  let body: { text?: string }
  try {
    body = await request.json()
  } catch {
    return err('Invalid request body', 400)
  }

  const text = body.text?.trim()
  if (!text) return err('text is required', 400)
  if (text.length > MAX_CHARS) return err('Text is too long to voice.', 413)

  try {
    const speech = await openai.audio.speech.create({
      model: 'gpt-4o-mini-tts',
      voice: 'sage', // warm, measured female voice for "Sarah"
      input: text,
      instructions: 'Speak as a calm, professional British IELTS examiner: clear, neutral, unhurried.',
      response_format: 'mp3',
    })

    const buffer = Buffer.from(await speech.arrayBuffer())
    await recordUsage(user.id, 'tts')

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    console.error('[AI tts]', e)
    return err('Could not generate the examiner voice.', 500)
  }
}
