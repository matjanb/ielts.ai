import { NextRequest, NextResponse } from 'next/server'
import openai from '@/lib/openai/client'
import { gateAiRequest, recordUsage, err } from '@/lib/api/helpers'

// The dynamic AI examiner. Given the conversation so far, it produces the NEXT
// examiner move — reacting to what the candidate just said rather than reading
// from a fixed script. The server owns the test STRUCTURE (how many questions
// per part, when to move on, when to end) so the exam can't run away; the model
// owns the WORDING and the contextual follow-ups.

interface DialogueTurn { role: 'examiner' | 'candidate'; part: 1 | 2 | 3; text: string }

// Structural targets, mirroring a real ~11–14 minute test.
const PART1_QUESTIONS = 8   // a handful of questions across 2–3 familiar topics
const PART2_FOLLOWUPS = 2   // short rounding-off questions after the long turn
const PART3_QUESTIONS = 5   // two-way discussion
const HARD_CAP = 20         // absolute safety cap on candidate answers

type Stage =
  | { part: 1; kind: 'question' }
  | { part: 2; kind: 'cue' }
  | { part: 2; kind: 'followup' }
  | { part: 3; kind: 'question' }
  | { kind: 'end' }

/**
 * Decide what comes next purely from how many answers the candidate has given
 * in each part. Deterministic structure, dynamic wording.
 */
function nextStage(turns: DialogueTurn[]): Stage {
  const answered = turns.filter(t => t.role === 'candidate')
  if (answered.length >= HARD_CAP) return { kind: 'end' }

  const p1 = answered.filter(t => t.part === 1).length
  const p2 = answered.filter(t => t.part === 2).length
  const p3 = answered.filter(t => t.part === 3).length
  const cueAsked = turns.some(t => t.role === 'examiner' && t.part === 2)

  if (p1 < PART1_QUESTIONS) return { part: 1, kind: 'question' }
  if (!cueAsked) return { part: 2, kind: 'cue' }
  // p2 counts include the long-turn answer itself, so allow long turn + followups.
  if (p2 < 1 + PART2_FOLLOWUPS) return { part: 2, kind: 'followup' }
  if (p3 < PART3_QUESTIONS) return { part: 3, kind: 'question' }
  return { kind: 'end' }
}

const SYSTEM = `You are Sarah, a warm but professional IELTS Speaking examiner conducting a live test. You ask ONE thing at a time and react naturally to what the candidate just said. Keep examiner language clear, neutral and concise — never coach, correct, or comment on their English.

Test structure:
- Part 1: short, personal questions on familiar topics (home, work/study, hobbies, daily life). Group a few questions around each topic before moving on.
- Part 2: a cue card — give a topic with 3–4 bullet points to cover; the candidate gets 1 minute to prepare and speaks for 1–2 minutes; then ask 1–2 short rounding-off questions.
- Part 3: a two-way discussion of more abstract questions thematically linked to the Part 2 topic.

React to the candidate's previous answers: occasionally pick up a detail they mentioned for a natural follow-up. Do not repeat questions already asked.`

interface ExaminerMove {
  question: string
  part: 1 | 2 | 3
  lead?: string
  isCueCard?: boolean
  cueCard?: { topic: string; bullets: string[] }
  endOfTest?: boolean
}

function instructionFor(stage: Stage): string {
  switch (true) {
    case stage.kind === 'end':
      return 'The test is complete. Thank the candidate briefly and close the test. Set "endOfTest": true and "part": 3.'
    case 'part' in stage && stage.part === 1 && stage.kind === 'question':
      return 'Ask the next Part 1 question. Set "part": 1. If you are starting a new topic, put a short transition in "lead" (e.g. "Now let\'s talk about..."). Otherwise omit "lead".'
    case 'part' in stage && stage.part === 2 && stage.kind === 'cue':
      return 'Introduce the Part 2 long turn. Set "part": 2, "isCueCard": true, and provide "cueCard" with a "topic" (a "Describe ..." prompt) and 3–4 "bullets". Put the spoken instruction in "question".'
    case 'part' in stage && stage.part === 2 && stage.kind === 'followup':
      return 'Ask ONE short rounding-off question directly related to what the candidate described in their long turn. Set "part": 2.'
    case 'part' in stage && stage.part === 3 && stage.kind === 'question':
      return 'Ask the next Part 3 discussion question — more abstract, linked to the Part 2 theme. Set "part": 3. If this is the first Part 3 question, add a short "lead" introducing the discussion.'
    default:
      return 'Ask an appropriate next question.'
  }
}

export async function POST(request: NextRequest) {
  const { user, error: gate } = await gateAiRequest('speaking_examiner')
  if (gate) return gate

  let body: { turns?: DialogueTurn[] }
  try {
    body = await request.json()
  } catch {
    return err('Invalid request body', 400)
  }

  const turns = (body.turns ?? []).filter(t => t && (t.role === 'examiner' || t.role === 'candidate'))
  if (turns.length > 60) return err('Conversation too long.', 400)

  const stage = nextStage(turns)

  // Short-circuit the end so a closed test never burns a model call.
  if (stage.kind === 'end') {
    await recordUsage(user.id, 'speaking_examiner')
    return NextResponse.json({
      question: 'That is the end of the speaking test. Thank you very much.',
      part: 3,
      endOfTest: true,
    } satisfies ExaminerMove)
  }

  const transcript = turns.length
    ? turns.map(t => `${t.role === 'examiner' ? 'Examiner' : 'Candidate'} (Part ${t.part}): ${t.text}`).join('\n')
    : '(the test is just beginning)'

  try {
    const completion = await openai.chat.completions.create({
      // mini is plenty for generating one structured question and keeps the
      // between-turns wait short; the server already enforces test structure.
      model: 'gpt-4o-mini',
      temperature: 0.7,
      max_tokens: 350,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM },
        {
          role: 'user',
          content: `Conversation so far:\n${transcript}\n\nNOW DO THIS: ${instructionFor(stage)}\n\nReturn ONLY JSON: { "question": string, "part": 1|2|3, "lead"?: string, "isCueCard"?: boolean, "cueCard"?: { "topic": string, "bullets": string[] }, "endOfTest"?: boolean }`,
        },
      ],
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(raw) as Partial<ExaminerMove>

    // Trust the server-computed part over whatever the model returns. The
    // 'end' stage was already short-circuited above, so `stage` always has a part.
    const part = stage.part
    const move: ExaminerMove = {
      question: typeof parsed.question === 'string' && parsed.question.trim() ? parsed.question.trim() : 'Could you tell me a little more about that?',
      part,
      lead: typeof parsed.lead === 'string' ? parsed.lead : undefined,
      isCueCard: stage.kind === 'cue',
      cueCard: stage.kind === 'cue' && parsed.cueCard
        ? {
            topic: String(parsed.cueCard.topic ?? ''),
            bullets: Array.isArray(parsed.cueCard.bullets) ? parsed.cueCard.bullets.map(String).slice(0, 5) : [],
          }
        : undefined,
      endOfTest: false,
    }

    await recordUsage(user.id, 'speaking_examiner')
    return NextResponse.json(move)
  } catch (e) {
    console.error('[AI examiner]', e)
    return err('The examiner is unavailable right now. Please try again.', 500)
  }
}
