'use client'

import type { Question } from '@/lib/types/database'
import { isAnswerCorrect } from '@/lib/utils/answerChecking'
import { parseMcOptions, mcQuestionText, parseImageUrl } from '@/lib/utils/mcOptions'
import { distributeSelection } from '@/lib/utils/multiSelect'
import { useLanguage } from '@/lib/i18n/LanguageContext'

type OptState = 'idle' | 'selected' | 'correct' | 'wrong'
function optColors(state: OptState): { border: string; bg: string; fg: string } {
  switch (state) {
    case 'correct': return { border: 'var(--accent)', bg: 'color-mix(in srgb, var(--accent) 14%, transparent)', fg: 'var(--accent)' }
    case 'wrong':   return { border: 'var(--danger)', bg: 'color-mix(in srgb, var(--danger) 12%, transparent)', fg: 'var(--danger)' }
    case 'selected':return { border: 'var(--accent)', bg: 'var(--accent-soft)', fg: 'var(--accent)' }
    default:        return { border: 'var(--border)', bg: 'var(--bg-elev)', fg: 'var(--text)' }
  }
}

/**
 * One "choose N letters" block rendered from several linked question rows.
 * Picks are distributed across the rows (sorted by option order) so the existing
 * per-row scoring — client or server — stays correct in any selection order.
 */
export function MultiSelectQuestion({
  questions, answers, onChange, revealed = false,
}: {
  questions: Question[]
  answers: Record<string, string>
  onChange: (id: string, value: string) => void
  revealed?: boolean
}) {
  const { t } = useLanguage()
  const primary = questions[0]
  const options = parseMcOptions(primary)
  const optionOrder = options.map(o => o.value)
  const count = questions.length
  const stem = mcQuestionText(primary.question_text)
  const { singleImage } = parseImageUrl(primary.image_url)

  const selected = questions.map(q => answers[q.id] ?? '').filter(Boolean)
  const atMax = selected.length >= count

  function toggle(value: string) {
    if (revealed) return
    let next: string[]
    if (selected.includes(value)) next = selected.filter(v => v !== value)
    else if (atMax) return
    else next = [...selected, value]
    const perRow = distributeSelection(next, optionOrder, questions.length)
    questions.forEach((q, i) => onChange(q.id, perRow[i]))
  }

  const stateOf = (value: string): OptState => {
    const isSel = selected.includes(value)
    if (!revealed) return isSel ? 'selected' : 'idle'
    if (questions.some(q => isAnswerCorrect(value, q.correct_answer ?? ''))) return 'correct'
    return isSel ? 'wrong' : 'idle'
  }

  const firstN = primary.question_number
  const lastN = questions[questions.length - 1].question_number
  const allCorrect = revealed && questions.every(q => isAnswerCorrect(answers[q.id] ?? '', q.correct_answer ?? ''))

  return (
    <div style={{
      padding: 14, borderRadius: 10, border: '1px solid var(--border)',
      background: revealed ? (allCorrect ? 'color-mix(in srgb, var(--accent) 7%, transparent)' : 'color-mix(in srgb, var(--danger) 7%, transparent)') : 'var(--bg-elev)',
    }}>
      {/* Header: Q-range + "choose N" + counter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>
          Q{firstN}{lastN !== firstN ? `–${lastN}` : ''}
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 999, background: 'var(--bg-soft)', color: 'var(--text-2)' }}>
          {t('practice.chooseN', { n: String(count) })}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 11.5, fontWeight: 700, color: selected.length === count ? 'var(--accent)' : 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>
          {selected.length}/{count}
        </span>
      </div>

      {stem && <p style={{ margin: '0 0 10px', fontSize: 14, lineHeight: 1.55, color: 'var(--text)', fontWeight: 500 }}>{stem}</p>}

      {singleImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={singleImage} alt="Question image" style={{ width: '100%', borderRadius: 10, border: '1px solid var(--border)', marginBottom: 10 }} />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {options.map(opt => {
          const state = stateOf(opt.value)
          const c = optColors(state)
          const isSel = selected.includes(opt.value)
          const disabled = revealed || (!isSel && atMax)
          return (
            <button key={opt.value} onClick={() => toggle(opt.value)} disabled={disabled}
              style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '11px 14px', borderRadius: 11, fontSize: 14, lineHeight: 1.45,
                border: `1.5px solid ${c.border}`, background: c.bg, color: c.fg,
                cursor: disabled ? 'default' : 'pointer', opacity: disabled && !isSel && !revealed ? 0.5 : 1, transition: 'all .15s' }}>
              {/* Checkbox */}
              <span style={{ flexShrink: 0, marginTop: 1, width: 20, height: 20, borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                border: `1.5px solid ${isSel || state === 'correct' ? c.border : 'var(--border-strong)'}`,
                background: isSel || state === 'correct' ? (state === 'wrong' ? 'var(--danger)' : 'var(--accent)') : 'transparent' }}>
                {(isSel || state === 'correct') && (
                  <svg width={11} height={9} viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="var(--accent-fg)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                )}
              </span>
              {/* Letter chip */}
              <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: 7, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800, background: c.fg === 'var(--text)' ? 'var(--bg-soft)' : c.border, color: c.fg === 'var(--text)' ? 'var(--text-2)' : 'var(--accent-fg)' }}>
                {opt.letter}
              </span>
              {opt.text && opt.text !== opt.letter && <span style={{ marginTop: 1 }}>{opt.text}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
