import { NextRequest, NextResponse } from 'next/server'
import openai from '@/lib/openai/client'
import { gateAiRequest, recordUsage, err } from '@/lib/api/helpers'

// Voices the examiner's questions so the test is taken by ear, like the real
// exam. Streams raw MP3 bytes straight through from OpenAI (no server-side
// buffering) so playback can start as soon as possible. Uses tts-1, the
// low-latency TTS model — the between-question wait matters more here than
// studio-grade voice quality.

const MAX_CHARS = 600 // an examiner question is short; cap to bound TTS cost

export async function POST(request: NextRequest) {
  const { user, error: gate } = await gateAiRequest('tts')
  if (gate) return gate

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
      model: 'tts-1',
      voice: 'nova', // warm, clear female voice for "Sarah"
      input: text,
      response_format: 'mp3',
    })

    await recordUsage(user.id, 'tts')

    // speech.body is a ReadableStream — forward it directly to the client.
    return new NextResponse(speech.body, {
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
