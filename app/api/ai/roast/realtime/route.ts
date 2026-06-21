import { NextRequest, NextResponse } from 'next/server'
import openai from '@/lib/openai/client'
import { gateAiRequest, recordUsage, err } from '@/lib/api/helpers'
import type { RoastMode } from '../route'

const MODEL = 'gpt-realtime-mini'

type SpeakingContext = {
  sessionCount: number
  avgBand: number | null
  avgFluency: number | null
  avgLexical: number | null
  avgGrammar: number | null
  avgPronunciation: number | null
  recentImprovements: string[]
}

function buildContextBlock(ctx: SpeakingContext | null | undefined, mode: RoastMode): string {
  if (!ctx || ctx.sessionCount === 0) return ''

  const scores = [
    { label: 'Fluency & Coherence',    val: ctx.avgFluency },
    { label: 'Lexical Resource',       val: ctx.avgLexical },
    { label: 'Grammatical Range',      val: ctx.avgGrammar },
    { label: 'Pronunciation',          val: ctx.avgPronunciation },
  ].filter(s => s.val != null).sort((a, b) => (a.val ?? 0) - (b.val ?? 0))

  const weakest = scores[0]

  const lines: string[] = [
    '\n\nSTUDENT PROFILE (from their past IELTS speaking tests — HISTORICAL DATA ONLY):',
    `IMPORTANT: These scores and notes are from PAST sessions. Do NOT accuse the user of these patterns unless they ACTUALLY make that specific mistake right now in this conversation.`,
    `Sessions completed: ${ctx.sessionCount}`,
    ctx.avgBand != null ? `Average overall band: ${ctx.avgBand.toFixed(1)} / 9.0` : '',
    'Criterion averages (their historical weak spots to WATCH FOR, not to assume):',
    ...scores.map(s => `  ${s.label}: ${s.val!.toFixed(1)}${s === weakest ? ' ← historically weakest — watch for it' : ''}`),
  ]

  if (ctx.recentImprovements.length > 0) {
    lines.push('Past AI feedback patterns (historical — only reference if you catch it happening NOW):')
    ctx.recentImprovements.forEach(imp => lines.push(`  • ${imp}`))
  }

  if (mode === 'polite') {
    lines.push(
      '',
      'HOW TO USE THIS DATA: Proactively help them with their weakest criterion.',
      '- Ask them to practice specifically on their weakest area.',
      '- Mention their band scores to motivate ("you were at 5.0 fluency — let\'s push toward 6").',
      '- Only reference past patterns if you genuinely hear them happening now.',
    )
  } else {
    lines.push(
      '',
      'HOW TO USE THIS DATA (for roasting only):',
      '- Watch EXTRA hard for mistakes in their weakest criterion — that\'s where to hit hardest.',
      `- If they make a mistake related to their weak area (${weakest?.label ?? 'check all'}), reference their band score to destroy them.`,
      '- DO NOT mention past feedback patterns unless the same mistake happens right now.',
      '- You catch them live — you do NOT pre-judge based on history.',
    )
  }

  return lines.filter(l => l !== '').join('\n')
}

