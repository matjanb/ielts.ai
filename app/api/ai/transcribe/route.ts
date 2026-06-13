import { NextRequest, NextResponse } from 'next/server'
import openai from '@/lib/openai/client'
import { gateAiRequest, recordUsage, err } from '@/lib/api/helpers'
import { computeFluencyMetrics, type WhisperWord } from '@/lib/ielts/fluency'

// Transcribes one recorded answer with Whisper and derives objective fluency
// signals (pauses, speech rate) from the word timestamps. The page accumulates
// these per turn; /api/ai/speaking grades the whole session at the end.
//
// We pin `language: 'en'`: IELTS Speaking is taken in English, and without the
// hint Whisper mis-detects the language on short answers (a one-word reply came
// back transcribed in Cyrillic). The anti-cheat for someone genuinely speaking
// another language is handled at grading time, where the Part 2 audio goes to
// an audio model that hears the actual speech.
export async function POST(request: NextRequest) {
  const { user, error: gate } = await gateAiRequest('transcribe')
  if (gate) return gate

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return err('Invalid form data', 400)
  }

  const audio = form.get('audio')
  if (!(audio instanceof File) || audio.size === 0) {
    return err('audio file is required', 400)
  }
  if (audio.size > 25 * 1024 * 1024) {
    return err('Recording is too large (max 25MB).', 413)
  }

  try {
    const transcription = await openai.audio.transcriptions.create({
      file: audio,
      model: 'whisper-1',
      language: 'en',
      response_format: 'verbose_json',
      timestamp_granularities: ['word'],
    })

    const transcript = transcription.text?.trim() ?? ''
    const metrics = computeFluencyMetrics(
      transcription.words as WhisperWord[] | undefined,
      transcription.duration,
      transcript,
    )

    await recordUsage(user.id, 'transcribe')
    return NextResponse.json({ transcript, ...metrics })
  } catch (e) {
    console.error('[AI transcribe]', e)
    return err('Transcription failed. Please try again.', 500)
  }
}
