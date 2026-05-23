'use client'

import { useEffect, useState } from 'react'
import { BrainCircuit, Loader2, RefreshCw, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

interface WeekPlan {
  week: number
  theme: string
  tasks: string[]
}

interface StudyPlan {
  weeks_duration: number
  target_band: number
  daily_minutes: number
  focus_skills: string[]
  plan_data: { weeks: WeekPlan[] }
}

export default function StudyPlanPage() {
  const { t } = useLanguage()
  const [plan, setPlan]         = useState<StudyPlan | null>(null)
  const [loading, setLoading]   = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError]       = useState('')
  const [expanded, setExpanded] = useState<number | null>(1)

  useEffect(() => { loadPlan() }, [])

  async function loadPlan() {
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await (supabase as any)
        .from('study_plans')
        .select('*')
        .eq('user_id', user.id)
        .single()
      if (data) setPlan(data)
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerate() {
    setError('')
    setGenerating(true)
    try {
      const res = await fetch('/api/ai/study-plan', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to generate plan.')
      } else {
        setPlan(data)
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-5 h-5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  const weeks: WeekPlan[] = plan?.plan_data?.weeks ?? []

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{t('dashboard.studyPlan')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {plan
              ? t('dashboard.studyPlanPage.subtitlePlan', { n: String(plan.weeks_duration), target: String(plan.target_band) })
              : t('dashboard.studyPlanPage.subtitleEmpty')}
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold btn-primary text-white disabled:opacity-60"
        >
          {generating
            ? <><Loader2 size={14} className="animate-spin" />{t('dashboard.studyPlanPage.generating')}</>
            : plan
            ? <><RefreshCw size={14} />{t('dashboard.studyPlanPage.regenerate')}</>
            : <><BrainCircuit size={14} />{t('dashboard.studyPlanPage.generate')}</>
          }
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-sm text-red-600 dark:text-red-400">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {plan && (
        <div className="flex flex-wrap gap-3">
          {[
            { label: t('dashboard.studyPlanPage.duration'),    value: t('dashboard.studyPlanPage.weeksVal', { n: String(plan.weeks_duration) }) },
            { label: t('dashboard.studyPlanPage.targetBand'),  value: plan.target_band },
            { label: t('dashboard.studyPlanPage.dailyStudy'),  value: t('dashboard.studyPlanPage.minVal', { n: String(plan.daily_minutes) }) },
            { label: t('dashboard.studyPlanPage.focus'),       value: plan.focus_skills.join(', ') || t('dashboard.studyPlanPage.allSkills') },
          ].map(({ label, value }) => (
            <div key={label} className="px-4 py-2.5 rounded-xl bg-white dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800">
              <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white capitalize">{value}</div>
            </div>
          ))}
        </div>
      )}

      {weeks.length > 0 ? (
        <div className="space-y-2">
          {weeks.map(week => (
            <div key={week.week} className="rounded-2xl bg-white dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === week.week ? null : week.week)}
                className="w-full flex items-center justify-between px-5 py-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    {week.week}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">{t('dashboard.studyPlanPage.weekLabel', { n: String(week.week) })}</div>
                    {week.theme && <div className="text-xs text-gray-500 dark:text-gray-400">{week.theme}</div>}
                  </div>
                </div>
                {expanded === week.week
                  ? <ChevronDown size={15} className="text-gray-400" />
                  : <ChevronRight size={15} className="text-gray-400" />
                }
              </button>
              {expanded === week.week && week.tasks?.length > 0 && (
                <div className="px-5 pb-4 border-t border-gray-50 dark:border-gray-800/80 pt-3 space-y-2">
                  {week.tasks.map((task, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-gray-400">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                      {task}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : !plan ? (
        <div className="text-center py-20">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center mx-auto mb-4">
            <BrainCircuit size={24} className="text-indigo-500" strokeWidth={1.5} />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{t('dashboard.studyPlanPage.noPlan')}</h3>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-5 max-w-xs mx-auto">
            {t('dashboard.studyPlanPage.noPlanDesc')}
          </p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold btn-primary text-white disabled:opacity-60"
          >
            {generating ? <><Loader2 size={14} className="animate-spin" />{t('dashboard.studyPlanPage.generating')}</> : <><BrainCircuit size={14} />{t('dashboard.studyPlanPage.generateMine')}</>}
          </button>
        </div>
      ) : null}
    </div>
  )
}
