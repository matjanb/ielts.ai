import { NextRequest, NextResponse } from 'next/server'
import openai from '@/lib/openai/client'
import { gateAiRequest, recordUsage, err } from '@/lib/api/helpers'
import type { RoastMode } from '../route'

const MODEL = 'gpt-realtime-mini'

const INSTRUCTIONS: Record<RoastMode, string> = {
  polite: `You are Alex, a warm and encouraging IELTS mentor having a live voice conversation.
Detect the language the user speaks (English, Russian, Kazakh, Kyrgyz, or Uzbek) and ALWAYS respond in that same language.
Give constructive, specific feedback on their IELTS English. Ask about their current level and target score.
Help them practice speaking, give vocabulary tips, grammar pointers.
Keep your turns short and conversational. Be supportive but honest.`,

  roast: `You are a hilarious IELTS roast master having a live voice conversation.
Detect the language the user speaks (English, Russian, Kazakh, Kyrgyz, or Uzbek) and ALWAYS respond in that same language.
Roast their English savagely but educationally — every roast must point to a real IELTS mistake.
Reference band scores ("band 4 energy", "band 5 vibes"). Be savage and funny, Gen-Z style.
Keep responses punchy and short. Always end with one real tip to improve.
If they speak Russian — роасти на русском. Казахском — на казахском. И так далее.`,

  savage: `You are an absolutely unhinged IELTS roast master with zero filter having a live voice conversation.
Detect the language the user speaks and ALWAYS respond in that same language with strong language:
- English: swear freely (fuck, shit, damn, wtf, bullshit, etc.)
- Russian: матерись свободно (блять, хуй, пиздец, ёбаный, сука, нахуй и т.д.)
- Kazakh: бұрқылдат (шайтан, ит, сасық, арам, шіріген, т.б.)
- Kyrgyz: сөгүн (ит, эшек, жарытпаган, шайтан, бет жок, т.б.)
- Uzbek: so'king (yaramas, it, eshak, ahmoq, najas, т.б.)
Absolutely destroy their English but every insult MUST expose a real IELTS mistake.
Short, punchy, chaotic energy. End each response with one real improvement tip despite the chaos.`,
}

export async function POST(request: NextRequest) {
  const { user, error: gate } = await gateAiRequest('roast')
  if (gate) return gate

  const mode = (request.nextUrl.searchParams.get('mode') ?? 'roast') as RoastMode
  const offerSdp = await request.text()
  if (!offerSdp?.includes('v=')) return err('Missing SDP offer', 400)

  try {
    const secret = await openai.realtime.clientSecrets.create({
      expires_after: { anchor: 'created_at', seconds: 600 },
      session: {
        type: 'realtime',
        model: MODEL,
        instructions: INSTRUCTIONS[mode] ?? INSTRUCTIONS.roast,
        output_modalities: ['audio'],
        audio: {
          input: {
            transcription: { model: 'whisper-1' }, // no lang pin — auto-detect
            noise_reduction: { type: 'near_field' },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.6,
              prefix_padding_ms: 200,
              silence_duration_ms: 600,
              interrupt_response: true, // allow interrupting the roaster
            },
          },
          output: {
            voice: mode === 'polite' ? 'sage' : mode === 'roast' ? 'onyx' : 'echo',
          },
        },
      },
    })

    const sdpRes = await fetch(`https://api.openai.com/v1/realtime/calls?model=${encodeURIComponent(MODEL)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret.value}`, 'Content-Type': 'application/sdp' },
      body: offerSdp,
    })
    if (!sdpRes.ok) {
      console.error('[roast realtime]', sdpRes.status, await sdpRes.text())
      return err('Could not connect. Please try again.', 502)
    }

    await recordUsage(user.id, 'roast')
    return new NextResponse(await sdpRes.text(), {
      status: 200,
      headers: { 'Content-Type': 'application/sdp', 'Cache-Control': 'no-store' },
    })
  } catch (e) {
    console.error('[roast realtime]', e)
    return err('Could not start conversation. Please try again.', 500)
  }
}
