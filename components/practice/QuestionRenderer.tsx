'use client'

import type { CSSProperties } from 'react'
import type { Question } from '@/lib/types/database'
import { isAnswerCorrect } from '@/lib/utils/answerChecking'
import { parseMcOptions, mcQuestionText, parseImageUrl } from '@/lib/utils/mcOptions'
import { useLanguage } from '@/lib/i18n/LanguageContext'

/* Strip a leading "[...]" instruction block from the question text. */
function stripPrefix(text: string): string {
  return text.replace(/^\[[\s\S]*?\]\s*/, '').trim()
}
function bracket(text: string): string | null {
  const m = text.match(/^\[([\s\S]*?)\]/)
  return m ? m[1] : null
}
/* Parse "A=Foo B=Bar" / "i=Foo ii=Bar" option lists into {key,label}. */
function parseKeyed(src: string): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = []
  const re = /([A-Za-z]{1,4})=\s*(.*?)(?=\s+[A-Za-z]{1,4}=|$)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(src))) out.push({ key: m[1], label: m[2].trim() })
  return out
}

const selectStyle: CSSProperties = {
  padding: '8px 12px', borderRadius: 8, fontSize: 14,
  border: '1px solid var(--border-strong)', background: 'var(--bg-elev)',
  color: 'var(--text)', outline: 'none', cursor: 'pointer', maxWidth: '100%',
}
const inputStyle: CSSProperties = {
  padding: '9px 12px', borderRadius: 8, fontSize: 14,
  border: '1px solid var(--border-strong)', background: 'var(--bg-elev)',
  color: 'var(--text)', outline: 'none', minWidth: 220,
}

// Visual state of a selectable option (card / button / tile).
type OptState = 'idle' | 'selected' | 'correct' | 'wrong'
function optColors(state: OptState): { border: string; bg: string; fg: string } {
  switch (state) {
    case 'correct': return { border: 'var(--accent)', bg: 'color-mix(in srgb, var(--accent) 14%, transparent)', fg: 'var(--accent)' }
    case 'wrong':   return { border: 'var(--danger)', bg: 'color-mix(in srgb, var(--danger) 12%, transparent)', fg: 'var(--danger)' }
    case 'selected':return { border: 'var(--accent)', bg: 'var(--accent-soft)', fg: 'var(--accent)' }
    default:        return { border: 'var(--border)', bg: 'var(--bg-elev)', fg: 'var(--text)' }
  }
}

