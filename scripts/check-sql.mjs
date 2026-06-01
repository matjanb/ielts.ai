import { readFileSync } from 'node:fs'
const s = readFileSync(new URL('../supabase/migrations/010_vocabulary.sql', import.meta.url), 'utf8')
let i = 0, line = 1, inStr = false, inLineComment = false
let outside = ''
const lineOf = []
const N = s.length
while (i < N) {
  const c = s[i]
  if (c === '\n') { line++; inLineComment = false; if (!inStr) outside += ' '; i++; continue }
  if (inLineComment) { i++; continue }
  if (inStr) {
    if (c === "'") {
      if (s[i + 1] === "'") { i += 2; continue }
      inStr = false; i++; continue
    }
    i++; continue
  }
  // dollar-quoted string: $v$ ... $v$  (and $v1$ etc.)
  const dollar = !inStr && /^\$v\d*\$/.exec(s.slice(i))
  if (dollar) {
    const tag = dollar[0]
    const end = s.indexOf(tag, i + tag.length)
    const stop = end === -1 ? N : end + tag.length
    for (let k = i; k < stop; k++) if (s[k] === '\n') line++
    outside += ' '
    i = stop
    continue
  }
  if (c === "'") { inStr = true; i++; continue }
  if (c === '-' && s[i + 1] === '-') { inLineComment = true; i += 2; continue }
  outside += c
  lineOf.push(line)
  i++
}
const m = [...outside.matchAll(/\bthe\b/gi)]
console.log('bareword "the" outside strings:', m.length)
console.log('string still open at EOF:', inStr)
for (const x of m.slice(0, 8)) {
  console.log('  line', lineOf[x.index], '::', JSON.stringify(outside.slice(Math.max(0, x.index - 50), x.index + 15).replace(/\s+/g, ' ')))
}
