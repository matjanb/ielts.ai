import 'server-only'
import openai from '@/lib/openai/client'
import { DIGEST_SYSTEM_PROMPT, buildDigestUserMessage, type DigestInput } from './composerPrompt.ts'

// The one paid call of the coach agent: turn a precomputed signal summary into
// a human message. Patterns are already computed in code — the model only
// writes text, so the cheap model is enough (same choice as roast/checker).
// Swapping providers later touches only this file; the prompt is shared.
const DIGEST_MODEL = 'gpt-4o-mini'

export async function composeDigest(input: DigestInput): Promise<string> {
  // Bounded per-user: one stuck completion must not eat the cron's 300s budget.
  const res = await openai.chat.completions.create({
    model: DIGEST_MODEL,
    temperature: 0.7,
    max_tokens: 300,
    messages: [
      { role: 'system', content: DIGEST_SYSTEM_PROMPT },
      { role: 'user', content: buildDigestUserMessage(input) },
    ],
  }, { timeout: 30_000, maxRetries: 1 })
  const text = res.choices[0]?.message?.content?.trim()
  if (!text) throw new Error('composeDigest: empty completion')
  return text
}