export function QuestionRenderer({
  question, value, onChange, revealed = false,
}: {
  question: Question
  value: string
  onChange: (v: string) => void
  revealed?: boolean
}) {
  const { t } = useLanguage()
  const type = question.question_type
  const correctAns = question.correct_answer ?? ''
  const isCorrect = revealed && isAnswerCorrect(value, correctAns)

  // Resolve the visual state of one option given the user's value + reveal mode.
  const stateOf = (optValue: string): OptState => {
    const selected = value === optValue
    if (!revealed) return selected ? 'selected' : 'idle'
    if (isAnswerCorrect(optValue, correctAns)) return 'correct'
    return selected ? 'wrong' : 'idle'
  }

  const qText = type === 'multiple_choice' ? mcQuestionText(question.question_text) : stripPrefix(question.question_text)

  let input: React.ReactNode = null

  // ── True / False / Not Given  (or Yes / No / Not Given) ───────────────────
  if (type === 'true_false') {
    const br = bracket(question.question_text) ?? ''
    const opts = /\btrue\b/i.test(br) ? ['TRUE', 'FALSE', 'NOT GIVEN'] : ['YES', 'NO', 'NOT GIVEN']
    input = (
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {opts.map(opt => {
          const c = optColors(stateOf(opt))
          return (
            <button
              key={opt}
              onClick={() => !revealed && onChange(opt)}
              disabled={revealed}
              style={{
                flex: '1 1 0', minWidth: 96, padding: '11px 12px', borderRadius: 10,
                fontSize: 13.5, fontWeight: 700, letterSpacing: '0.01em',
                border: `1.5px solid ${c.border}`, background: c.bg, color: c.fg,
                cursor: revealed ? 'default' : 'pointer', transition: 'all .15s',
              }}
            >
              {opt}
            </button>
          )
        })}
      </div>
    )

  // ── Multiple choice  (text cards, single-image, or per-option image tiles) ─
  } else if (type === 'multiple_choice') {
    const options = parseMcOptions(question)
    const { singleImage, optionImages } = parseImageUrl(question.image_url)

    if (options.length === 0) {
      // Nothing parseable — last-resort free text so the question is still answerable.
      input = <input value={value} onChange={e => onChange(e.target.value)} disabled={revealed} style={inputStyle} placeholder={t('practice.qrYourAnswer')} />
    } else if (optionImages.length > 0) {
      // Each option is its own picture: a tile grid with a letter badge.
      input = (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
          {options.map((opt, i) => {
            const c = optColors(stateOf(opt.value))
            return (
              <button key={opt.value} onClick={() => !revealed && onChange(opt.value)} disabled={revealed}
                style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', borderRadius: 12,
                  border: `2px solid ${c.border}`, background: c.bg, cursor: revealed ? 'default' : 'pointer', transition: 'all .15s' }}>
                {optionImages[i] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={optionImages[i]} alt={`Option ${opt.letter}`} style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', display: 'block' }} />
                )}
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', fontSize: 13, fontWeight: 700, color: c.fg }}>
                  <Chip letter={opt.letter} state={stateOf(opt.value)} /> {opt.text !== opt.letter ? opt.text : ''}
                </span>
              </button>
            )
          })}
        </div>
      )
    } else {
      // Text cards. If there's a single shared image (e.g. a labelled diagram),
      // show it above and the options carry only their letters.
      input = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {singleImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={singleImage} alt="Question image" style={{ width: '100%', borderRadius: 10, border: '1px solid var(--border)' }} />
          )}
          {options.map(opt => {
            const c = optColors(stateOf(opt.value))
            const labelText = opt.text && opt.text !== opt.letter ? opt.text : ''
            return (
              <button key={opt.value} onClick={() => !revealed && onChange(opt.value)} disabled={revealed}
                style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '11px 14px', borderRadius: 11, fontSize: 14, lineHeight: 1.45,
                  border: `1.5px solid ${c.border}`, background: c.bg, color: c.fg,
                  cursor: revealed ? 'default' : 'pointer', transition: 'all .15s' }}>
                <Chip letter={opt.letter} state={stateOf(opt.value)} />
                {labelText && <span style={{ marginTop: 1 }}>{labelText}</span>}
              </button>
            )
          })}
        </div>
      )
    }

  // ── Matching / Matching headings (keyed dropdown — up to 8 options) ────────
  } else if (type === 'matching' || type === 'matching_headings') {
    const opts = parseKeyed(bracket(question.question_text) ?? '')
    input = opts.length > 0 ? (
      <select value={value} onChange={e => onChange(e.target.value)} disabled={revealed} style={selectStyle}>
        <option value="">{t('practice.qrSelect')}</option>
        {opts.map(o => <option key={o.key} value={o.key}>{o.key} — {o.label}</option>)}
      </select>
    ) : (
      <input value={value} onChange={e => onChange(e.target.value)} disabled={revealed} style={inputStyle} placeholder={t('practice.qrYourAnswer')} />
    )

  // ── Fill in the blank / anything else (free text, optional diagram) ───────
  } else {
    input = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {question.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={question.image_url} alt="Question diagram" style={{ width: '100%', borderRadius: 10, border: '1px solid var(--border)' }} />
        )}
        <input value={value} onChange={e => onChange(e.target.value)} disabled={revealed} style={inputStyle} placeholder={t('practice.qrType')} />
      </div>
    )
  }

  return (
    <div style={{
      padding: 14, borderRadius: 10, border: '1px solid var(--border)',
      background: revealed ? (isCorrect ? 'color-mix(in srgb, var(--accent) 7%, transparent)' : 'color-mix(in srgb, var(--danger) 7%, transparent)') : 'var(--bg-elev)',
    }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 700, color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>
          Q{question.question_number}
        </span>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {qText && <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: 'var(--text)' }}>{qText}</p>}
          {input}
          {revealed && !isCorrect && (
            <div style={{ fontSize: 12.5, color: 'var(--danger)' }}>
              {t('practice.qrCorrect')}: <strong style={{ color: 'var(--text)' }}>{correctAns}</strong>
            </div>
          )}
        </div>
        {revealed && (
          <span style={{ flexShrink: 0, fontSize: 16, lineHeight: 1, marginTop: 2 }}>{isCorrect ? '✅' : '❌'}</span>
        )}
      </div>
    </div>
  )
}

/* Letter badge (A/B/C/D) shown on every option. */
function Chip({ letter, state }: { letter: string; state: OptState }) {
  const active = state === 'selected' || state === 'correct' || state === 'wrong'
  const bg = state === 'wrong' ? 'var(--danger)' : active ? 'var(--accent)' : 'var(--bg-soft)'
  const fg = active ? 'var(--accent-fg)' : 'var(--text-2)'
  return (
    <span style={{
      flexShrink: 0, width: 22, height: 22, borderRadius: 7, display: 'inline-flex',
      alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800,
      background: bg, color: fg,
    }}>
      {letter}
    </span>
  )
}
