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

const WORD_TO_N: Record<string, number> = { two: 2, three: 3, four: 4, five: 5 }

/** Is this a "choose N letters, in either order" multi-select question? */
export function isMultiSelect(q: QLike): boolean {
  if (optionsObj(q)?.multi === true) return true
  return /\bchoose\s+(two|three|four|five|\d+)\s+letters/i.test(q.question_text)
}

/** How many letters the group expects (select_count, the bracket word, or 2). */
export function multiCount(q: QLike): number {
  const sc = optionsObj(q)?.select_count
  if (typeof sc === 'number' && sc > 0) return sc
  const m = q.question_text.match(/\bchoose\s+(two|three|four|five|\d+)\s+letters/i)
  if (m) return (WORD_TO_N[m[1].toLowerCase()] ?? parseInt(m[1], 10)) || 2
  return 2
}

/** True when `next` is a companion slot of the multi-select group started by `primary`. */
function isLinkedSecondary(next: QLike, primary: QLike): boolean {
  const no = optionsObj(next)
  if (no?.multi === true && no?.hidden_label === true) return true
  // Reading: same shared stem, also flagged as a "choose N letters" row.
  return isMultiSelect(next) && mcQuestionText(next.question_text) === mcQuestionText(primary.question_text)
}

export type GroupedItem<T> =
  | { kind: 'single'; question: T }
  | { kind: 'multi'; questions: T[] }

/**
 * Collapse linked "choose N letters" rows into single multi-select items, leaving
 * every other question on its own. Stable and order-preserving. Generic so it
 * keeps the caller's row type (e.g. QuestionWithSection).
 */
export function groupQuestions<T extends QLike & { question_number: number; id: string }>(qs: T[]): GroupedItem<T>[] {
  const items: GroupedItem<T>[] = []
  let i = 0
  while (i < qs.length) {
    const q = qs[i]
    // A group starts at a primary row that actually carries options.
    if (isMultiSelect(q) && parseMcOptions(q).length > 0) {
      const count = multiCount(q)
      const group = [q]
      let j = i + 1
      while (j < qs.length && group.length < count && isLinkedSecondary(qs[j], q)) {
        group.push(qs[j]); j++
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