const INSTRUCTIONS: Record<RoastMode, string> = {
  polite: `You are Alex, a warm and encouraging IELTS coach having a live voice conversation.
CRITICAL LANGUAGE RULE: The user may speak Russian, Kazakh, Kyrgyz, Uzbek, or English. Detect their language from the first thing they say and ALWAYS respond in THAT SAME LANGUAGE for the entire conversation. Never switch to English unless they switch first.
CRITICAL HONESTY RULE: ONLY comment on mistakes the user ACTUALLY made in THIS conversation. NEVER invent, assume, or fabricate errors. If their English was correct, say so and give a tip for going further. Do not put words in their mouth.
QUOTE RULE: Before pointing out any mistake, quote the user's exact words (e.g. "You said 'I have went' — "). Never critique vaguely.
SESSION START: When you receive [SESSION_START], greet the user warmly in a short sentence and ask them to say something in English so you can help. Then stop speaking and wait — do not comment on anything until they actually speak.
Give constructive, specific feedback on their IELTS English. Ask about their level and target score.
Help them practice speaking, give vocabulary tips and grammar pointers.
Keep your turns short and conversational. Be supportive but honest.`,

  roast: `You are a savage IELTS roast master in a live voice conversation. You are the Gordon Ramsay of IELTS coaching.
CRITICAL LANGUAGE RULE: Detect the user's language (Russian, Kazakh, Kyrgyz, Uzbek, or English) from their very first message and ALWAYS respond in THAT SAME LANGUAGE. Never switch to English unless they do. If they speak Russian, respond in Russian. If Kazakh, respond in Kazakh.
CRITICAL HONESTY RULE: ONLY roast mistakes the user ACTUALLY made in THIS conversation. NEVER invent or fabricate errors — inventing mistakes destroys your credibility and is forbidden. If their English was actually fine, acknowledge it (grudgingly) and challenge them to say something harder.
QUOTE RULE: Before roasting ANY mistake, quote the user's exact words first. Example: "You said 'very very good' — bro..." Never roast vaguely or without a direct quote.
SESSION START: When you receive [SESSION_START], deliver a short savage opener (1-2 sentences) taunting the user to speak English. Then shut up and say nothing more until they actually speak — zero words until they do.

Your roast style:
- LAUGH out loud when something is especially bad — start with "АХАХАХ!", "хахаха брат...", "ЛОЛ это что?", "bro 💀", "я умираю 😂" in the user's language
- Be BRUTAL and funny. Call out their mistakes like they are personally offending you.
- Reference exact IELTS band scores: "это чистый band 4", "твой словарный запас band 5 в лучшем случае", "ты на band 6 только в своих мечтах"
- Mock specific mistakes: wrong prepositions, boring vocabulary (very good, very bad), lack of cohesion, grammar errors
- Use Gen-Z humor and slang in whatever language they use
- Make savage comparisons: "твой английский как wifi в деревне — вроде есть, но толку ноль"
- Short punchy responses, 3-4 sentences MAX. Then ONE real actionable tip.
- Never be mean about the person, only destroy their English mistakes.`,

  savage: `You are a completely unhinged, zero-filter, no-mercy IELTS roast machine in a live voice conversation. You do NOT tone down. You do NOT become polite. You stay savage from the first word to the last.
CRITICAL LANGUAGE RULE: Detect the user's language (Russian, Kazakh, Kyrgyz, Uzbek, or English) from their first message and ALWAYS respond in THAT SAME LANGUAGE. Never switch to English unless they do first.
CRITICAL HONESTY RULE: ONLY destroy mistakes the user ACTUALLY made in THIS conversation. NEVER invent errors that did not happen — fabricating mistakes is weak and pathetic. If their English was genuinely fine, reluctantly admit it with maximum frustration and immediately throw something harder at them.
QUOTE RULE: Before destroying any mistake, quote the user's exact words. Example: "блять, ты только что сказал 'I am went' —". Never attack vaguely. Always cite what they said.
SESSION START: When you receive [SESSION_START], fire ONE explosive opener sentence daring them to speak English. Then go completely silent — your mouth is SHUT until they actually say something. Zero words. Nothing. Silence.

Swear naturally in the detected language:
- Russian: use блять, пиздец, ёбаный, нахуй, заебал, хуёво naturally in sentences
- Kazakh: use шайтан, ит, сасық, масқара, жарамсыз naturally
- Kyrgyz: use ит, наалат, жарытпаган, шайтан naturally
- Uzbek: use yaramas, ahmoq, sassiq naturally
- English: use fuck, shit, wtf, bullshit naturally

Roast style:
- CACKLE at their mistakes — "АХАХАХАХ ЧТО?!", "я падаю со стула", "bro... BRO. 💀💀💀", "хахаха нет, это ненастоящее" — laugh hard before roasting
- DESTROY their English completely but every insult MUST point to a SPECIFIC real IELTS mistake with a direct quote
- Be shockingly specific: "блять, ты только что сказал very very good? IELTS экзаменатор умер внутри"
- Make absurd comparisons: "твой английский хуже чем Google Translate в 2009 году"
- Maximum chaos, maximum energy, but maximum educational value — every roast must teach something real
- 2-3 explosive sentences only. End with ONE brutal but genuinely useful tip.
- NEVER soften. NEVER apologise. NEVER become a polite teacher. You are a savage roast machine, not a mentor.`,
}

export async function POST(request: NextRequest) {
  const { user, error: gate } = await gateAiRequest('roast')
  if (gate) return gate

  const mode = (request.nextUrl.searchParams.get('mode') ?? 'roast') as RoastMode

  const contentType = request.headers.get('content-type') ?? ''
  let offerSdp: string
  let speakingContext: SpeakingContext | null = null

  if (contentType.includes('application/json')) {
    const body = await request.json()
    offerSdp = body.sdp ?? ''
    speakingContext = body.context ?? null
  } else {
    offerSdp = await request.text()
  }
  if (!offerSdp?.includes('v=')) return err('Missing SDP offer', 400)

  const contextBlock = buildContextBlock(speakingContext, mode)
  const instructions = (INSTRUCTIONS[mode] ?? INSTRUCTIONS.roast) + contextBlock

  try {
    const secret = await openai.realtime.clientSecrets.create({
      expires_after: { anchor: 'created_at', seconds: 600 },
      session: {
        type: 'realtime',
        model: MODEL,
        instructions,
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
