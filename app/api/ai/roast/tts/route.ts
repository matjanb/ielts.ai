import { NextRequest, NextResponse } from 'next/server'
import openai from '@/lib/openai/client'
import { err } from '@/lib/api/helpers'
import type { RoastMode } from '../route'

const VOICE: Record<RoastMode, 'nova' | 'onyx' | 'echo'> = {
  polite: 'nova',
  roast: 'onyx',
  savage: 'echo',
}

export async function POST(req: NextRequest) {
  let body: { text: string; mode: RoastMode }
  try { body = await req.json() } catch { return err('Invalid JSON', 400) }

  const { text, mode = 'roast' } = body
  if (!text?.trim()) return err('No text', 400)
  if (text.length > 1000) return err('Text too long', 400)

  try {
    const speech = await openai.audio.speech.create({
      model: 'tts-1',
      voice: VOICE[mode] ?? 'onyx',
      input: text,
      speed: mode === 'savage' ? 1.1 : 1.0,
    })

    const buffer = Buffer.from(await speech.arrayBuffer())
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(buffer.length),
      },
    })
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'TTS error', 500)
  }
}
