'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BrainCircuit, Loader2, RefreshCw, AlertCircle, Calendar, Target, Clock, Layers, ArrowRight, Info } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { getDailyPlan } from '@/lib/services/dailyPlan'
import type { DailySummary, TaskReason } from '@/lib/dailyPlan'

interface Task { day: string; skill: string; activity: string; minutes: number }
interface WeekPlan {
  week: number
  theme: string
  focus_skill?: string
  weekly_goal?: string
  tip?: string
  tasks: Task[]
}
interface StudyPlan {
  weeks_duration: number
  target_band: number
  daily_minutes: number
  focus_skills: string[]
  plan_data: { overview?: string; weeks: WeekPlan[] }
  started_at?: string
  progress?: Record<string, boolean>
}

/** A daily-plan task, localized for rendering in the "Today" card. */
interface DailyView { skill: string; label: string; minutes: number; route: string; reason: string }

const STAT_ICONS = { duration: Calendar, target: Target, daily: Clock, focus: Layers }

// Localized labels for the adaptive daily plan (shared wording with the Overview).
const QT_KEY: Record<string, string> = {
  true_false: 'qtTrueFalse', multiple_choice: 'qtMultipleChoice',
  matching: 'qtMatching', matching_headings: 'qtMatchingHeadings', fill_blank: 'qtFillBlank',
}
const REASON_KEY: Record<TaskReason, string> = {
  weakest: 'daily.reasonWeakest', weak: 'daily.reasonWeak',
  maintain: 'daily.reasonMaintain', habit: 'daily.reasonHabit', mock: 'daily.reasonMock',
}

const SKILL_ROUTE: Record<string, string> = {
  listening: '/listening', reading: '/reading',
  writing: '/dashboard/writing', speaking: '/dashboard/speaking',
  vocabulary: '/vocabulary', mock: '/mock-tests',
  grammar: '/vocabulary', review: '/mock-tests', mixed: '/dashboard',
}
const SKILL_COLOR: Record<string, string> = {
  listening: 'var(--info)', reading: 'var(--accent)', writing: 'var(--warn)',
  speaking: 'var(--danger)', vocabulary: '#6b46c1', mock: '#0891b2',
  grammar: '#0d9488', review: '#475569', mixed: 'var(--text-3)',
}

