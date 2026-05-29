'use client'

import { useLanguage } from '@/lib/i18n/LanguageContext'
import type { SampleQuestion } from '@/lib/data/sampleTest'

interface QuestionRendererProps {
  question: SampleQuestion
  answer: string | string[]
  onChange: (value: string | string[]) => void
}

export function QuestionRenderer({ question, answer, onChange }: QuestionRendererProps) {
  const { t } = useLanguage()
  const ans = answer ?? ''

  return (
    <div className="space-y-6">
      {/* Passage (if reading) */}
      {question.passage_text && (
        <div className="rounded-xl bg-[var(--bg-soft)]/40 border border-[var(--border)] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[var(--border)]">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-3)]">
              {t('mockTest.passage')}
            </span>
          </div>
          <div className="p-5 max-h-64 overflow-y-auto">
            <p className="text-sm text-[var(--text-2)] leading-7 whitespace-pre-wrap">
              {question.passage_text}
            </p>
          </div>
        </div>
      )}

      {/* Question text */}
      <p className="text-base font-medium text-[var(--text)] leading-relaxed whitespace-pre-wrap">
        {question.question_text}
      </p>

      {/* Answer: Multiple choice */}
      {question.question_type === 'multiple_choice' && question.options && (
        <div className="space-y-2">
          {question.options.map((opt, i) => {
            const selected = ans === opt
            const letter = String.fromCharCode(65 + i)
            return (
              <button
                key={opt}
                onClick={() => onChange(opt)}
                className={`w-full text-left flex items-start gap-3.5 px-5 py-3.5 rounded-xl border text-sm transition-all duration-150 ${
                  selected
                    ? 'border-indigo-500 bg-[var(--accent-soft)] text-indigo-700 dark:text-indigo-300'
                    : 'border-[var(--border)]/60 bg-gray-50/50 dark:bg-gray-800/30 text-[var(--text-2)] hover:border-indigo-300 dark:hover:border-[var(--accent)]/40 hover:bg-white dark:hover:bg-gray-800/60'
                }`}
              >
                <span className={`shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold mt-0.5 transition-all ${
                  selected ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-[var(--text-2)]'
                }`}>
                  {letter}
                </span>
                {opt}
              </button>
            )
          })}
        </div>
      )}

      {/* Answer: True/False/Not Given */}
      {question.question_type === 'true_false_ng' && (
        <div className="flex gap-2">
          {[t('mockTest.trueLabel'), t('mockTest.falseLabel'), t('mockTest.notGivenLabel')].map(opt => (
            <button
              key={opt}
              onClick={() => onChange(opt)}
              className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-all duration-150 ${
                ans === opt
                  ? 'border-indigo-500 bg-[var(--accent-soft)] text-indigo-700 dark:text-indigo-300'
                  : 'border-[var(--border)]/60 bg-gray-50/50 dark:bg-gray-800/30 text-[var(--text-2)] hover:border-indigo-300 dark:hover:border-[var(--accent)]/40'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {/* Answer: Fill in blank */}
      {question.question_type === 'fill_blank' && (
        <input
          type="text"
          value={ans as string}
          onChange={e => onChange(e.target.value)}
          placeholder={t('mockTest.yourAnswer')}
          className="w-full px-4 py-3.5 rounded-xl border border-[var(--border)]/60 bg-[var(--bg-elev)]/50 text-sm text-[var(--text)] placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-[var(--accent)] transition-all"
        />
      )}

      {/* Answer: Essay */}
      {question.question_type === 'essay' && (
        <div>
          <textarea
            value={ans as string}
            onChange={e => onChange(e.target.value)}
            rows={14}
            placeholder={t('mockTest.yourAnswer')}
            className="w-full px-5 py-4 rounded-xl border border-[var(--border)]/60 bg-[var(--bg-elev)]/30 text-sm text-[var(--text)] placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-[var(--accent)] resize-none transition-all leading-7"
          />
          <div className="flex items-center justify-between mt-2 text-xs text-[var(--text-3)]">
            <span>{t('mockTest.wordCount')}: <span className="font-medium text-[var(--text-2)]">{(ans as string).split(/\s+/).filter(Boolean).length}</span></span>
            <span style={{ color: "var(--accent)" }}>
              {question.id.startsWith('w1') ? t('mockTest.minWords').replace('{{min}}', '150') : ''}
              {question.id.startsWith('w2') ? t('mockTest.minWords').replace('{{min}}', '250') : ''}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
