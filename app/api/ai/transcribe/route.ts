import { NextRequest, NextResponse } from 'next/server'
import openai from '@/lib/openai/client'
import { getApiUser, err } from '@/lib/api/helpers'

// Transcribes a short recorded answer with Whisper. The speaking page sends
// the captured audio here, then the returned text is graded by /api/ai/speaking.
export async function POST(request: NextRequest) {
  const user = await getApiUser()
  if (!user) return err('Unauthorized', 401)

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
    })
    return NextResponse.json({ transcript: transcription.text?.trim() ?? '' })
  } catch (e) {
    console.error('[AI transcribe]', e)
    return err('Transcription failed. Please try again.', 500)
  }
}
