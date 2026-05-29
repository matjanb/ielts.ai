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
      const { getUser } = await import('@/lib/services/auth')
      const { getStudyPlan } = await import('@/lib/services/user')
      const { user } = await getUser()
      if (!user) return
      const data = await getStudyPlan(user.id)
      if (data) setPlan(data as any)
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
        <div className="w-5 h-5 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
      </div>
    )
  }

  const weeks: WeekPlan[] = plan?.plan_data?.weeks ?? []

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)] mb-1">{t('dashboard.studyPlan')}</h1>
          <p className="text-sm text-[var(--text-2)]">
            {plan ? `${plan.weeks_duration}-week plan targeting Band ${plan.target_band}.` : 'Generate a personalised study plan based on your onboarding goals.'}
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold btn-primary text-white disabled:opacity-60"
        >
          {generating
            ? <><Loader2 size={14} className="animate-spin" /> Generating…</>
            : plan
            ? <><RefreshCw size={14} /> Regenerate</>
            : <><BrainCircuit size={14} /> Generate Plan</>
          }
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl text-sm text-[var(--danger)]">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {plan && (
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'Duration', value: `${plan.weeks_duration} weeks` },
            { label: 'Target Band', value: plan.target_band },
            { label: 'Daily Study', value: `${plan.daily_minutes} min` },
            { label: 'Focus', value: plan.focus_skills.join(', ') || 'All skills' },
          ].map(({ label, value }) => (
            <div key={label} className="card px-4 py-2.5 rounded-xl">
              <div className="text-xs text-[var(--text-2)]">{label}</div>
              <div className="text-sm font-semibold text-[var(--text)] capitalize">{value}</div>
            </div>
          ))}
        </div>
      )}

      {weeks.length > 0 ? (
        <div className="space-y-2">
          {weeks.map(week => (
            <div key={week.week} className="card overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === week.week ? null : week.week)}
                className="w-full flex items-center justify-between px-5 py-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[var(--accent-soft)] flex items-center justify-center text-xs font-bold text-[var(--accent)]">
                    {week.week}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[var(--text)]">Week {week.week}</div>
                    {week.theme && <div className="text-xs text-[var(--text-2)]">{week.theme}</div>}
                  </div>
                </div>
                {expanded === week.week
                  ? <ChevronDown size={15} style={{ color: "var(--text-3)" }} />
                  : <ChevronRight size={15} style={{ color: "var(--text-3)" }} />
                }
              </button>
              {expanded === week.week && week.tasks?.length > 0 && (
                <div className="px-5 pb-4 border-t border-[var(--border)] pt-3 space-y-2">
                  {week.tasks.map((task, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-sm text-[var(--text-2)]">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] mt-1.5 shrink-0" />
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
          <div className="w-14 h-14 rounded-2xl bg-[var(--accent-soft)] flex items-center justify-center mx-auto mb-4">
            <BrainCircuit size={24} className="text-[var(--accent)]" strokeWidth={1.5} />
          </div>
          <h3 className="text-sm font-semibold text-[var(--text)] mb-1">No study plan yet</h3>
          <p className="text-sm text-[var(--text-3)] mb-5 max-w-xs mx-auto">
            Complete your onboarding first, then generate a personalised plan.
          </p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold btn-primary text-white disabled:opacity-60"
          >
            {generating ? <><Loader2 size={14} className="animate-spin" /> Generating…</> : <><BrainCircuit size={14} /> Generate My Plan</>}
          </button>
        </div>
      ) : null}
    </div>
  )
}
