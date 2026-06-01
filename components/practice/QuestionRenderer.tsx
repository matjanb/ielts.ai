'use client'

import type { Question } from '@/lib/types/database'
import { isAnswerCorrect } from '@/lib/utils/answerChecking'
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

const selectStyle: React.CSSProperties = {
  padding: '6px 10px', borderRadius: 8, fontSize: 13,
  border: '1px solid var(--border-strong)', background: 'var(--bg-elev)',
  color: 'var(--text)', outline: 'none', cursor: 'pointer', maxWidth: '100%',
}
const inputStyle: React.CSSProperties = {
  padding: '7px 11px', borderRadius: 8, fontSize: 14,
  border: '1px solid var(--border-strong)', background: 'var(--bg-elev)',
  color: 'var(--text)', outline: 'none', minWidth: 200,
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
  const qText = stripPrefix(question.question_text)
  const correct = revealed && isAnswerCorrect(value, question.correct_answer ?? '')
  const type = question.question_type

  let input: React.ReactNode = null

  if (type === 'true_false') {
    const br = bracket(question.question_text) ?? ''
    const opts = /\btrue\b/i.test(br) ? ['TRUE', 'FALSE', 'NOT GIVEN'] : ['YES', 'NO', 'NOT GIVEN']
    input = (
      <select value={value} onChange={e => onChange(e.target.value)} disabled={revealed} style={selectStyle}>
        <option value="">{t('practice.qrSelect')}</option>
        {opts.map(o => <option key={o}>{o}</option>)}
      </select>
    )
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
  } else if (type === 'multiple_choice') {
    const arr = Array.isArray(question.options) ? (question.options as string[]) : []
    input = arr.length > 0 ? (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {arr.map((opt, i) => (
          <label key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 14, color: 'var(--text)', cursor: revealed ? 'default' : 'pointer' }}>
            <input type="radio" name={question.id} checked={value === opt} disabled={revealed}
              onChange={() => onChange(opt)} style={{ marginTop: 3, accentColor: 'var(--accent)' }} />
            <span>{opt}</span>
          </label>
        ))}
      </div>
    ) : (
      <input value={value} onChange={e => onChange(e.target.value)} disabled={revealed} style={inputStyle} placeholder={t('practice.qrYourAnswer')} />
    )
  } else {
    // fill_blank and anything else: free text
    input = (
      <input value={value} onChange={e => onChange(e.target.value)} disabled={revealed} style={inputStyle} placeholder={t('practice.qrType')} />
    )
  }

  return (
    <div style={{
      padding: 14, borderRadius: 10, border: '1px solid var(--border)',
      background: revealed ? (correct ? 'color-mix(in srgb, var(--accent) 7%, transparent)' : 'color-mix(in srgb, var(--danger) 7%, transparent)') : 'var(--bg-elev)',
    }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 700, color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>
          Q{question.question_number}
        </span>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {qText && <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: 'var(--text)' }}>{qText}</p>}
          {input}
          {revealed && !correct && (
            <div style={{ fontSize: 12.5, color: 'var(--danger)' }}>
              {t('practice.qrCorrect')}: <strong style={{ color: 'var(--text)' }}>{question.correct_answer}</strong>
            </div>
          )}
        </div>
        {revealed && (
          <span style={{ flexShrink: 0, fontSize: 16, lineHeight: 1, marginTop: 2 }}>{correct ? '✅' : '❌'}</span>
        )}
      </div>
    </div>
  )
}
