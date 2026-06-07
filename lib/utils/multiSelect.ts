// "Choose TWO/THREE letters (in either order)" questions are stored as several
// linked rows — one answer slot each — that must be shown as ONE checkbox block.
//
// Two storage conventions exist in the data:
//   • Reading: each row repeats the full stem + inline "A) … B) …" options, and a
//     bracket "[Choose TWO letters, A–E …]". The second row's stem is identical.
//   • Listening: the primary row carries the options object plus {multi:true,
//     select_count:N, linked_pair}; companion rows carry {multi, hidden_label}.
//
// Scoring stays per-row on the server (it never trusts the client and never sends
// the answers down). It works because the seed stores each group's correct
// letters in ascending order, and we always assign the user's picks sorted by
// option order — so slot 1 gets the earliest letter, slot 2 the next, etc.

import type { Question } from '@/lib/types/database'
import { parseMcOptions, mcQuestionText } from './mcOptions'

type QLike = Pick<Question, 'question_text' | 'options'> & { question_type?: string }

function optionsObj(q: QLike): Record<string, unknown> | null {
  const o = q.options
  return o && typeof o === 'object' && !Array.isArray(o) ? (o as Record<string, unknown>) : null
}

/** Normalised stem (the shared wording, without the inline "A) … B) …" options). */
function stemKey(q: QLike): string {
  return mcQuestionText(q.question_text).toLowerCase().replace(/\s+/g, ' ').trim()
}
/** Signature of the parsed option set — to test "do these rows share options?". */
function optsKey(q: QLike): string {
  return parseMcOptions(q).map(o => `${o.letter}:${o.text}`).join('|')
}
/** Listening companion slot: explicit metadata, no options of its own. */
function isCompanion(q: QLike): boolean {
  const o = optionsObj(q)
  return o?.multi === true && o?.hidden_label === true
}
/** Listening primary: explicit multi metadata, carries the options. */
function isMultiPrimary(q: QLike): boolean {
  return optionsObj(q)?.multi === true && parseMcOptions(q).length > 0
}
/**
 * Two consecutive rows belong to the same multi-select block when they share the
 * exact same stem AND the same options — that only happens for a split "choose N"
 * question, never for two genuinely different ones. Works for any wording
 * ("Choose TWO letters…" or "Which TWO of the following…").
 */
function sameStemOpts(a: QLike, b: QLike): boolean {
  const sk = stemKey(a)
  return sk.length > 0 && sk === stemKey(b) && optsKey(a).length > 0 && optsKey(a) === optsKey(b)
}

export type GroupedItem<T> =
  | { kind: 'single'; question: T }
  | { kind: 'multi'; questions: T[] }

/**
 * Collapse linked "choose N letters" rows into single multi-select items, leaving
 * every other question on its own. A group is detected purely from structure:
 * consecutive rows that repeat the same stem+options (Reading), or a primary with
 * multi metadata followed by its hidden companions (Listening). Order-preserving,
 * generic so it keeps the caller's row type (e.g. QuestionWithSection).
 */
export function groupQuestions<T extends QLike & { question_number: number; id: string }>(qs: T[]): GroupedItem<T>[] {
  const items: GroupedItem<T>[] = []
  let i = 0
  while (i < qs.length) {
    const q = qs[i]
    if (parseMcOptions(q).length > 0) {
      const cap = optionsObj(q)?.select_count
      const maxLen = typeof cap === 'number' && cap > 0 ? cap : Infinity
      const group = [q]
      let j = i + 1
      while (j < qs.length && group.length < maxLen) {
        const next = qs[j]
        // Listening companion (metadata) or Reading repeated stem+options.
        if ((isMultiPrimary(q) && isCompanion(next)) || sameStemOpts(q, next)) {
          group.push(next); j++
        } else break
      }
      if (group.length >= 2) { items.push({ kind: 'multi', questions: group }); i = j; continue }
    }
    items.push({ kind: 'single', question: q }); i++
  }
  return items
}

/**
 * Spread the chosen letters across the group's row ids, sorted by option order,
 * so per-row server scoring stays correct regardless of click order. Returns the
 * value to store for each row id (parallel to `questions`).
 */
export function distributeSelection(
  selected: string[],
  optionOrder: string[],
  rowCount: number,
): string[] {
  const sorted = [...selected].sort((a, b) => optionOrder.indexOf(a) - optionOrder.indexOf(b))
  return Array.from({ length: rowCount }, (_, i) => sorted[i] ?? '')
}
