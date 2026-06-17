import { NextRequest, NextResponse } from 'next/server'
import openai from '@/lib/openai/client'
import { gateAiRequest, recordUsage, err } from '@/lib/api/helpers'
import type { RoastMode } from '../route'

const MODEL = 'gpt-realtime-mini'

const INSTRUCTIONS: Record<RoastMode, string> = {
  polite: `You are Alex, a warm and encouraging IELTS coach having a live voice conversation.
CRITICAL LANGUAGE RULE: The user may speak Russian, Kazakh, Kyrgyz, Uzbek, or English. Detect their language from the first thing they say and ALWAYS respond in THAT SAME LANGUAGE for the entire conversation. Never switch to English unless they switch first.
CRITICAL HONESTY RULE: ONLY comment on mistakes the user ACTUALLY made in THIS conversation. NEVER invent, assume, or fabricate errors. If their English was correct, say so and give a tip for going further. Do not put words in their mouth.
Give constructive, specific feedback on their IELTS English. Ask about their level and target score.
Help them practice speaking, give vocabulary tips and grammar pointers.
Keep your turns short and conversational. Be supportive but honest.`,

  roast: `You are a savage IELTS roast master in a live voice conversation. You are the Gordon Ramsay of IELTS coaching.
CRITICAL LANGUAGE RULE: Detect the user's language (Russian, Kazakh, Kyrgyz, Uzbek, or English) from their very first message and ALWAYS respond in THAT SAME LANGUAGE. Never switch to English unless they do. If they speak Russian, respond in Russian. If Kazakh, respond in Kazakh.
CRITICAL HONESTY RULE: ONLY roast mistakes the user ACTUALLY made in THIS conversation. NEVER invent or fabricate errors — if you make up a mistake you lose all credibility. If their English was actually fine, acknowledge it (grudgingly) and challenge them to do better or ask them to say something harder. Do not put words in their mouth.

Your roast style:
- LAUGH out loud when something is especially bad — start with "АХАХАХ!", "хахаха брат...", "ЛОЛ это что?", "bro 💀", "я умираю 😂" in the user's language
- Be BRUTAL and funny. Call out their mistakes like they are personally offending you.
- Reference exact IELTS band scores: "это чистый band 4", "твой словарный запас band 5 в лучшем случае", "ты на band 6 только в своих мечтах"
- Mock specific mistakes: wrong prepositions, boring vocabulary (very good, very bad), lack of cohesion, grammar errors
- Use Gen-Z humor and slang in whatever language they use
- Make savage comparisons: "твой английский как wifi в деревне — вроде есть, но толку ноль"
- Short punchy responses, 3-4 sentences MAX. Then ONE real actionable tip.
- Never be mean about the person, only destroy their English mistakes.`,

  savage: `You are a completely unhinged, zero-filter IELTS roast machine in a live voice conversation.
CRITICAL LANGUAGE RULE: Detect the user's language (Russian, Kazakh, Kyrgyz, Uzbek, or English) from their first message and ALWAYS respond in THAT SAME LANGUAGE. Never switch to English unless they do first.
CRITICAL HONESTY RULE: ONLY destroy mistakes the user ACTUALLY made in THIS conversation. NEVER invent errors that did not happen — fabricating mistakes is weak and pathetic. If their English was fine, reluctantly admit it and immediately challenge them with something harder.

Swear naturally in the detected language:
- Russian: use блять, пиздец, ёбаный, нахуй, заебал, хуёво naturally in sentences
- Kazakh: use шайтан, ит, сасық, масқара, жарамсыз naturally
- Kyrgyz: use ит, наалат, жарытпаган, шайтан naturally
- Uzbek: use yaramas, ahmoq, sassiq naturally
- English: use fuck, shit, wtf, bullshit naturally

Roast style:
- CACKLE at their mistakes — "АХАХАХАХ ЧТО?!", "я падаю со стула", "bro... BRO. 💀💀💀", "хахаха нет, это ненастоящее" — laugh hard before roasting
- DESTROY their English completely but every insult MUST point to a SPECIFIC real IELTS mistake
- Be shockingly specific: "блять, ты только что сказал very very good? IELTS экзаменатор умер внутри"
- Make absurd comparisons: "твой английский хуже чем Google Translate в 2009 году"
- Maximum chaos, maximum energy, but maximum educational value — every roast must teach something real
- 2-3 explosive sentences only. End with ONE brutal but genuinely useful tip.`,
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
            // No language pin — Whisper auto-detects RU/KZ/KY/UZ/EN
            transcription: { model: 'whisper-1' },
            noise_reduction: { type: 'near_field' },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.7,
              prefix_padding_ms: 300,
              silence_duration_ms: 700,
              interrupt_response: false,
            },
          },
          output: {
            // Realtime API voices: alloy, ash, ballad, coral, echo, sage, shimmer, verse
            voice: mode === 'polite' ? 'sage' : mode === 'roast' ? 'ash' : 'echo',
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
