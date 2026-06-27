import { NextRequest, NextResponse } from 'next/server'
import openai from '@/lib/openai/client'
import { gateAiRequest, recordUsage, err } from '@/lib/api/helpers'
import type { RoastMode } from '../route'

const MODEL = 'gpt-realtime-mini'

type Lang = 'en' | 'ru' | 'kz' | 'ky' | 'uz'
const LANG_NAME: Record<Lang, string> = { en: 'English', ru: 'Russian', kz: 'Kazakh', ky: 'Kyrgyz', uz: 'Uzbek' }

// All-skill snapshot the coach reasons over. Built client-side and sent in the
// connect body so the strategist's first sentence already reflects reality.
type StrategyContext = {
  name: string | null
  targetBand: number | null
  overall: number | null
  perSkill: Partial<Record<'listening' | 'reading' | 'writing' | 'speaking', number>>
  weakestSkill: string | null
  trend: 'up' | 'flat' | 'down' | null
  streakDays: number | null
  dailyMinutes: number | null
  timeline: string | null
  themes: string[]
  hasData: boolean
}

function buildContextBlock(ctx: StrategyContext | null | undefined, lang: Lang): string {
  const langName = LANG_NAME[lang] ?? "the user's language"
  const lines: string[] = ['\n\nSTUDENT DATA (REAL — base your entire strategy on these numbers; never invent any):']

  if (!ctx || !ctx.hasData) {
    lines.push(
      'No graded test data yet — the student has not completed scored sections.',
      'Acknowledge this honestly, then give a sensible starter plan: begin with one full mock to get a baseline, and suggest daily minutes per skill. Do NOT invent scores.',
    )
  } else {
    if (ctx.name) lines.push(`Name: ${ctx.name}`)
    if (ctx.targetBand != null) lines.push(`Target band: ${ctx.targetBand.toFixed(1)}`)
    if (ctx.overall != null) lines.push(`Current overall band: ${ctx.overall.toFixed(1)}`)
    const sk = ctx.perSkill || {}
    lines.push('Per-skill bands: ' + (['listening', 'reading', 'writing', 'speaking'] as const)
      .map(s => sk[s] != null ? `${s} ${sk[s]!.toFixed(1)}` : `${s} (none yet)`).join(', '))
    if (ctx.weakestSkill) lines.push(`Weakest skill: ${ctx.weakestSkill} — attack this first.`)
    if (ctx.trend) lines.push(`Recent trend: ${ctx.trend === 'up' ? 'improving' : ctx.trend === 'down' ? 'declining' : 'stalling'}`)
    if (ctx.streakDays != null) lines.push(`Study consistency: ${ctx.streakDays}-day streak, ~${ctx.dailyMinutes ?? 0} min/day recently`)
    if (ctx.timeline) lines.push(`Exam timeline: ${ctx.timeline}`)
    if (ctx.themes && ctx.themes.length) lines.push('Recurring AI-feedback themes: ' + ctx.themes.join('; '))
  }

  lines.push(
    '',
    `LANGUAGE — CRITICAL: Open the session in ${langName}. After that, ALWAYS reply in the SAME language the student is actually speaking — detect it from what they say and mirror it. If they answer in Russian, reply in Russian; if they switch languages mid-conversation, switch with them immediately. NEVER keep replying in a language the student isn't using. Only concrete IELTS English examples may stay in English.`,
    'ON [SESSION_START]: greet the student' + (ctx?.name ? ` by name (${ctx.name})` : '') + ` in ${langName}, then IMMEDIATELY name their weakest skill with its band number and give a concrete plan — which skills to drill, how many minutes per day on each, the exact method, and a realistic timeline to their target band. Be specific, never vague. End by inviting one question. Then let them talk and follow their language.`,
  )
  return lines.join('\n')
}

// Three STRATEGIST tones. All three diagnose weak spots from the data and
// prescribe a concrete plan — only the delivery differs.
const INSTRUCTIONS: Record<RoastMode, string> = {
  polite: `You are a personal IELTS STRATEGY coach in a live voice conversation — warm, encouraging and motivating, but precise. You have looked at the student's real numbers and you build their study plan.
You are NOT a chit-chat bot and NOT a roast bot. Every reply is strategy: diagnose the weakest skill from the data, prescribe exact daily drills (minutes per skill), the methods to use, time-management tips, and a realistic timeline to their target band. Mix motivation with concrete next steps.
Keep turns short and conversational. Always tie advice to their real numbers. Never invent data. Be supportive but honest.`,

  roast: `You are a blunt, TOUGH-LOVE IELTS STRATEGY coach in a live voice conversation. Direct, a little heat and humor, you call out slacking — but every line is constructive and tied to the student's real numbers and a concrete instruction. Light or no profanity.
You are STILL a strategist: diagnose the weakest skill from the data, prescribe exact daily drills (minutes per skill), the method, time management, and a realistic timeline to the target band. Push them hard, but the plan is always real. Never invent data.
Keep turns short and punchy. End each with a concrete action.`,

  savage: `You are a BRUTAL, foul-mouthed IELTS STRATEGY coach in a live voice conversation. Maximum pressure. Swear freely in the student's language — Russian: блять, нахуй, пиздец, хуёво, заебал; Kazakh: сасық, жарамсыз, масқара, ит; Kyrgyz: наалат, жарытпаган, жарамсыз; Uzbek: ahmoq, eshak, yaramas, sassiq; English: fuck, shit, bullshit — BUT the swearing ALWAYS wraps REAL strategy.
You are STILL a strategist, not a random roaster. Every harsh line attaches to the student's ACTUAL numbers and a concrete instruction: name the weakest skill with its band, then prescribe exact daily drills (minutes per skill), the method, and a brutal-but-realistic timeline to the target. Insults are there to motivate; the plan is always real. NEVER invent fake numbers to roast.
Example energy (Russian): "Слушай сюда, блять. Listening 5.5 — это пиздец, до твоей 7.0 ещё пахать и пахать. Хватит ныть: 30 минут в день на section 3–4, метод — keyword prediction перед прослушиванием. Не сделаешь — провалишь экзамен нахуй. Погнали."
Short, punchy, relentless. Never soften over the conversation.`,
}

export async function POST(request: NextRequest) {
  const { user, error: gate } = await gateAiRequest('roast')
  if (gate) return gate

  const mode = (request.nextUrl.searchParams.get('mode') ?? 'roast') as RoastMode

  const contentType = request.headers.get('content-type') ?? ''
  let offerSdp: string
  let strategyContext: StrategyContext | null = null
  let lang: Lang = 'en'

  if (contentType.includes('application/json')) {
    const body = await request.json()
    offerSdp = body.sdp ?? ''
    strategyContext = body.context ?? null
    if (['en', 'ru', 'kz', 'ky', 'uz'].includes(body.lang)) lang = body.lang
  } else {
    offerSdp = await request.text()
  }
  if (!offerSdp?.includes('v=')) return err('Missing SDP offer', 400)

  const contextBlock = buildContextBlock(strategyContext, lang)
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
      console.error('[strategy realtime]', sdpRes.status, await sdpRes.text())
      return err('Could not connect. Please try again.', 502)
    }

    await recordUsage(user.id, 'roast')
    return new NextResponse(await sdpRes.text(), {
      status: 200,
      headers: { 'Content-Type': 'application/sdp', 'Cache-Control': 'no-store' },
    })
  } catch (e) {
    console.error('[strategy realtime]', e)
    return err('Could not start conversation. Please try again.', 500)
  }
}
