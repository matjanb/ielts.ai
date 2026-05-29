'use client'

import { useEffect, useState } from 'react'
import { BrainCircuit, Loader2, RefreshCw, AlertCircle, Check, Calendar, Target, Clock, Layers } from 'lucide-react'
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

const STAT_ICONS = { duration: Calendar, target: Target, daily: Clock, focus: Layers }

export default function StudyPlanPage() {
  const { t } = useLanguage()
  const [plan, setPlan]         = useState<StudyPlan | null>(null)
  const [loading, setLoading]   = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError]       = useState('')
  const [activeWeek, setActiveWeek] = useState(1)

  useEffect(() => { loadPlan() }, [])

  async function loadPlan() {
    try {
      const { getUser } = await import('@/lib/services/auth')
      const { getStudyPlan } = await import('@/lib/services/user')
      const { user } = await getUser()
      if (!user) return
      const data = await getStudyPlan(user.id)
      if (data) setPlan(data as StudyPlan)
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
      if (!res.ok) setError(data.error ?? 'Failed to generate plan.')
      else { setPlan(data); setActiveWeek(1) }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 260 }}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin .8s linear infinite' }}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  const weeks: WeekPlan[] = plan?.plan_data?.weeks ?? []
  const totalTasks = weeks.reduce((n, w) => n + (w.tasks?.length ?? 0), 0)

  const stats = plan ? [
    { key: 'duration', label: 'Duration',    value: `${plan.weeks_duration} weeks`, color: 'var(--accent)' },
    { key: 'target',   label: 'Target band',  value: plan.target_band.toFixed(1),    color: 'var(--info)' },
    { key: 'daily',    label: 'Daily study',  value: `${plan.daily_minutes} min`,    color: 'var(--warn)' },
    { key: 'focus',    label: 'Focus skills', value: plan.focus_skills.join(', ') || 'All skills', color: '#6b46c1' },
  ] : []

  return (
    <div style={{ padding: '32px 32px 80px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.025em', margin: 0, color: 'var(--text)' }}>
            {t('dashboard.studyPlan')}
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text-2)', margin: '6px 0 0' }}>
            {plan
              ? `A ${plan.weeks_duration}-week roadmap to Band ${plan.target_band.toFixed(1)} · ${totalTasks} tasks`
              : 'Generate a personalised study plan based on your onboarding goals.'}
          </p>
        </div>
        <button onClick={handleGenerate} disabled={generating} style={{
          display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
          padding: '12px 20px', borderRadius: 'var(--radius-lg)', fontSize: 14, fontWeight: 600,
          background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none',
          cursor: generating ? 'not-allowed' : 'pointer', opacity: generating ? 0.6 : 1,
        }}>
          {generating
            ? <><Loader2 size={15} className="animate-spin" /> Generating…</>
            : plan ? <><RefreshCw size={15} /> Regenerate</> : <><BrainCircuit size={15} /> Generate plan</>}
        </button>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', borderRadius: 10, marginBottom: 16, fontSize: 14, color: 'var(--danger)', background: 'color-mix(in srgb, var(--danger) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)' }}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          {error}
        </div>
      )}

      {/* Stats grid */}
      {plan && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
          {stats.map(s => {
            const IconC = STAT_ICONS[s.key as keyof typeof STAT_ICONS]
            return (
              <div key={s.key} className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: `color-mix(in srgb, ${s.color} 14%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IconC size={15} style={{ color: s.color }} />
                  </div>
                  <span style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)' }}>{s.label}</span>
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', textTransform: 'capitalize', lineHeight: 1.2 }}>{s.value}</div>
              </div>
            )
          })}
        </div>
      )}

      {/* Weekly roadmap timeline */}
      {weeks.length > 0 ? (
        <div className="card" style={{ padding: 28 }}>
          <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>Weekly roadmap</h3>
          <div style={{ position: 'relative' }}>
            {/* vertical rail */}
            <div style={{ position: 'absolute', left: 15, top: 8, bottom: 8, width: 2, background: 'var(--border)' }}/>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {weeks.map(week => {
                const open = activeWeek === week.week
                return (
                  <div key={week.week} style={{ position: 'relative', paddingLeft: 48 }}>
                    {/* node */}
                    <button
                      onClick={() => setActiveWeek(open ? -1 : week.week)}
                      style={{
                        position: 'absolute', left: 0, top: 6, width: 32, height: 32, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                        fontSize: 13, fontWeight: 700, zIndex: 1,
                        background: open ? 'var(--accent)' : 'var(--bg-elev)',
                        color: open ? 'var(--accent-fg)' : 'var(--text-2)',
                        border: `2px solid ${open ? 'var(--accent)' : 'var(--border-strong)'}`,
                        transition: 'all .15s',
                      }}
                    >
                      {week.week}
                    </button>

                    <button
                      onClick={() => setActiveWeek(open ? -1 : week.week)}
                      style={{
                        width: '100%', textAlign: 'left', background: 'transparent', border: 'none',
                        cursor: 'pointer', padding: '10px 0 8px',
                      }}
                    >
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Week {week.week}</div>
                      {week.theme && <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>{week.theme}</div>}
                    </button>

                    {open && week.tasks?.length > 0 && (
                      <div style={{ display: 'grid', gap: 8, padding: '4px 0 18px' }}>
                        {week.tasks.map((task, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', background: 'var(--bg-soft)', borderRadius: 10 }}>
                            <div style={{ width: 18, height: 18, borderRadius: 5, border: '1.5px solid var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                              <Check size={12} style={{ color: 'var(--text-3)' }} />
                            </div>
                            <span style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.5 }}>{task}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : !plan ? (
        <div className="card" style={{ padding: '64px 32px', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <BrainCircuit size={26} style={{ color: 'var(--accent)' }} strokeWidth={1.5} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', margin: '0 0 6px' }}>No study plan yet</h3>
          <p style={{ fontSize: 14, color: 'var(--text-3)', margin: '0 auto 20px', maxWidth: 340, lineHeight: 1.5 }}>
            Complete your onboarding, then generate a personalised week-by-week plan tuned to your target band and weak skills.
          </p>
          <button onClick={handleGenerate} disabled={generating} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '12px 22px', borderRadius: 'var(--radius-lg)', fontSize: 14, fontWeight: 600,
            background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none',
            cursor: generating ? 'not-allowed' : 'pointer', opacity: generating ? 0.6 : 1,
          }}>
            {generating ? <><Loader2 size={15} className="animate-spin" /> Generating…</> : <><BrainCircuit size={15} /> Generate my plan</>}
          </button>
        </div>
      ) : null}
    </div>
  )
}
