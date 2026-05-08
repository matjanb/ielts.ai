'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Send, Clock } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { TestTimer } from '@/components/test/TestTimer'
import { QuestionNav } from '@/components/test/QuestionNav'
import { QuestionRenderer } from '@/components/test/QuestionRenderer'
import { SAMPLE_QUESTIONS, SAMPLE_TEST_META } from '@/lib/data/sampleTest'
import { createClient } from '@/lib/supabase/client'

const QUESTIONS = SAMPLE_QUESTIONS
const SECTION_LABELS: Record<string, string> = {
  reading:   'Reading',
  writing:   'Writing',
  speaking:  'Speaking',
  listening: 'Listening',
}

const SECTION_COLORS: Record<string, string> = {
  reading:   'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
  writing:   'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400',
  speaking:  'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  listening: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
}

export default function TestPage({ params }: { params: { id: string } }) {
  const { t } = useLanguage()
  const router = useRouter()
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string | string[]>>({})
  const [submitting, setSubmitting] = useState(false)
  const [started, setStarted] = useState(false)

  const question = QUESTIONS[current]

  function setAnswer(value: string | string[]) {
    setAnswers(a => ({ ...a, [current]: value }))
  }

  const handleTimeExpire = useCallback(() => {
    handleSubmit()
  }, [answers])

  async function handleSubmit() {
    setSubmitting(true)

    let correct = 0
    let total = 0
    QUESTIONS.forEach((q, i) => {
      if (q.question_type !== 'essay') {
        total++
        const userAnswer = answers[i] ?? ''
        if (Array.isArray(q.correct_answer)) {
          if (q.correct_answer.includes(String(userAnswer))) correct++
        } else {
          if (String(userAnswer).toLowerCase().trim() === String(q.correct_answer).toLowerCase().trim()) correct++
        }
      }
    })

    // Convert raw score to IELTS band (4.0–9.0, rounded to nearest 0.5)
    const raw = total > 0 ? 4 + (correct / total) * 5 : 4
    const bandScore = Math.round(Math.min(9, Math.max(4, raw)) * 2) / 2

    // Save to band_score_history — the single source of truth read by dashboard and progress.
    // RLS policy "Users can insert own band scores" allows this client-side insert.
    // We skip test_sessions/test_results because test_id is not a real UUID in mock_tests.
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Insert overall + per-section scores in one batch
        const rows = [
          { user_id: user.id, skill: 'overall',  score: bandScore, source: 'mock_test' },
          { user_id: user.id, skill: 'reading',  score: bandScore, source: 'mock_test' },
        ]
        const { error } = await supabase.from('band_score_history').insert(rows)
        if (error) console.error('[mock-test] band_score_history insert error:', error)
      }
    } catch (e) {
      console.error('[mock-test] Failed to save band score:', e)
    }

    router.push(`/mock-tests/${params.id}/results?score=${bandScore.toFixed(1)}&correct=${correct}&total=${total}&graded=${total}`)
  }

  if (!started) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-white dark:bg-gray-900/60 rounded-3xl border border-gray-100 dark:border-gray-800 p-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center mx-auto mb-6">
            <Clock size={24} strokeWidth={1.8} className="text-indigo-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{SAMPLE_TEST_META.title}</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-8 leading-relaxed">{SAMPLE_TEST_META.description}</p>
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { value: QUESTIONS.length, label: t('mockTest.questions') },
              { value: '160', label: 'min' },
              { value: '4', label: 'sections' },
            ].map(({ value, label }) => (
              <div key={label} className="bg-gray-50 dark:bg-gray-800/60 rounded-xl py-3">
                <div className="text-lg font-bold text-gray-900 dark:text-white">{value}</div>
                <div className="text-xs text-gray-400 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
          <button
            onClick={() => setStarted(true)}
            className="w-full py-3.5 rounded-2xl font-semibold text-sm btn-primary text-white"
          >
            {t('mockTest.startTest')}
          </button>
        </div>
      </div>
    )
  }

  const answeredCount = Object.keys(answers).length

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between py-1">
        <div className="flex items-center gap-2.5">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${SECTION_COLORS[question.section] ?? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
            {SECTION_LABELS[question.section] ?? question.section}
          </span>
          <span className="text-sm text-gray-400 dark:text-gray-500">
            {current + 1} / {QUESTIONS.length}
          </span>
          <span className="text-xs text-gray-300 dark:text-gray-600">
            · {answeredCount} {t('mockTest.questions').toLowerCase()} answered
          </span>
        </div>
        <TestTimer totalSeconds={9600} onExpire={handleTimeExpire} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Question navigation */}
        <div className="lg:col-span-1">
          <QuestionNav
            total={QUESTIONS.length}
            current={current}
            answers={answers}
            onSelect={setCurrent}
          />
        </div>

        {/* Question content */}
        <div className="lg:col-span-3 bg-white dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 p-7">
          <QuestionRenderer
            question={question}
            answer={answers[current] ?? ''}
            onChange={setAnswer}
          />
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={() => setCurrent(c => Math.max(0, c - 1))}
          disabled={current === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-500 dark:text-gray-400 disabled:opacity-30 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
        >
          <ChevronLeft size={15} strokeWidth={2} />
          {t('mockTest.prevQuestion')}
        </button>

        {current < QUESTIONS.length - 1 ? (
          <button
            onClick={() => setCurrent(c => c + 1)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold btn-primary text-white"
          >
            {t('mockTest.nextQuestion')}
            <ChevronRight size={15} strokeWidth={2.5} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-60"
          >
            <Send size={13} strokeWidth={2} />
            {submitting ? t('mockTest.submitting') : t('mockTest.submitTest')}
          </button>
        )}
      </div>
    </div>
  )
}
