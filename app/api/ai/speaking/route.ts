import { NextRequest, NextResponse } from 'next/server'
import openai from '@/lib/openai/client'
import { createAdminClient } from '@/lib/supabase/admin'
import { gateAiRequest, recordUsage, err } from '@/lib/api/helpers'
import { downloadSpeakingAudioBase64 } from '@/lib/services/speakingAudio.server'
import { SPEAKING_RUBRIC, EXAMINER_PERSONA } from '@/lib/ielts/rubrics'
import { clampBand, overallBand } from '@/lib/ielts/band'
import { describeFluency, sanitizeFluencyMetrics, type FluencyMetrics } from '@/lib/ielts/fluency'

// Grades a full IELTS Speaking session. Unlike the old text-only grader, this
// judges the four criteria honestly:
//   • Fluency      — from objective pause/speech-rate metrics derived from the
//                    recording (see lib/ielts/fluency.ts), not guessed from text.
//   • Lexical/Grammar — from the full transcript across all parts.
//   • Pronunciation — from the actual AUDIO of the Part 2 long turn, sent to the
//                    audio-capable gpt-audio model. Sending only the ~2-min clip
//                    (a representative sample) keeps audio token cost bounded
//                    while still grounding pronunciation in real sound.
// When no Part 2 audio is available it degrades gracefully to a text-only grade
// with pronunciation explicitly flagged as estimated.

interface IncomingTurn {
  part: 1 | 2 | 3
  question: string
  answer: string
  isEnglish?: boolean
  audioPath?: string
  duration_ms?: number
  words?: number
  pause_count?: number
  pause_total_ms?: number
  speech_rate_wpm?: number | null
}

interface CriterionResult { band: number; evidence: string }
interface SpeakingResult {
  criteria: { fluency: CriterionResult; lexical: CriterionResult; grammar: CriterionResult; pronunciation: CriterionResult }
  overview: string
  strengths: string[]
  improvements: string[]
  next_band_tip: string
  pronunciation_notes: string
}

const JSON_SHAPE = `Return ONLY a JSON object with exactly this shape:
{
  "criteria": {
    "fluency":       { "band": <number 1-9 in 0.5 steps>, "evidence": "<concrete evidence from the answers/metrics>" },
    "lexical":       { "band": <number>, "evidence": "<...>" },
    "grammar":       { "band": <number>, "evidence": "<...>" },
    "pronunciation": { "band": <number>, "evidence": "<...>" }
  },
  "overview": "<2-3 sentence summary>",
  "strengths": ["<...>", "..."],
  "improvements": ["<...>", "..."],
  "next_band_tip": "<the single most important change to reach the next half band>",
  "pronunciation_notes": "<notes on pronunciation; if no audio was provided, state it is estimated from text only>"
}`

function buildSystemPrompt(hasAudio: boolean, fluencySummary: string): string {
  const pronInstruction = hasAudio
    ? `You have been given the ACTUAL AUDIO of the candidate speaking. Judge Pronunciation directly from it (individual sounds, word/sentence stress, intonation, rhythm, intelligibility, effect of L1 accent) and also let the audio inform Fluency & Coherence (hesitation, pace, smoothness). Judge Lexical Resource and Grammar from the transcript.`
    : `No audio is available, so judge Pronunciation conservatively from fluency/coherence signals and clearly flag in pronunciation_notes that it is estimated from text only. Never invent a confident pronunciation band.`

  return `${EXAMINER_PERSONA}

${SPEAKING_RUBRIC}

SPEAKING BAND ANCHORS (apply strictly):
- Band 2: barely communicates; mostly isolated words, long pauses, breakdowns.
- Band 3: only simple, short responses; frequent breakdowns; very limited range; answers do not develop.
- Band 4: conveys basic meaning on familiar topics, but answers are short, error-prone and underdeveloped, with frequent grammatical and lexical mistakes.
- Band 5: keeps simple exchanges going with some flexibility, but limited range and frequent errors; little complex language.
- Band 6: generally effective communication, some complex language and reasonable development despite noticeable errors.
- Band 7+: fluent, flexible and largely accurate, with well-developed answers.
A test of very short, repetitive, error-heavy one-line answers is band 3 — not 4 or 5.

Assess this full IELTS Speaking test (Parts 1–3) as a single examiner would — one band per criterion for the whole test. Do not average the criteria yourself.

OBJECTIVE FLUENCY MEASUREMENTS (use these to ground Fluency & Coherence, alongside the wording): ${fluencySummary}

${pronInstruction}

ENGLISH ONLY: IELTS Speaking is assessed in English. If the answers are wholly or mostly not in English, they cannot be assessed — award band 1–2 on every criterion and state this. NEVER translate non-English answers in order to score them.

${JSON_SHAPE}

Output the JSON object ONLY — no preamble, no commentary, no code fences.`
}

