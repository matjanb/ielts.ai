'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { CheckCircle2, XCircle, RotateCcw, LayoutDashboard, Loader2 } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { createClient } from '@/lib/supabase/client'
import type { Question, TestSection } from '@/lib/types/database'
import { isAnswerCorrect } from '@/lib/utils/answerChecking'

type QuestionWithSection = Question & { sectionNumber: number; sectionTitle: string }

interface SectionScore { correct: number; total: number }

function BandBadge({ band }: { band: number }) {
  const color =
    band >= 8 ? 'from-emerald-400 to-teal-500' :
    band >= 7 ? 'from-blue-400 to-indigo-500' :
    band >= 6 ? 'from-amber-400 to-orange-500' :
    'from-red-400 to-rose-500'

  return (
    <div className={`inline-flex flex-col items-center justify-center w-32 h-32 rounded-3xl bg-gradient-to-br ${color} shadow-xl`}>
      <span className="text-white text-4xl font-black tabular-nums">{band.toFixed(1)}</span>
      <span className="text-white/80 text-xs font-semibold mt-1">Band Score</span>
    </div>
  )
}

export default function ListeningResultsPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const params = useParams<{ testId: string }>()
  const searchParams = useSearchParams()

  const testId = params?.testId ?? ''
  const rawScore = Number(searchParams.get('score') ?? 0)
  const band = Number(searchParams.get('band') ?? 0)
  const attemptId = searchParams.get('attempt') ?? ''

  // Section scores come from URL — always available even if DB load fails
  let sectionScores: Record<string, SectionScore> = {}
  try {
    sectionScores = JSON.parse(decodeURIComponent(searchParams.get('sections') ?? '{}'))
  } catch { /* use empty */ }

  // Section numbers from URL params — drives section breakdown rendering
  const sectionNums = Object.keys(sectionScores).map(Number).sort((a, b) => a - b)

  const [questions, setQuestions] = useState<QuestionWithSection[]>([])
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({})
  const [sections, setSections] = useState<TestSection[]>([])
  const [reviewLoading, setReviewLoading] = useState(true)

  // Load question details and saved answers for the review section
  useEffect(() => {
    if (!testId) { setReviewLoading(false); return }
    async function load() {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const supabase = createClient() as any

        const { data: sectionsData } = await supabase
          .from('test_sections')
          .select('*')
          .eq('test_id', testId)
          .order('section_number')
        const secs: TestSection[] = sectionsData ?? []
        setSections(secs)

        if (secs.length > 0) {
          const sectionIds = secs.map((s: TestSection) => s.id)
          const { data: rawQuestionsData } = await supabase
            .from('questions')
            .select('*')
            .in('section_id', sectionIds)
            .order('question_number')
          const questionsData = (rawQuestionsData ?? []) as Question[]

          const sectionMap = new Map(secs.map((s: TestSection) => [s.id, s]))
          const enriched: QuestionWithSection[] = questionsData.map(q => ({
            ...q,
            sectionNumber: (sectionMap.get(q.section_id) as TestSection | undefined)?.section_number ?? 0,
            sectionTitle: (sectionMap.get(q.section_id) as TestSection | undefined)?.title ?? '',
          }))
          setQuestions(enriched)
        }

        if (attemptId) {
          const { data: answersData } = await supabase
            .from('user_answers')
            .select('question_id, user_answer')
            .eq('attempt_id', attemptId)
          const map: Record<string, string> = {}
          for (const a of (answersData ?? [])) {
            map[a.question_id] = a.user_answer ?? ''
          }
          setUserAnswers(map)
        }
      } catch { /* review section is best-effort */ }
      finally { setReviewLoading(false) }
    }
    load()
  }, [testId, attemptId])

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-1 pt-2">
        <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/15 px-3 py-1 rounded-full mb-2">
          Listening
        </span>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('listening.resultsTitle')}</h1>
      </div>

      {/* Score card — always renders from URL params */}
      <div className="bg-white dark:bg-gray-900/60 rounded-3xl border border-gray-100 dark:border-gray-800 p-8 flex flex-col items-center gap-5">
        <BandBadge band={band} />
        <div className="text-center">
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-1">{t('listening.rawScore')}</p>
          <p className="text-3xl font-black text-gray-900 dark:text-white tabular-nums">
            {rawScore} <span className="text-base font-normal text-gray-400">/ 41</span>
          </p>
        </div>

        {/* Section breakdown — from URL params, always available */}
        {sectionNums.length > 0 && (
          <div className="w-full border-t border-gray-100 dark:border-gray-800 pt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {sectionNums.map(n => {
              const sc = sectionScores[String(n)] ?? { correct: 0, total: 0 }
              const pct = sc.total > 0 ? Math.round((sc.correct / sc.total) * 100) : 0
              return (
                <div key={n} className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
                    {t('listening.section')} {n}
                  </p>
                  <p className="text-lg font-black text-gray-900 dark:text-white tabular-nums">
                    {sc.correct}
                    <span className="text-xs font-normal text-gray-400">/{sc.total}</span>
                  </p>
                  <p className="text-xs text-gray-400 tabular-nums">{pct}%</p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Answer review — best-effort from DB */}
      {reviewLoading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-400">
          <Loader2 size={15} className="animate-spin" />
          {t('common.loading')}
        </div>
      ) : questions.length > 0 ? (
        <div className="space-y-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">{t('listening.allQuestions')}</h2>
          {sectionNums.map(n => {
            const sec = sections.find(s => s.section_number === n)
            const qs = questions.filter(q => q.sectionNumber === n)
            if (qs.length === 0) return null
            return (
              <div key={n} className="bg-white dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="px-6 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/30">
                  <span className="text-xs font-bold uppercase tracking-widest text-amber-500">
                    {t('listening.section')} {n}
                  </span>
                  {sec && (
                    <span className="ml-2 text-xs text-gray-400">{sec.title}</span>
                  )}
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {qs.map(q => {
                    const userAns = userAnswers[q.id] ?? ''
                    const isCorrect = isAnswerCorrect(userAns, q.correct_answer)
                    return (
                      <div key={q.id} className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          <div className="shrink-0 mt-0.5">
                            {isCorrect
                              ? <CheckCircle2 size={16} className="text-emerald-500" />
                              : <XCircle size={16} className="text-red-500" />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                              <span className="text-gray-400 mr-1.5">Q{q.question_number}.</span>
                              {q.question_text}
                            </p>
                            <div className="space-y-1 text-xs">
                              <div className={`flex items-center gap-1.5 ${isCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                                <span className="font-semibold">{t('listening.yourAnswer2')}:</span>
                                <span>{userAns || '—'}</span>
                              </div>
                              {!isCorrect && (
                                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                                  <span className="font-semibold">{t('listening.correctAnswer')}:</span>
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
          })}
        </div>
      ) : null}

      {/* Actions */}
      <div className="flex gap-3 pb-8">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
        >
          <LayoutDashboard size={14} />
          {t('listening.backToDashboard')}
        </button>
        <button
          onClick={() => router.push(`/listening/${testId}`)}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-sm font-semibold transition-colors"
        >
          <RotateCcw size={14} />
          {t('listening.retakeTest')}
        </button>
      </div>
    </div>
  )
}
