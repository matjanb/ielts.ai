import { NextResponse } from 'next/server'
import openai from '@/lib/openai/client'
import { gateAiRequest, recordUsage, err } from '@/lib/api/helpers'

// Mints a short-lived Realtime client secret so the browser can open a direct,
// low-latency speech-to-speech WebRTC connection to the examiner WITHOUT the
// per-turn Whisper -> LLM -> TTS round trips that made the old flow crawl. The
// main API key never leaves the server; the ephemeral token (ek_...) is safe to
// hand to the client and is good for one test.

const EXAMINER_INSTRUCTIONS = `You are Sarah, a warm but professional IELTS Speaking examiner running a live, spoken mock test. Speak naturally and conversationally, at a calm, clear pace.

Rules:
- English only. If the candidate speaks another language, gently remind them the test is in English.
- Ask ONE question at a time, then stop and listen. Never answer for them.
- React briefly and naturally to what they said ("Mm, interesting.", "I see.") before the next question — but never coach, correct, or comment on their English, and never reveal a score.
- Keep your own turns short. The candidate should do most of the talking.

Run the test in three phases, moving through them naturally without announcing them rigidly:
1. Introduction & interview: a few short questions about familiar topics (home, work/study, hobbies, daily life).
2. Long turn: give the candidate a single topic to talk about for 1–2 minutes (a "I'd like you to talk about..." prompt). Let them speak at length; only interrupt if they go very long.
3. Discussion: a few more abstract, two-way discussion questions linked to the long-turn topic.

After roughly 12–14 candidate responses across the phases, bring the test to a natural close: thank them and say the test is complete. Begin the conversation yourself by greeting the candidate and asking the first question.`

export async function POST() {
  const { user, error: gate } = await gateAiRequest('speaking_realtime')
  if (gate) return gate

  try {
    const secret = await openai.realtime.clientSecrets.create({
      expires_after: { anchor: 'created_at', seconds: 600 },
      session: {
        type: 'realtime',
        model: 'gpt-realtime-mini',
        instructions: EXAMINER_INSTRUCTIONS,
        output_modalities: ['audio'],
        audio: {
          input: {
            transcription: { model: 'whisper-1', language: 'en' },
            // Semantic VAD decides when the candidate has actually finished a
            // thought (not just paused), so turn-taking feels natural and
            // hands-free — no button, no premature cut-offs.
            turn_detection: { type: 'semantic_vad' },
          },
          output: { voice: 'sage' },
        },
      },
    })

    await recordUsage(user.id, 'speaking_realtime')
    return NextResponse.json({ value: secret.value, expires_at: secret.expires_at, model: 'gpt-realtime-mini' })
  } catch (e) {
    console.error('[AI realtime session]', e)
    return err('Could not start the live examiner. Please try again.', 500)
  }
}
