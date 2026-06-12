import { NextRequest, NextResponse } from 'next/server'
import openai from '@/lib/openai/client'
import { gateAiRequest, recordUsage, err } from '@/lib/api/helpers'

// Establishes the browser's Realtime WebRTC connection to the examiner. The
// client sends us its SDP offer; we mint a short-lived session (with the
// examiner persona baked in) and complete the SDP handshake with OpenAI
// server-side, returning the SDP answer. Proxying the handshake keeps the API
// key off the client AND avoids the browser ever calling api.openai.com
// directly (no cross-origin/preflight failures).

const MODEL = 'gpt-realtime-mini'

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

export async function POST(request: NextRequest) {
  const { user, error: gate } = await gateAiRequest('speaking_realtime')
  if (gate) return gate

  const offerSdp = await request.text()
  if (!offerSdp || !offerSdp.includes('v=')) return err('Missing SDP offer', 400)

  try {
    const secret = await openai.realtime.clientSecrets.create({
      expires_after: { anchor: 'created_at', seconds: 600 },
      session: {
        type: 'realtime',
        model: MODEL,
        instructions: EXAMINER_INSTRUCTIONS,
        output_modalities: ['audio'],
        audio: {
          input: {
            transcription: { model: 'whisper-1', language: 'en' },
            // Semantic VAD ends the candidate's turn when they've actually
            // finished a thought (not just paused) — natural, hands-free.
            turn_detection: { type: 'semantic_vad' },
          },
          output: { voice: 'sage' },
        },
      },
    })

    const sdpRes = await fetch(`https://api.openai.com/v1/realtime/calls?model=${encodeURIComponent(MODEL)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret.value}`, 'Content-Type': 'application/sdp' },
      body: offerSdp,
    })
    if (!sdpRes.ok) {
      console.error('[AI realtime connect] sdp', sdpRes.status, await sdpRes.text())
      return err('Could not reach the examiner. Please try again.', 502)
    }
    const answerSdp = await sdpRes.text()

    await recordUsage(user.id, 'speaking_realtime')
    return new NextResponse(answerSdp, { status: 200, headers: { 'Content-Type': 'application/sdp', 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.error('[AI realtime connect]', e)
    return err('Could not start the live examiner. Please try again.', 500)
  }
}
