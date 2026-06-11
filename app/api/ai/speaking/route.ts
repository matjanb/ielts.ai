import { NextRequest, NextResponse } from 'next/server'
import openai from '@/lib/openai/client'
import { createAdminClient } from '@/lib/supabase/admin'
import { gateAiRequest, recordUsage, err } from '@/lib/api/helpers'
import { downloadSpeakingAudioBase64 } from '@/lib/services/speakingAudio.server'
import { SPEAKING_RUBRIC, EXAMINER_PERSONA } from '@/lib/ielts/rubrics'
import { clampBand, overallBand } from '@/lib/ielts/band'
import { describeFluency, type FluencyMetrics } from '@/lib/ielts/fluency'

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
    ? `You have been given the ACTUAL AUDIO of the candidate's Part 2 long turn. Judge Pronunciation from that audio (individual sounds, word/sentence stress, intonation, rhythm, intelligibility, effect of L1 accent) against the descriptor. Use the audio for pronunciation only; judge the other criteria from the full transcript.`
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

${JSON_SHAPE}`
}

function parseAssessment(raw: string): SpeakingResult {
  const j = JSON.parse(raw) as Partial<SpeakingResult>
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

  let body: { topic?: string; sessionId?: string; durationMinutes?: number; turns?: IncomingTurn[] }
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
  const fluencySummary = agg.duration_ms > 0
    ? describeFluency(aggMetrics)
    : 'no timing metrics available (judge fluency from wording only)'

  // Pronunciation source: the Part 2 long-turn recording, if it was stored.
  const part2 = turns.find(tn => tn.part === 2 && tn.audioPath)
  let audioBase64: string | null = null
  let audioFormat: 'wav' | 'mp3' = 'wav'
  if (part2?.audioPath) {
    audioBase64 = await downloadSpeakingAudioBase64(part2.audioPath)
    audioFormat = part2.audioPath.endsWith('.mp3') ? 'mp3' : 'wav'
  }
  const hasAudio = audioBase64 !== null

  try {
    const userContent: Array<
      | { type: 'text'; text: string }
      | { type: 'input_audio'; input_audio: { data: string; format: 'wav' | 'mp3' } }
    > = [
      { type: 'text', text: `FULL IELTS SPEAKING TEST (Parts 1–3):\n${transcript}` },
    ]
    if (hasAudio && audioBase64) {
      userContent.push({ type: 'text', text: 'Audio of the candidate\'s Part 2 long turn follows — use it to judge Pronunciation:' })
      userContent.push({ type: 'input_audio', input_audio: { data: audioBase64, format: audioFormat } })
    }

    const completion = await openai.chat.completions.create({
      // Audio-capable model when we have a recording to judge pronunciation
      // from; the standard model otherwise (no point paying for audio I/O).
      model: hasAudio ? 'gpt-audio' : 'gpt-4o',
      temperature: 0.2,
      max_tokens: 1300,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: buildSystemPrompt(hasAudio, fluencySummary) },
        { role: 'user', content: userContent },
      ],
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    const result = parseAssessment(raw)

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
        audio_url:           part2?.audioPath ?? null,
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
      pronunciation_from_audio: hasAudio,
      feedback,
      ...scored,
    })
  } catch (e) {
    console.error('[AI speaking]', e)
    return err('Failed to generate feedback. Please try again.', 500)
  }
}
