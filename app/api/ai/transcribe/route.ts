import { NextRequest, NextResponse } from 'next/server'
import openai from '@/lib/openai/client'
import { gateAiRequest, recordUsage, err } from '@/lib/api/helpers'
import { computeFluencyMetrics, type WhisperWord } from '@/lib/ielts/fluency'

// whisper-1's most common silence/noise hallucinations. Drop a transcript that
// is ONLY one of these on a short clip.
const HALLUCINATIONS = new Set(['thank you', 'thank you.', 'thanks for watching', 'bye', 'bye.', 'you', '.', ''])

interface VerboseSegment { start: number; end: number; text: string; avg_logprob?: number; no_speech_prob?: number }

// A segment with high no-speech probability or a very low average logprob is
// silence/background noise, not speech.
const isNoiseSegment = (s: VerboseSegment) =>
  (s.no_speech_prob != null && s.no_speech_prob > 0.6) ||
  (s.avg_logprob != null && s.avg_logprob < -1.0)

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
      // Kept on whisper-1 because it's the model that returns word timestamps
      // the fluency metrics rely on (gpt-4o-transcribe doesn't support
      // verbose_json/word timestamps). Hallucinations are stripped below.
      model: 'whisper-1',
      language: 'en',
      prompt: 'A candidate answering IELTS Speaking questions in natural English.',
      response_format: 'verbose_json',
      timestamp_granularities: ['word'],
    })

    const duration = transcription.duration ?? 0
    const rawText = transcription.text?.trim() ?? ''

    // Too short to be real speech → no phantom turn downstream.
    if (duration > 0 && duration < 0.4) {
      await recordUsage(user.id, 'transcribe')
      return NextResponse.json({ transcript: '', ...computeFluencyMetrics([], 0, '') })
    }

    // Drop silence/noise segments, then rebuild the transcript from what's left.
    const segments = (transcription.segments ?? []) as VerboseSegment[]
    const goodSegments = segments.filter(s => !isNoiseSegment(s))
    let transcript = segments.length
      ? goodSegments.map(s => s.text).join(' ').replace(/\s+/g, ' ').trim()
      : rawText

    // A clip that is ONLY a known ASR hallucination and very short → discard.
    if (HALLUCINATIONS.has(transcript.toLowerCase()) && duration < 2) transcript = ''

    // Keep only word timestamps inside a retained (real speech) segment.
    let words = (transcription.words ?? []) as WhisperWord[]
    if (segments.length) {
      words = words.filter(w => goodSegments.some(s => w.start >= s.start - 0.05 && w.end <= s.end + 0.05))
    }
    if (!transcript) words = []

    const metrics = computeFluencyMetrics(words, transcript ? duration : 0, transcript)

    await recordUsage(user.id, 'transcribe')
    return NextResponse.json({ transcript, ...metrics })
  } catch (e) {
    console.error('[AI transcribe]', e)
    return err('Transcription failed. Please try again.', 500)
  }
}
