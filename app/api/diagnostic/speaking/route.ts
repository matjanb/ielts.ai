import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// Instantiate directly (not via lib/openai/client which has 'server-only')
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

function err(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status })
}

function clampBand(n: number): number {
  return Math.round(Math.min(9, Math.max(4, n)) * 2) / 2
}

export async function POST(request: NextRequest) {
  if (!process.env.OPENAI_API_KEY) return err('Service not configured', 503)

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return err('Invalid form data')
  }

  const audioFile = formData.get('audio') as File | null
  const question = (formData.get('question') as string | null) ?? 'Tell me about yourself'

  if (!audioFile || audioFile.size < 1000) {
    return err('No audio file provided or file too small')
  }

  // Guard against oversized uploads (5 MB limit)
  if (audioFile.size > 5 * 1024 * 1024) {
    return err('Audio file too large. Maximum size is 5 MB.')
  }

  // ── Step 1: Transcribe with Whisper ─────────────────────────────────────
  let transcript: string
  try {
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en',
    })
    transcript = transcription.text.trim()
  } catch (e) {
    console.error('[diagnostic/speaking] Whisper error:', e)
    return err('Transcription failed. Please try again.', 500)
  }

  if (!transcript || transcript.split(/\s+/).filter(Boolean).length < 8) {
    return err('Audio too short or unclear. Please speak for at least 10 seconds.', 422)
  }

  // ── Step 2: Evaluate with GPT ────────────────────────────────────────────
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 900,
      messages: [
        {
          role: 'system',
          content: `You are a certified IELTS examiner specialising in Speaking assessment (Band 4–9).
Evaluate the student's spoken response as transcribed by speech-to-text.
Be constructive, specific, and encouraging. Scores must be multiples of 0.5.
Return ONLY valid JSON — no markdown, no extra text.`,
        },
        {
          role: 'user',
          content: `IELTS Speaking Part 1
Question: "${question}"

Student transcript (speech-to-text):
"${transcript}"

Evaluate and return JSON with this exact shape:
{
  "band": <number 4.0–9.0>,
  "fluency": <number 4.0–9.0>,
  "vocabulary": <number 4.0–9.0>,
  "grammar": <number 4.0–9.0>,
  "coherence": <number 4.0–9.0>,
  "overview": "<2–3 sentence overall assessment as an IELTS examiner>",
  "strengths": ["<specific strength 1>", "<specific strength 2>"],
  "improvements": ["<specific improvement with example>", "<another improvement>"]
}`,
        },
      ],
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    const result = JSON.parse(raw) as {
      band: number
      fluency: number
      vocabulary: number
      grammar: number
      coherence: number
      overview: string
      strengths: string[]
      improvements: string[]
    }

    return NextResponse.json({
      transcript,
      band:       clampBand(result.band      ?? 5.0),
      fluency:    clampBand(result.fluency    ?? 5.0),
      vocabulary: clampBand(result.vocabulary ?? 5.0),
      grammar:    clampBand(result.grammar    ?? 5.0),
      coherence:  clampBand(result.coherence  ?? 5.0),
      overview:   result.overview   ?? '',
      strengths:  Array.isArray(result.strengths)   ? result.strengths   : [],
      improvements: Array.isArray(result.improvements) ? result.improvements : [],
    })
  } catch (e) {
    console.error('[diagnostic/speaking] GPT error:', e)
    return err('Analysis failed. Please try again.', 500)
  }
}
