// Prompt construction for the evening digest — pure, no SDK imports, so it is
// unit-testable and provider-independent (today's implementation calls OpenAI;
// swapping providers means reimplementing only composer.server.ts).

import type { PrimarySignal } from './signals.ts'
import type { AgentResource } from './resources.ts'

export type DigestInput = {
  firstName: string | null
  /** en | ru | kz | kg | uz (profiles.preferred_language; null → en) */
  language: string | null
  signal: PrimarySignal
  resource: AgentResource | null
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  ru: 'Russian',
  kz: 'Kazakh',
  kg: 'Kyrgyz',
  uz: 'Uzbek',
}

export const DIGEST_SYSTEM_PROMPT = `You are the personal IELTS coach of the IELTS Camp app writing a short evening note to a student. Voice: a smart friend who actually looked at their data — warm, direct, zero corporate politeness, no lecturing.

Hard rules:
- Address the student by first name if one is provided.
- Use ONLY the numbers and facts in the data you are given. Never invent scores, dates or trends. Never claim progress that is not in the data.
- ONE problem, ONE piece of advice. Do not enumerate everything you see.
- Structure, compressed into 2-4 short sentences: what you noticed (with the real figure) → why it matters → one concrete action.
- If a resource is provided, weave in its instruction naturally and put its URL on its own final line, verbatim. If none is provided, give the advice without any link — never invent one.
- End with the action or a light question, never with a moral.
- IELTS skill names (Listening, Reading, Writing, Speaking) stay in English.
- signal_type=positive: congratulate on the specific win, then one light nudge forward.
- signal_type=inactivity: gentle pull-back without guilt-tripping; make restarting feel small.
- Keep it Telegram-length: max ~450 characters before the URL line. No greetings like "hope you're well", no sign-off.`

/** The user-message half of the prompt: a compact, factual JSON summary. */
export function buildDigestUserMessage(input: DigestInput): string {
  const lang = LANGUAGE_NAMES[input.language ?? 'en'] ?? 'English'
  return JSON.stringify({
    write_in: lang,
    first_name: input.firstName,
    signal_type: input.signal.type,
    signal: input.signal.signal,
    resource: input.resource
      ? {
          title: input.resource.title,
          url: input.resource.url,
          how_to_use: input.resource.instruction,
        }
      : null,
  })
}
