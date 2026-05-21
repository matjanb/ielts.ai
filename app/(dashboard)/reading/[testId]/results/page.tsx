'use client'

import { useSearchParams, useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, BookOpen, RotateCcw, ArrowLeft } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { createClient } from '@/lib/supabase/client'
import type { Question, TestSection } from '@/lib/types/database'

type QuestionWithSection = Question & { sectionNumber: number; sectionTitle: string }
type UserAnswer = { question_id: string; user_answer: string | null; is_correct: boolean | null }

export default function ReadingResultsPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const params = useParams<{ testId: string }>()
  const searchParams = useSearchParams()

  const testId = params.testId
  const score = Number(searchParams.get('score') ?? 0)
  const band = Number(searchParams.get('band') ?? 0)
  const attemptId = searchParams.get('attempt') ?? ''
  const sectionsParam = searchParams.get('sections') ?? '{}'

  const sectionScores: Record<string, { correct: number; total: number }> = (() => {
    try { return JSON.parse(decodeURIComponent(sectionsParam)) } catch { return {} }
  })()

  const [questions, setQuestions] = useState<QuestionWithSection[]>([])
  const [userAnswers, setUserAnswers] = useState<Record<string, UserAnswer>>({})
  const [sections, setSections] = useState<TestSection[]>([])
  const [loading, setLoading] = useState(true)
  const [activePassage, setActivePassage] = useState(1)

  useEffect(() => {
    async function load() {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const supabase = createClient() as any

        const { data: sectionsData } = await supabase
          .from('test_sections').select('*').eq('test_id', testId).order('section_number')
        const secs: TestSection[] = sectionsData ?? []
        setSections(secs)

        const sectionIds = secs.map((s: TestSection) => s.id)
        const { data: rawQ } = await supabase
          .from('questions').select('*').in('section_id', sectionIds).order('question_number')

        const sectionMap = new Map(secs.map((s: TestSection) => [s.id, s]))
        const enriched: QuestionWithSection[] = (rawQ ?? []).map((q: Question) => ({
          ...q,
          sectionNumber: sectionMap.get(q.section_id)?.section_number ?? 0,
          sectionTitle: sectionMap.get(q.section_id)?.title ?? '',
        }))
        setQuestions(enriched)

        if (attemptId) {
          const { data: answersData } = await supabase
            .from('user_answers').select('*').eq('attempt_id', attemptId)
          const map: Record<string, UserAnswer> = {}
          for (const a of (answersData ?? [])) map[a.question_id] = a
          setUserAnswers(map)
        }
      } catch { /* silent */ }
      finally { setLoading(false) }
    }
    load()
  }, [testId, attemptId])

  const bandColor = band >= 7 ? 'text-emerald-500' : band >= 5.5 ? 'text-blue-500' : 'text-amber-500'
  const passageQuestions = questions.filter(q => q.sectionNumber === activePassage)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm text-gray-400">{t('common.loading')}</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <ArrowLeft size={15} strokeWidth={2} />
          {t('reading.backToDashboard')}
        </button>
        <button
          onClick={() => router.push(`/reading/${testId}`)}
          className="flex items-center gap-2 text-sm text-blue-500 hover:text-blue-400 transition-colors"
        >
          <RotateCcw size={13} strokeWidth={2} />
          {t('reading.retakeTest')}
        </button>
      </div>

      {/* Score card */}
      <div className="bg-white dark:bg-gray-900/60 rounded-3xl border border-gray-100 dark:border-gray-800 p-8">
        <div className="flex flex-col md:flex-row items-center gap-8">
          {/* Band score circle */}
          <div className="flex flex-col items-center gap-2">
            <div className={`text-6xl font-bold tabular-nums ${bandColor}`}>{band.toFixed(1)}</div>
            <div className="text-xs font-semibold uppercase tracking-widest text-gray-400">{t('reading.overallBand')}</div>
          </div>

          <div className="flex-1 space-y-4 w-full">
            {/* Raw score */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">{t('reading.rawScore')}</span>
              <span className="font-bold text-gray-900 dark:text-white">{score} / 40</span>
            </div>
            <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className="h-2 rounded-full bg-blue-500 transition-all"
                style={{ width: `${(score / 40) * 100}%` }}
              />
            </div>

            {/* Section breakdown */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              {sections.map(sec => {
                const s = sectionScores[sec.section_number] ?? { correct: 0, total: 0 }
                return (
                  <div key={sec.id} className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-3 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <BookOpen size={11} className="text-blue-400" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500">
                        P{sec.section_number}
                      </span>
                    </div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {s.correct}<span className="text-xs text-gray-400 font-normal">/{s.total}</span>
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5 truncate">{sec.title}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Passage tabs */}
      <div className="flex gap-2">
        {sections.map(sec => (
          <button
            key={sec.id}
            onClick={() => setActivePassage(sec.section_number)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activePassage === sec.section_number
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {t('reading.passage')} {sec.section_number}
          </button>
        ))}
      </div>

      {/* Questions breakdown */}
      <div className="space-y-3">
        {passageQuestions.map(q => {
          const ua = userAnswers[q.id]
          const isCorrect = ua?.is_correct ?? false
          const userAns = ua?.user_answer ?? '—'

          return (
            <div
              key={q.id}
              className={`bg-white dark:bg-gray-900/50 rounded-2xl border p-5 transition-all ${
                isCorrect
                  ? 'border-emerald-200 dark:border-emerald-500/20'
                  : 'border-red-200 dark:border-red-500/20'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${
                  isCorrect ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-red-50 dark:bg-red-500/10'
                }`}>
                  {isCorrect
                    ? <CheckCircle size={16} className="text-emerald-500" strokeWidth={2} />
                    : <XCircle size={16} className="text-red-400" strokeWidth={2} />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                      Q{q.question_number}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-400">
                      {q.question_type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                    {q.question_text.replace(/^\[.*?\]\s*/, '')}
                  </p>
                  <div className="flex flex-wrap gap-3 text-xs">
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${
                      isCorrect
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                        : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
                    }`}>
                      <span className="font-medium">{t('reading.yourAnswer2')}:</span>
                      <span>{userAns}</span>
                    </div>
                    {!isCorrect && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                        <span className="font-medium">{t('reading.correctAnswer')}:</span>
                        <span>{q.correct_answer}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}