// Shared parsing for multiple-choice questions, whose options live in several
// inconsistent shapes across the dataset:
//   • inline in the question text:  "What…? A) foo B) bar C) baz D) qux"  (answer = letter)
//   • options object (letter keys):  {"A":"foo","B":"bar"}                 (answer = letter)
//   • options object (image MC):     {"A":"A","B":"B","image_options":true} + image_url
//   • options object (new choices):  {"choices":[{"key":"A","text":"foo"}]} (answer = key)
//   • options array (legacy):        ["A. foo","B. bar"]                    (answer = full string)
//
// `value` is what we store/compare for scoring, so it matches whatever the
// correct_answer column holds for that shape (letter vs. full string).

export interface McOption { letter: string; text: string; value: string }

/** Parse MC options from the options column, falling back to inline "A) …" text. */
export function parseMcOptions(q: { options?: unknown; question_text: string }): McOption[] {
  const opts = q.options

  // Array (legacy): value is the full string, e.g. "A. foo".
  if (Array.isArray(opts) && opts.length > 0) {
    return (opts as string[]).map((opt, i) => {
      const m = opt.match(/^([A-Z])[.)]\s*(.+)$/)
      return { letter: m ? m[1] : String.fromCharCode(65 + i), text: m ? m[2] : opt, value: opt }
    })
  }

  if (opts && typeof opts === 'object') {
    const obj = opts as Record<string, unknown>
    // New: {"choices":[{"key","text"}]}
    if (Array.isArray(obj.choices)) {
      return (obj.choices as Array<{ key: string; text: string }>).map(c => ({
        letter: c.key, text: c.text, value: c.key,
      }))
    }
    // Letter-keyed: {"A":"foo","B":"bar"} (incl. image MC where text == letter).
    const keyed = ['A', 'B', 'C', 'D', 'E', 'F'].filter(k => k in obj && typeof obj[k] === 'string')
    if (keyed.length > 0) {
      return keyed.map(k => ({ letter: k, text: obj[k] as string, value: k }))
    }
  }

  // Inline in the question text: "… A) foo B) bar C) baz". value = letter.
  const text = q.question_text.replace(/^\[[\s\S]*?\]\s*/, '')
  const matches = text.match(/[A-H][).]\s[\s\S]+?(?=\s[A-H][).]\s|$)/g)
  if (matches && matches.length >= 2) {
    return matches.map(seg => {
      const m = seg.match(/^([A-H])[).]\s*([\s\S]*)$/)
      return { letter: m![1], text: (m![2] ?? '').trim(), value: m![1] }
    })
  }

  return []
}

/** True when the MC options are image tiles (the visual lives in image_url). */
export function isImageOptions(q: { options?: unknown }): boolean {
  const o = q.options
  return !!o && typeof o === 'object' && !Array.isArray(o) && (o as Record<string, unknown>).image_options === true
}

/** Question text with the leading "[…]" instruction and any inline "A) …" options removed. */
export function mcQuestionText(raw: string): string {
  const text = raw.replace(/^\[[\s\S]*?\]\s*/, '')
  const cut = text.search(/\s[A-H][).]\s/)
  return (cut > 0 ? text.slice(0, cut) : text).trim()
}

/** image_url: a JSON array string → per-option images; a plain URL → one image. */
export function parseImageUrl(raw: string | null | undefined): { singleImage: string | null; optionImages: string[] } {
  if (!raw) return { singleImage: null, optionImages: [] }
  if (raw.startsWith('[')) {
    try {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) return { singleImage: null, optionImages: arr as string[] }
    } catch { /* fall through to single image */ }
  }
  return { singleImage: raw, optionImages: [] }
}