// gpt-audio doesn't support response_format:json_object and may wrap its JSON in
// prose or a ```json fence, so pull out the first {...} block before parsing.
function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const body = fenced ? fenced[1] : raw
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  return start !== -1 && end > start ? body.slice(start, end + 1) : body
}

function parseAssessment(raw: string): SpeakingResult {
  const j = JSON.parse(extractJson(raw)) as Partial<SpeakingResult>
  const crit = (c?: Partial<CriterionResult>): CriterionResult => ({
    band: clampBand(typeof c?.band === 'number' ? c.band : NaN),
    evidence: typeof c?.evidence === 'string' ? c.evidence : '',
  })
  return {
    criteria: {
      fluency: crit(j.criteria?.fluency),
      lexical: crit(j.criteria?.lexical),
      grammar: crit(j.criteria?.grammar),
      pronunciation: crit(j.criteria?.pronunciation),
    },
    overview: typeof j.overview === 'string' ? j.overview : '',
    strengths: Array.isArray(j.strengths) ? j.strengths.filter(s => typeof s === 'string') : [],
    improvements: Array.isArray(j.improvements) ? j.improvements.filter(s => typeof s === 'string') : [],
    next_band_tip: typeof j.next_band_tip === 'string' ? j.next_band_tip : '',
    pronunciation_notes: typeof j.pronunciation_notes === 'string' ? j.pronunciation_notes : '',
  }
}

