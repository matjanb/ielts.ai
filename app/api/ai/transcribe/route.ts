import { NextRequest, NextResponse } from 'next/server'
import openai from '@/lib/openai/client'
import { getApiUser, hasActiveSubscription, recordUsage, enforceAiLimits, err } from '@/lib/api/helpers'
import { computeFluencyMetrics, type WhisperWord } from '@/lib/ielts/fluency'

// Transcribes one recorded answer with Whisper and derives objective fluency
// signals (pauses, speech rate) from the word timestamps. The page accumulates
// these per turn; /api/ai/speaking grades the whole session at the end.
//
// We deliberately do NOT force `language: 'en'`. Forcing English made Whisper
// hallucinate plausible English for non-English speech, so a candidate who
// answered in another language still got a normal band. Instead we let Whisper
// detect the language and report it, so the grader can refuse to score
// non-English answers (real IELTS Speaking is English-only).
export async function POST(request: NextRequest) {
  const user = await getApiUser()
  if (!user) return err('Unauthorized', 401)

  const allowed = await hasActiveSubscription(user.id)
  if (!allowed) return err('Subscription required.', 403)

  const limited = await enforceAiLimits(user.id, 'transcribe')
  if (limited) return limited

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
      response_format: 'verbose_json',
      timestamp_granularities: ['word'],
    })

    const transcript = transcription.text?.trim() ?? ''
    const language = transcription.language ?? 'unknown'
    // Whisper reports the language name ("english") or an ISO code depending on
    // the input — accept either form.
    const isEnglish = /^(en|english)$/i.test(language)
    const metrics = computeFluencyMetrics(
      transcription.words as WhisperWord[] | undefined,
      transcription.duration,
      transcript,
    )

    await recordUsage(user.id, 'transcribe')
    return NextResponse.json({ transcript, language, isEnglish, ...metrics })
  } catch (e) {
    console.error('[AI transcribe]', e)
    return err('Transcription failed. Please try again.', 500)
  }
}
