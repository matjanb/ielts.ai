import { NextRequest, NextResponse } from 'next/server'
import openai from '@/lib/openai/client'
import { gateAiRequest, err } from '@/lib/api/helpers'

// Whisper transcription for roast — auto-detects language (no lang pin)
export async function POST(req: NextRequest) {
  const { error: gate } = await gateAiRequest('roast')
  if (gate) return gate

  let form: FormData
  try { form = await req.formData() } catch { return err('Invalid form data', 400) }

  const audio = form.get('audio')
  if (!(audio instanceof File) || audio.size === 0) return err('audio file required', 400)
  if (audio.size > 25 * 1024 * 1024) return err('File too large (max 25 MB)', 400)

  try {
    const result = await openai.audio.transcriptions.create({
      model: 'whisper-1',
      file: audio,
      // no language pin — Whisper auto-detects
    })
    return NextResponse.json({ transcript: result.text })
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Transcription error', 500)
  }
}