export async function POST(request: NextRequest) {
  const { user, error: gate } = await gateAiRequest('speaking')
  if (gate) return gate

  let body: { topic?: string; sessionId?: string; durationMinutes?: number; turns?: IncomingTurn[]; audioPath?: string; fluencyMetrics?: unknown }
  try {
    body = await request.json()
  } catch {
    return err('Invalid request body', 400)
  }

  if (Array.isArray(body.turns) && body.turns.length > 40) {
    return err('Too many turns in the session.', 400)
  }
  const turns = (body.turns ?? []).filter(tn => tn?.answer?.trim())
  if (turns.length === 0) {
    return err('No answers to assess.', 400)
  }

  const topic = body.topic?.trim() || 'Full speaking test'
  const transcript = turns
    .map(tn => `[Part ${tn.part}] Examiner: ${tn.question}\nCandidate: ${tn.answer.trim()}`)
    .join('\n\n')

  const wordCount = transcript.split(/\s+/).filter(Boolean).length
  if (wordCount < 20) {
    return err('Response is too short to evaluate. Please answer more fully.', 400)
  }
  if (transcript.length > 16000) {
    return err('Transcript is too long (max ~16000 characters).', 413)
  }

  // Aggregate fluency metrics across all answered turns into one summary line.
  const agg = turns.reduce(
    (a, tn) => ({
      duration_ms: a.duration_ms + (tn.duration_ms ?? 0),
      words: a.words + (tn.words ?? 0),
      pause_count: a.pause_count + (tn.pause_count ?? 0),
      pause_total_ms: a.pause_total_ms + (tn.pause_total_ms ?? 0),
    }),
    { duration_ms: 0, words: 0, pause_count: 0, pause_total_ms: 0 },
  )
  const speakingMs = Math.max(0, agg.duration_ms - agg.pause_total_ms)
  const aggMetrics: FluencyMetrics = {
    duration_ms: agg.duration_ms,
    words: agg.words,
    pause_count: agg.pause_count,
    pause_total_ms: agg.pause_total_ms,
    speech_rate_wpm: speakingMs > 0 ? Math.round((agg.words / speakingMs) * 60_000 * 10) / 10 : null,
  }
  // The session aggregate prefers the Whisper word-level metrics the client
  // derived from the whole recording (accurate pauses + speech rate); the summed
  // per-turn VAD metrics are the fallback when that Whisper pass was unavailable.
  const whisperMetrics = sanitizeFluencyMetrics(body.fluencyMetrics)
  const fluencyMetrics: FluencyMetrics | null = whisperMetrics ?? (agg.duration_ms > 0 ? aggMetrics : null)
  const fluencySummary = fluencyMetrics
    ? describeFluency(fluencyMetrics)
    : 'no timing metrics available (judge fluency from wording only)'

  // Audio source for acoustic grading: the whole-session recording from a live
  // realtime test (top-level audioPath), or else the Part 2 long-turn clip.
  const part2 = turns.find(tn => tn.part === 2 && tn.audioPath)
  const acousticPath = body.audioPath?.trim() || part2?.audioPath
  let audioBase64: string | null = null
  let audioFormat: 'wav' | 'mp3' = 'wav'
  if (acousticPath) {
    audioBase64 = await downloadSpeakingAudioBase64(acousticPath)
    audioFormat = acousticPath.endsWith('.mp3') ? 'mp3' : 'wav'
  }
  const hasAudio = audioBase64 !== null

  try {
    // Run the assessment. With audio we use the audio-capable model and judge
    // pronunciation from the real sound; if that call fails for any reason
    // (audio too long, model hiccup), fall back to a text-only grade so the
    // candidate always gets a band.
    const runGrade = async (useAudio: boolean): Promise<SpeakingResult> => {
      const content: Array<
        | { type: 'text'; text: string }
        | { type: 'input_audio'; input_audio: { data: string; format: 'wav' | 'mp3' } }
      > = [
        { type: 'text', text: `FULL IELTS SPEAKING TEST (Parts 1–3):\n${transcript}` },
      ]
      if (useAudio && audioBase64) {
        content.push({ type: 'text', text: 'A recording of the candidate speaking follows — use it to judge Pronunciation and Fluency:' })
        content.push({ type: 'input_audio', input_audio: { data: audioBase64, format: audioFormat } })
      }
      const completion = await openai.chat.completions.create({
        model: useAudio ? 'gpt-audio' : 'gpt-4o',
        modalities: ['text'], // text output only (the audio model can speak; we don't want that)
        temperature: 0.2,
        max_tokens: 1300,
        // gpt-audio rejects response_format:json_object, so only the text model
        // gets the strict JSON mode; the audio model is parsed leniently.
        ...(useAudio ? {} : { response_format: { type: 'json_object' as const } }),
        messages: [
          { role: 'system', content: buildSystemPrompt(useAudio, fluencySummary) },
          { role: 'user', content },
        ],
      })
      return parseAssessment(completion.choices[0]?.message?.content ?? '{}')
    }

    let usedAudio = hasAudio
    let result: SpeakingResult
    try {
      result = await runGrade(hasAudio)
    } catch (audioErr) {
      if (!hasAudio) throw audioErr
      console.error('[AI speaking] audio grade failed, falling back to text-only', audioErr)
      usedAudio = false
      result = await runGrade(false)
    }

    const fluency = result.criteria.fluency.band
    const lexical = result.criteria.lexical.band
    const grammar = result.criteria.grammar.band
    const pronunciation = result.criteria.pronunciation.band
    const band = overallBand([fluency, lexical, grammar, pronunciation])

    const scored = {
      band_score: band,
      fluency_score: fluency,
      lexical_score: lexical,
      grammar_score: grammar,
      pronunciation_score: pronunciation,
    }
    const feedback = {
      overview: result.overview,
      strengths: result.strengths,
      improvements: result.improvements,
      next_band_tip: result.next_band_tip,
      criteria: result.criteria,
    }

    const admin = createAdminClient()
    const { data: submission } = await admin
      .from('speaking_submissions')
      .insert({
        user_id:             user.id,
        mode:                'full_test',
        part:                null,
        topic,
        transcript,
        audio_url:           acousticPath ?? null,
        band_score:          scored.band_score,
        fluency_score:       scored.fluency_score,
        pronunciation_score: scored.pronunciation_score,
        lexical_score:       scored.lexical_score,
        grammar_score:       scored.grammar_score,
        ai_feedback:         JSON.stringify({ notes: result.pronunciation_notes, ...feedback }),
      })
      .select('id')
      .single()

    // Persist each turn (transcript, audio path, metrics) for later review.
    if (submission?.id) {
      const turnRows = turns.map((tn, i) => ({
        submission_id:   submission.id,
        user_id:         user.id,
        turn_index:      i,
        part:            tn.part,
        role:            'candidate',
        question_text:   tn.question,
        transcript:      tn.answer.trim(),
        audio_url:       tn.audioPath ?? null,
        duration_ms:     tn.duration_ms ?? null,
        words:           tn.words ?? null,
        pause_count:     tn.pause_count ?? null,
        pause_total_ms:  tn.pause_total_ms ?? null,
        speech_rate_wpm: tn.speech_rate_wpm ?? null,
      }))
      await admin.from('speaking_turns').insert(turnRows)
    }

    await admin.from('band_score_history').insert({
      user_id:   user.id,
      skill:     'speaking',
      score:     scored.band_score,
      source:    'speaking_submission',
      source_id: submission?.id ?? null,
    })

    // Real duration: prefer the client-reported elapsed time, fall back to the
    // summed recording time, then to a sensible minimum.
    const durationMinutes = Math.max(
      1,
      Math.round(body.durationMinutes ?? (agg.duration_ms / 60_000)),
    )
    await admin.from('study_sessions').insert({
      user_id:          user.id,
      skill:            'speaking',
      activity_type:    'mock_test',
      duration_minutes: durationMinutes,
    })

    await recordUsage(user.id, 'speaking')

    return NextResponse.json({
      submission_id:       submission?.id,
      pronunciation_notes: result.pronunciation_notes,
      pronunciation_from_audio: usedAudio,
      fluency_metrics:     fluencyMetrics,
      feedback,
      ...scored,
    })
  } catch (e) {
    console.error('[AI speaking]', e)
    return err('Failed to generate feedback. Please try again.', 500)
  }
}