export default function StudyPlanPage() {
  const { t } = useLanguage()
  const [plan, setPlan]         = useState<StudyPlan | null>(null)
  const [progress, setProgress] = useState<Record<string, boolean>>({})
  const [userId, setUserId]     = useState<string | null>(null)
  const [loading, setLoading]   = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError]       = useState('')
  const [activeWeek, setActiveWeek] = useState(1)
  // Adaptive "today" — same engine, day-seed and localStorage key as the Overview.
  const [dailyTasks, setDailyTasks]     = useState<DailyView[] | null>(null)
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null)
  const [dailyDone, setDailyDone]       = useState<boolean[]>([])
  const [dailyKey, setDailyKey]         = useState('')

  function skillLabel(s: string): string {
    if (s === 'listening' || s === 'reading' || s === 'writing' || s === 'speaking') return t('dashboard.' + s)
    if (s === 'vocabulary') return t('plan.skillVocab')
    if (s === 'mock') return t('plan.skillMock')
    if (s === 'grammar') return t('plan.skillGrammar')
    if (s === 'review') return t('plan.skillReview')
    if (s === 'mixed') return t('plan.skillMixed')
    return s
  }
  function qtLabel(type: string): string { return QT_KEY[type] ? t('daily.' + QT_KEY[type]) : type }
  function reasonText(r?: TaskReason): string { return r ? t(REASON_KEY[r]) : '' }
  function whyToday(s: DailySummary): string {
    const skills = s.weakest.map(k => t('dashboard.' + k)).join(' & ')
    const key = s.urgency === 'high' ? 'daily.whyTodayHigh' : s.urgency === 'med' ? 'daily.whyTodayMed' : 'daily.whyTodayLow'
    return t(key, { skills })
  }
  function whyWeek(s: DailySummary): string {
    const skills = s.weakest.map(k => t('dashboard.' + k)).join(' & ')
    const key = s.urgency === 'high' ? 'daily.whyWeekHigh' : s.urgency === 'med' ? 'daily.whyWeekMed' : 'daily.whyWeekLow'
    return t(key, { skills })
  }

  function toggleDailyTask(idx: number) {
    setDailyDone(prev => {
      const next = [...prev]
      next[idx] = !next[idx]
      if (dailyKey) { try { localStorage.setItem(dailyKey, JSON.stringify(next)) } catch { /* ignore */ } }
      return next
    })
  }

  useEffect(() => {
    async function loadPlan() {
      try {
        const { getUser } = await import('@/lib/services/auth')
        const { getStudyPlan } = await import('@/lib/services/user')
        const { user } = await getUser()
        if (!user) return
        setUserId(user.id)

        // Adaptive daily plan — shown even if no weekly roadmap exists yet.
        try {
          const dp = await getDailyPlan(user.id)
          setDailyKey(dp.doneKey)
          setDailySummary(dp.summary)
          let done: boolean[] = []
          try { done = JSON.parse(localStorage.getItem(dp.doneKey) ?? '[]') } catch { /* ignore */ }
          setDailyDone(done)
          setDailyTasks(dp.tasks.map(tk => ({
            skill: tk.skill,
            label: tk.qtype
              ? t('daily.typedDrill', { type: qtLabel(tk.qtype), skill: t('dashboard.' + tk.skill) })
              : t(`daily.${tk.skill}${tk.variant}`),
            minutes: tk.minutes,
            route: tk.route,
            reason: reasonText(tk.reason),
          })))
        } catch { /* daily plan optional */ }

        const data = await getStudyPlan(user.id)
        if (data) {
          const sp = data as StudyPlan
          setPlan(sp)
          setProgress(sp.progress ?? {})
          setActiveWeek(currentWeekOf(sp))
        }
      } finally {
        setLoading(false)
      }
    }
    loadPlan()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleGenerate() {
    setError('')
    setGenerating(true)
    try {
      const res = await fetch('/api/ai/study-plan', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) setError(data.error ?? t('plan.failed'))
      else {
        const sp = data as StudyPlan
        setPlan(sp)
        setProgress(sp.progress ?? {})
        setActiveWeek(currentWeekOf(sp))
      }
    } catch {
      setError(t('plan.networkError'))
    } finally {
      setGenerating(false)
    }
  }

  async function toggleTask(week: number, idx: number) {
    const key = `${week}:${idx}`
    const next = { ...progress }
    if (next[key]) delete next[key]
    else next[key] = true
    setProgress(next)
    if (userId) {
      const { updateStudyPlanProgress } = await import('@/lib/services/user')
      updateStudyPlanProgress(userId, next).catch(() => {})
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
  const doneTasks = Object.values(progress).filter(Boolean).length
  const overview = plan?.plan_data?.overview

  const curWeek = plan ? currentWeekOf(plan) : 1
  const doneToday = dailyTasks ? dailyTasks.filter((_, i) => dailyDone[i]).length : 0
  const allDoneToday = !!dailyTasks && dailyTasks.length > 0 && doneToday === dailyTasks.length

  const stats = plan ? [
    { key: 'duration', label: t('plan.duration'),    value: `${plan.weeks_duration} ${t('plan.weeks')}`, color: 'var(--accent)' },
    { key: 'target',   label: t('plan.targetBand'),  value: plan.target_band.toFixed(1),    color: 'var(--info)' },
    { key: 'daily',    label: t('plan.dailyStudy'),  value: `${plan.daily_minutes} ${t('plan.min')}`,    color: 'var(--warn)' },
    { key: 'focus',    label: t('plan.focusSkills'), value: plan.focus_skills.join(', ') || t('plan.allSkills'), color: '#6b46c1' },
  ] : []

  /* Task row — checkbox + activity + skill badge + Start link */
  function TaskRow({ week, idx, task }: { week: number; idx: number; task: Task }) {
    const key = `${week}:${idx}`
    const done = !!progress[key]
    const color = SKILL_COLOR[task.skill] ?? 'var(--text-3)'
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: 'var(--bg-soft)', borderRadius: 10 }}>
        <button onClick={() => toggleTask(week, idx)} aria-label="toggle" style={{
          width: 20, height: 20, borderRadius: 6, flexShrink: 0, cursor: 'pointer', padding: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: done ? 'var(--accent)' : 'transparent',
          border: `1.5px solid ${done ? 'var(--accent)' : 'var(--border-strong)'}`,
        }}>
          {done && <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="var(--accent-fg)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color, background: `color-mix(in srgb, ${color} 14%, transparent)`, padding: '2px 8px', borderRadius: 999 }}>{skillLabel(task.skill)}</span>
            <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{task.day} · {task.minutes} {t('plan.min')}</span>
          </div>
          <div style={{ fontSize: 13.5, color: done ? 'var(--text-3)' : 'var(--text)', lineHeight: 1.45, textDecoration: done ? 'line-through' : 'none' }}>{task.activity}</div>
        </div>

        <Link href={SKILL_ROUTE[task.skill] ?? '/dashboard'} style={{
          flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8,
          fontSize: 12, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-soft)', textDecoration: 'none',
        }}>
          {t('plan.start')} <ArrowRight size={12} />
        </Link>
      </div>
    )
  }

  /* Adaptive "today" row — checkbox + activity + skill/reason + Start link. */
  function DailyRow({ idx, task }: { idx: number; task: DailyView }) {
    const done = !!dailyDone[idx]
    const color = SKILL_COLOR[task.skill] ?? 'var(--text-3)'
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: 'var(--bg-soft)', borderRadius: 10 }}>
        <button onClick={() => toggleDailyTask(idx)} aria-label="toggle" style={{
          width: 20, height: 20, borderRadius: 6, flexShrink: 0, cursor: 'pointer', padding: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: done ? 'var(--accent)' : 'transparent',
          border: `1.5px solid ${done ? 'var(--accent)' : 'var(--border-strong)'}`,
        }}>
          {done && <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="var(--accent-fg)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color, background: `color-mix(in srgb, ${color} 14%, transparent)`, padding: '2px 8px', borderRadius: 999 }}>{skillLabel(task.skill)}</span>
            <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{task.minutes} {t('plan.min')}</span>
            {task.reason && <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--accent)' }}>· {task.reason}</span>}
          </div>
          <div style={{ fontSize: 13.5, color: done ? 'var(--text-3)' : 'var(--text)', lineHeight: 1.45, textDecoration: done ? 'line-through' : 'none' }}>{task.label}</div>
        </div>

        <Link href={task.route} style={{
          flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8,
          fontSize: 12, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-soft)', textDecoration: 'none',
        }}>
          {t('plan.start')} <ArrowRight size={12} />
        </Link>
      </div>
    )
  }

  return (
    <div style={{ padding: '32px 32px 80px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.025em', margin: 0, color: 'var(--text)' }}>
            {t('dashboard.studyPlan')}
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text-2)', margin: '6px 0 0', maxWidth: 620, lineHeight: 1.5 }}>
            {plan
              ? (overview || t('plan.roadmapSub', { weeks: String(plan.weeks_duration), band: plan.target_band.toFixed(1), tasks: String(totalTasks) }))
              : t('plan.generateSub')}
          </p>
        </div>
        <button onClick={handleGenerate} disabled={generating} style={{
          display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
          padding: '12px 20px', borderRadius: 'var(--radius-lg)', fontSize: 14, fontWeight: 600,
          background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none',
          cursor: generating ? 'not-allowed' : 'pointer', opacity: generating ? 0.6 : 1,
        }}>
          {generating
            ? <><Loader2 size={15} className="animate-spin" /> {t('plan.generating')}</>
            : plan ? <><RefreshCw size={15} /> {t('plan.regenerate')}</> : <><BrainCircuit size={15} /> {t('plan.generatePlan')}</>}
        </button>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', borderRadius: 10, marginBottom: 16, fontSize: 14, color: 'var(--danger)', background: 'color-mix(in srgb, var(--danger) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)' }}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          {error}
        </div>
      )}

      {/* Overall progress */}
      {plan && totalTasks > 0 && (
        <div className="card" style={{ padding: '16px 20px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{t('plan.tasksProgress', { done: String(doneTasks), total: String(totalTasks) })}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>{Math.round((doneTasks / totalTasks) * 100)}%</span>
          </div>
          <div style={{ height: 6, background: 'var(--bg-soft)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(doneTasks / totalTasks) * 100}%`, background: 'var(--accent)', borderRadius: 999, transition: 'width .3s' }}/>
          </div>
        </div>
      )}

      {/* Today */}
      {dailyTasks && dailyTasks.length > 0 && (
        <div className="card" style={{ padding: 22, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Calendar size={16} style={{ color: 'var(--accent)' }} />
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{t('plan.today')}</h3>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-soft)', padding: '2px 10px', borderRadius: 999, fontVariantNumeric: 'tabular-nums' }}>{doneToday}/{dailyTasks.length}</span>
          </div>
          {dailySummary && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 14px', marginBottom: 14, background: 'var(--accent-soft)', borderRadius: 10, fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-2)' }}>
              <Info size={14} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
              <span>{whyToday(dailySummary)}</span>
            </div>
          )}
          {allDoneToday && <p style={{ fontSize: 13.5, color: 'var(--accent)', margin: '0 0 12px' }}>{t('plan.todayAllDone')}</p>}
          <div style={{ display: 'grid', gap: 8 }}>
            {dailyTasks.map((task, idx) => <DailyRow key={idx} idx={idx} task={task} />)}
          </div>
        </div>
      )}

      {/* Stats grid */}
      {plan && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(50%, 150px), 1fr))', gap: 14, marginBottom: 20 }}>
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
          <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>{t('plan.weeklyRoadmap')}</h3>
          {dailySummary && (
            <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>{whyWeek(dailySummary)}</p>
          )}
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 15, top: 8, bottom: 8, width: 2, background: 'var(--border)' }}/>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {weeks.map(week => {
                const open = activeWeek === week.week
                const isCurrent = week.week === curWeek
                const wTotal = week.tasks?.length ?? 0
                const wDone = week.tasks?.filter((_, i) => progress[`${week.week}:${i}`]).length ?? 0
                return (
                  <div key={week.week} style={{ position: 'relative', paddingLeft: 48 }}>
                    <button
                      onClick={() => setActiveWeek(open ? -1 : week.week)}
                      style={{
                        position: 'absolute', left: 0, top: 6, width: 32, height: 32, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                        fontSize: 13, fontWeight: 700, zIndex: 1,
                        background: open || isCurrent ? 'var(--accent)' : 'var(--bg-elev)',
                        color: open || isCurrent ? 'var(--accent-fg)' : 'var(--text-2)',
                        border: `2px solid ${open || isCurrent ? 'var(--accent)' : 'var(--border-strong)'}`,
                        transition: 'all .15s',
                      }}
                    >
                      {week.week}
                    </button>

                    <button
                      onClick={() => setActiveWeek(open ? -1 : week.week)}
                      style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', padding: '10px 0 8px' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{t('plan.week')} {week.week}</span>
                        {isCurrent && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-soft)', padding: '1px 8px', borderRadius: 999 }}>{t('plan.thisWeek')}</span>}
                        {wTotal > 0 && <span style={{ fontSize: 11, color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>{wDone}/{wTotal}</span>}
                      </div>
                      {week.theme && <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>{week.theme}</div>}
                    </button>

                    {open && (
                      <div style={{ padding: '4px 0 18px' }}>
                        {/* week meta */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                          {week.focus_skill && (
                            <span style={{ fontSize: 11.5, color: 'var(--text-2)' }}>
                              <strong style={{ color: 'var(--text-3)', fontWeight: 700 }}>{t('plan.focus')}:</strong> {skillLabel(week.focus_skill)}
                            </span>
                          )}
                          {week.weekly_goal && (
                            <span style={{ fontSize: 11.5, color: 'var(--text-2)' }}>
                              <strong style={{ color: 'var(--text-3)', fontWeight: 700 }}>{t('plan.weeklyGoal')}:</strong> {week.weekly_goal}
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'grid', gap: 8 }}>
                          {week.tasks?.map((task, i) => <TaskRow key={i} week={week.week} idx={i} task={task} />)}
                        </div>

                        {week.tip && (
                          <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--accent-soft)', borderRadius: 10, fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.5 }}>
                            <strong style={{ color: 'var(--accent)' }}>{t('plan.tip')}:</strong> {week.tip}
                          </div>
                        )}
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
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', margin: '0 0 6px' }}>{t('plan.noPlan')}</h3>
          <p style={{ fontSize: 14, color: 'var(--text-3)', margin: '0 auto 20px', maxWidth: 340, lineHeight: 1.5 }}>
            {t('plan.noPlanDesc')}
          </p>
          <button onClick={handleGenerate} disabled={generating} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '12px 22px', borderRadius: 'var(--radius-lg)', fontSize: 14, fontWeight: 600,
            background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none',
            cursor: generating ? 'not-allowed' : 'pointer', opacity: generating ? 0.6 : 1,
          }}>
            {generating ? <><Loader2 size={15} className="animate-spin" /> {t('plan.generating')}</> : <><BrainCircuit size={15} /> {t('plan.generateMyPlan')}</>}
          </button>
        </div>
      ) : null}
    </div>
  )
}

/* Which week the student is on, from started_at (1-based, clamped). */
function currentWeekOf(sp: StudyPlan): number {
  if (!sp.started_at) return 1
  const start = new Date(sp.started_at + 'T00:00:00').getTime()
  if (Number.isNaN(start)) return 1
  const elapsed = Math.floor((Date.now() - start) / (7 * 86400000)) + 1
  return Math.max(1, Math.min(sp.weeks_duration || 1, elapsed))
}
