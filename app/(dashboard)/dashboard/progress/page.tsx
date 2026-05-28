'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { getProgressData } from '@/lib/services/progress'
import { getUser } from '@/lib/services/auth'
import {
  BandRing, BandBar, Sparkline,
  LineChart, StackBars, CriteriaRadar, StreakHeatmap,
} from '@/components/charts/progress-charts'

/* ================================================================
   Types
   ================================================================ */
type TabKey = 'overview' | 'writing' | 'mocks'

interface SkillRow {
  key: string
  label: string
  band: number
  target: number
  delta: number
  sparkline: number[]
}

interface WCrit {
  task: number
  coherence: number
  lexical: number
  grammar: number
}

interface WritingSubmission {
  id: string
  task_type: string
  band_score: number | null
  task_achievement: number | null
  coherence_cohesion: number | null
  lexical_resource: number | null
  grammatical_accuracy: number | null
  created_at: string
}

interface MockAttempt {
  id: string
  completed_at: string
  band_score: number | null
  total_score: number | null
}

interface PageData {
  overallBand: number
  targetBand: number
  streak: number
  hoursThisWeek: string
  vsLastPct: number
  skillRows: SkillRow[]
  weeklyBars: { label: string; w: number; s: number; r: number; l: number }[]
  mockLine: { label: string; value: number }[]
  heatmap: number[]
  writingCriteria: WCrit | null
  writingHistory: WritingSubmission[]
  mockAttempts: MockAttempt[]
}

const SKILL_META = [
  { key: 'writing',   label: 'Writing'   },
  { key: 'speaking',  label: 'Speaking'  },
  { key: 'reading',   label: 'Reading'   },
  { key: 'listening', label: 'Listening' },
]

/* ================================================================
   Shared UI atoms
   ================================================================ */
function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 rounded-[18px] ${className}`}>
      {children}
    </div>
  )
}

function CardTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-[18px]">
      <div className="text-[14px] font-semibold text-gray-900 dark:text-white tracking-[-0.005em]">{children}</div>
      {action}
    </div>
  )
}

type PillTone = 'neutral' | 'up' | 'accent' | 'warn'

function Pill({ children, tone = 'neutral' }: { children: ReactNode; tone?: PillTone }) {
  const cls: Record<PillTone, string> = {
    neutral: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
    up:      'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
    accent:  'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
    warn:    'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400',
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold font-mono whitespace-nowrap ${cls[tone]}`}>
      {children}
    </span>
  )
}

/* ================================================================
   Data loading
   ================================================================ */
export default function ProgressPage() {
  const { t } = useLanguage()
  const [tab, setTab] = useState<TabKey>('overview')
  const [data, setData] = useState<PageData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { user } = await getUser()
      if (!user) { setLoading(false); return }

      const raw = await getProgressData(user.id)
      const bandHistory = raw.bandHistory
      const writingSubs = raw.writingSubmissions
      const mockAttempts = raw.attempts
      const studySessions = raw.studySessions
      const profile = raw.profile

      const targetBand: number = profile?.target_band_score ?? 7.5
      const history: { skill: string; score: number; source: string; recorded_at: string }[] = bandHistory ?? []
      const sessions: { skill: string; duration_minutes: number; created_at: string }[] = studySessions ?? []

      // Latest & previous per skill, sparkline (last 7)
      const bySkill: Record<string, number[]> = {}
      for (const row of history) {
        if (!bySkill[row.skill]) bySkill[row.skill] = []
        bySkill[row.skill].push(row.score)
      }
      const latestScore = (sk: string) => bySkill[sk]?.at(-1) ?? 0
      const prevScore = (sk: string) => bySkill[sk]?.at(-2) ?? latestScore(sk)
      const sparkline = (sk: string) => (bySkill[sk] ?? []).slice(-7)

      const skillRows: SkillRow[] = SKILL_META.map(m => ({
        ...m,
        band:  latestScore(m.key),
        target: targetBand,
        delta: +(latestScore(m.key) - prevScore(m.key)).toFixed(1),
        sparkline: sparkline(m.key),
      }))

      const overallBand = skillRows.some(s => s.band > 0)
        ? +(skillRows.reduce((s, r) => s + r.band, 0) / skillRows.filter(r => r.band > 0).length).toFixed(1)
        : 0

      // Mock progression line
      const mockLine = history
        .filter(r => r.source === 'mock_test' && r.skill === 'listening')
        .map(r => ({
          label: new Date(r.recorded_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          value: r.score,
        }))

      // Heatmap: 84 days, indexed 0=oldest 83=today
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const heatmap = Array(84).fill(0) as number[]
      for (const s of sessions) {
        const d = new Date(s.created_at)
        d.setHours(0, 0, 0, 0)
        const diff = Math.round((today.getTime() - d.getTime()) / 86400000)
        if (diff >= 0 && diff < 84) heatmap[83 - diff] += s.duration_minutes ?? 0
      }

      // Streak: consecutive non-zero days from today backwards
      let streak = 0
      for (let i = 83; i >= 0; i--) {
        if (heatmap[i] > 0) streak++
        else break
      }

      // Weekly bars: last 7 days
      type SK = 'writing' | 'speaking' | 'reading' | 'listening'
      const SKS: SK[] = ['writing', 'speaking', 'reading', 'listening']
      const DAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
      const weeklyBars = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today)
        d.setDate(d.getDate() - 6 + i)
        const ds = d.toDateString()
        const ds2 = sessions.filter(s => new Date(s.created_at).toDateString() === ds)
        const mins: Record<SK, number> = { writing: 0, speaking: 0, reading: 0, listening: 0 }
        for (const sk of SKS) {
          mins[sk] = ds2.filter(s => s.skill === sk).reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0)
        }
        return { label: DAY[d.getDay()], w: mins.writing, s: mins.speaking, r: mins.reading, l: mins.listening }
      })

      const thisWeekMins = weeklyBars.reduce((s, d) => s + d.w + d.s + d.r + d.l, 0)
      const lastWeekMins = heatmap.slice(83 - 14, 83 - 7).reduce((s, v) => s + v, 0)
      const vsLastPct = lastWeekMins > 0 ? Math.round(((thisWeekMins - lastWeekMins) / lastWeekMins) * 100) : 0
      const hrs = Math.floor(thisWeekMins / 60)
      const mins = thisWeekMins % 60
      const hoursThisWeek = thisWeekMins > 0 ? (mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`) : '0m'

      // Writing criteria (latest with criterion data)
      const latestW = (writingSubs ?? []).find((w: WritingSubmission) => w.task_achievement != null)
      const writingCriteria: WCrit | null = latestW ? {
        task:      latestW.task_achievement ?? 0,
        coherence: latestW.coherence_cohesion ?? 0,
        lexical:   latestW.lexical_resource ?? 0,
        grammar:   latestW.grammatical_accuracy ?? 0,
      } : null

      setData({
        overallBand, targetBand, streak, hoursThisWeek, vsLastPct,
        skillRows, weeklyBars, mockLine, heatmap,
        writingCriteria, writingHistory: writingSubs ?? [],
        mockAttempts: mockAttempts ?? [],
      })
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-5 h-5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'writing',  label: 'Writing'  },
    { key: 'mocks',    label: 'Mock Tests' },
  ]

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800/60 rounded-xl w-fit">
        {TABS.map(tb => (
          <button key={tb.key} onClick={() => setTab(tb.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tab === tb.key
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}>
            {tb.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewScreen data={data} t={t} />}
      {tab === 'writing'  && <WritingScreen  data={data} />}
      {tab === 'mocks'    && <MockScreen     data={data} />}
    </div>
  )
}

/* ================================================================
   Overview
   ================================================================ */
function OverviewScreen({ data, t }: { data: PageData | null; t: (k: string) => string }) {
  if (!data) return <EmptyState />

  const { overallBand, targetBand, streak, hoursThisWeek, vsLastPct,
          skillRows, weeklyBars, mockLine, heatmap } = data

  const focusSkills = [...skillRows]
    .filter(s => s.band > 0)
    .sort((a, b) => (a.target - a.band) - (b.target - b.band))
    .reverse()
    .slice(0, 3)

  return (
    <div className="space-y-5">

      {/* ── Row A: header ─────────────────────────────────────── */}
      <div className="flex items-end justify-between gap-5">
        <div>
          <p className="text-[13px] text-gray-400 dark:text-gray-500 font-mono mb-2">
            {t('dashboard.progress')}
          </p>
          <h1 className="text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-gray-900 dark:text-white">
            {overallBand > 0
              ? overallBand >= targetBand
                ? `You've hit your target band.`
                : `You're on track for band ${targetBand.toFixed(1)}.`
              : 'Start a test to see your progress.'}
          </h1>
        </div>
        <button className="shrink-0 px-4 py-2.5 rounded-[10px] bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[13px] font-semibold hover:opacity-80 transition-opacity">
          Start today's session →
        </button>
      </div>

      {/* ── Row B: ring + skills ───────────────────────────────── */}
      <div className="grid gap-5" style={{ gridTemplateColumns: 'minmax(260px,320px) 1fr' }}>

        {/* Band ring */}
        <Card className="p-7 flex flex-col items-center justify-center gap-4">
          <BandRing band={overallBand} target={targetBand} />
          <div className="flex gap-5 font-mono">
            <MiniStat label="streak"    value={`${streak}d`} />
            <MiniStat label="this week" value={hoursThisWeek} />
            {vsLastPct !== 0 && (
              <MiniStat label="vs last"
                value={`${vsLastPct > 0 ? '+' : ''}${vsLastPct}%`}
                tone={vsLastPct > 0 ? 'up' : 'neutral'} />
            )}
          </div>
        </Card>

        {/* Skills table */}
        <Card className="p-6">
          <CardTitle action={<Pill tone="accent">live</Pill>}>Skills</CardTitle>
          <div className="space-y-[18px]">
            {skillRows.map(s => (
              <div key={s.key}
                className="grid items-center gap-4"
                style={{ gridTemplateColumns: '120px 1fr 56px 60px 64px' }}>
                <span className="text-[14px] font-medium text-gray-900 dark:text-white">{s.label}</span>
                <BandBar value={s.band} target={s.target} />
                <span className="text-[16px] font-semibold tabular-nums text-gray-900 dark:text-white text-right">
                  {s.band > 0 ? s.band.toFixed(1) : '—'}
                </span>
                <div className="flex justify-end">
                  {s.delta !== 0 ? (
                    <Pill tone={s.delta > 0 ? 'up' : 'neutral'}>
                      {s.delta > 0 ? '↑' : '↓'} {Math.abs(s.delta).toFixed(1)}
                    </Pill>
                  ) : <span />}
                </div>
                <div className="flex justify-end">
                  {s.sparkline.length >= 2 ? <Sparkline data={s.sparkline} /> : <span />}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Row C: weekly + mock progression ──────────────────── */}
      <div className="grid grid-cols-2 gap-5">
        <Card className="p-6">
          <CardTitle action={
            <div className="flex items-center gap-3 text-[11px] text-gray-400 font-mono">
              <LegendDot color="#6366f1" label="writing" />
              <LegendDot color="#818cf8" label="speaking" />
              <LegendDot color="#a5b4fc" label="reading" />
              <LegendDot color="#c7d2fe" label="listening" />
            </div>
          }>
            This week · {hoursThisWeek || '0m'}
          </CardTitle>
          <StackBars days={weeklyBars} />
        </Card>

        <Card className="p-6">
          <CardTitle action={
            mockLine.length >= 2
              ? <Pill tone="up">+{(mockLine.at(-1)!.value - mockLine[0].value).toFixed(1)} since first</Pill>
              : null
          }>
            Mock test band progression
          </CardTitle>
          {mockLine.length >= 2
            ? <LineChart data={mockLine} target={targetBand} />
            : <EmptyChart message="Complete a mock test to see progression" />}
        </Card>
      </div>

      {/* ── Row D: focus + heatmap + feedback ─────────────────── */}
      <div className="grid gap-5" style={{ gridTemplateColumns: '1.2fr 1fr 1.3fr' }}>

        {/* Where to push */}
        <Card className="p-6">
          <CardTitle action={<Pill tone="warn">coach's focus</Pill>}>
            Where to push
          </CardTitle>
          {focusSkills.length > 0 ? (
            <div className="space-y-4">
              {focusSkills.map((s, i) => (
                <div key={s.key}
                  className={`${i < focusSkills.length - 1 ? 'pb-4 border-b border-gray-100 dark:border-gray-800' : ''}`}>
                  <div className="flex justify-between items-baseline mb-1.5">
                    <span className="text-[13px] font-semibold text-gray-900 dark:text-white">{s.label}</span>
                    <span className="text-[12px] font-mono text-gray-400 dark:text-gray-500">
                      <span className="text-gray-900 dark:text-white">{s.band.toFixed(1)}</span> → {s.target.toFixed(1)}
                    </span>
                  </div>
                  <BandBar value={s.band} target={s.target} />
                  <p className="text-[12.5px] text-gray-400 dark:text-gray-500 mt-2 leading-relaxed">
                    {gapNote(s.key, s.band, s.target)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-gray-400 dark:text-gray-500">Complete tests to get focus recommendations.</p>
          )}
        </Card>

        {/* Heatmap */}
        <Card className="p-6">
          <CardTitle action={<Pill>last 12 weeks</Pill>}>
            Study consistency
          </CardTitle>
          <div className="flex justify-center py-2">
            <StreakHeatmap data={heatmap} />
          </div>
          <div className="flex items-center justify-between mt-3.5 text-[11px] text-gray-400 font-mono">
            <span>less</span>
            <div className="flex gap-1">
              {[0, 0.3, 0.55, 0.8, 1].map((op, i) => (
                <span key={i} className="w-3 h-3 rounded-sm block"
                  style={op === 0
                    ? { background: 'var(--color-gray-100, #f3f4f6)' }
                    : { background: `rgba(99,102,241,${op})` }} />
              ))}
            </div>
            <span>more</span>
          </div>
        </Card>

        {/* Latest AI feedback (writing submissions) */}
        <Card className="p-6">
          <CardTitle action={
            <span className="text-[12px] text-indigo-500 font-semibold cursor-pointer">view all →</span>
          }>
            Latest activity
          </CardTitle>
          {data.writingHistory.length > 0 ? (
            <div className="space-y-3.5">
              {data.writingHistory.slice(0, 3).map((w, i) => (
                <div key={w.id}
                  className={`${i < 2 ? 'pb-3.5 border-b border-gray-100 dark:border-gray-800' : ''}`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[12px] font-semibold text-gray-400 uppercase tracking-[0.06em]">Writing</span>
                    <span className="text-[11px] font-mono text-gray-400">
                      {new Date(w.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[13px] font-medium text-gray-900 dark:text-white">Task {w.task_type}</span>
                    {w.band_score != null && <Pill tone="accent">{w.band_score.toFixed(1)}</Pill>}
                  </div>
                </div>
              ))}
            </div>
          ) : data.mockAttempts.length > 0 ? (
            <div className="space-y-3.5">
              {data.mockAttempts.slice(-3).reverse().map((m, i) => (
                <div key={m.id}
                  className={`${i < 2 ? 'pb-3.5 border-b border-gray-100 dark:border-gray-800' : ''}`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[12px] font-semibold text-gray-400 uppercase tracking-[0.06em]">Mock Test</span>
                    <span className="text-[11px] font-mono text-gray-400">
                      {new Date(m.completed_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[13px] font-medium text-gray-900 dark:text-white">
                      Score {m.total_score ?? '—'} / 40
                    </span>
                    {m.band_score != null && <Pill tone="accent">{m.band_score.toFixed(1)}</Pill>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-gray-400 dark:text-gray-500">No activity yet. Start a test to see results here.</p>
          )}
        </Card>
      </div>
    </div>
  )
}

/* ================================================================
   Writing
   ================================================================ */
function WritingScreen({ data }: { data: PageData | null }) {
  if (!data) return <EmptyState />

  const crit = data.writingCriteria
  const wBand = data.skillRows.find(s => s.key === 'writing')?.band ?? 0
  const { targetBand, writingHistory } = data

  const CRITERIA = crit ? [
    { key: 'TR',  label: 'Task Response',        value: crit.task      },
    { key: 'CC',  label: 'Coherence & Cohesion', value: crit.coherence },
    { key: 'LR',  label: 'Lexical Resource',     value: crit.lexical   },
    { key: 'GRA', label: 'Grammar & Accuracy',   value: crit.grammar   },
  ] : []

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[12px] font-mono text-gray-400 dark:text-gray-500 mb-1.5">OVERVIEW · WRITING</p>
        <h1 className="text-[28px] font-bold tracking-[-0.02em] text-gray-900 dark:text-white">
          Writing{wBand > 0 ? ` — band ${wBand.toFixed(1)}` : ''}
          {wBand > 0 && wBand < targetBand && ', climbing'}
        </h1>
      </div>

      {/* Row A: ring + radar + criteria bars */}
      <div className="grid gap-5" style={{ gridTemplateColumns: '300px 1fr 1fr' }}>
        <Card className="p-7 flex flex-col items-center justify-center">
          <BandRing band={wBand} target={targetBand} label="Writing" />
        </Card>

        <Card className="p-6">
          <CardTitle>Criteria breakdown</CardTitle>
          {crit ? (
            <div className="flex justify-center">
              <CriteriaRadar
                values={[crit.task, crit.coherence, crit.lexical, crit.grammar]}
                labels={['TR', 'CC', 'LR', 'GRA']}
              />
            </div>
          ) : <EmptyChart message="Submit a writing task for AI feedback" />}
        </Card>

        <Card className="p-6">
          <CardTitle action={<Pill tone="up">latest</Pill>}>Per criterion</CardTitle>
          {CRITERIA.length > 0 ? (
            <div className="space-y-4">
              {CRITERIA.map(c => (
                <div key={c.key}>
                  <div className="flex justify-between mb-1.5 text-[12.5px]">
                    <span className="font-medium text-gray-900 dark:text-white">{c.label}</span>
                    <span className="font-mono text-gray-400">
                      <span className="text-gray-900 dark:text-white">{c.value.toFixed(1)}</span> / {targetBand.toFixed(1)}
                    </span>
                  </div>
                  <BandBar value={c.value} target={targetBand} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-gray-400 dark:text-gray-500">
              No criteria data yet. Submit writing with AI feedback enabled.
            </p>
          )}
        </Card>
      </div>

      {/* Row B: submissions table */}
      <Card className="p-6">
        <CardTitle action={
          <span className="text-[12px] text-indigo-500 font-semibold cursor-pointer">open all →</span>
        }>
          Recent submissions
        </CardTitle>
        {writingHistory.length > 0 ? (
          <table className="w-full text-[13px]" style={{ borderCollapse: 'collapse', fontFeatureSettings: '"tnum"' }}>
            <thead>
              <tr>
                {['Date', 'Task', 'TR', 'CC', 'LR', 'GRA', 'Band'].map(h => (
                  <th key={h} className="text-left text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-[0.08em] pb-3 px-3 first:pl-0">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {writingHistory.map(w => (
                <tr key={w.id}>
                  <td className="py-3.5 px-3 pl-0 font-mono text-gray-400 dark:text-gray-500 whitespace-nowrap">
                    {new Date(w.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </td>
                  <td className="py-3.5 px-3">
                    <Pill>Task {w.task_type}</Pill>
                  </td>
                  {[w.task_achievement, w.coherence_cohesion, w.lexical_resource, w.grammatical_accuracy].map((v, i) => (
                    <td key={i} className="py-3.5 px-3 tabular-nums text-gray-500 dark:text-gray-400">
                      {v != null ? v.toFixed(1) : '—'}
                    </td>
                  ))}
                  <td className="py-3.5 px-3">
                    {w.band_score != null ? (
                      <Pill tone="accent">{w.band_score.toFixed(1)}</Pill>
                    ) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-[13px] text-gray-400 dark:text-gray-500 py-4">
            No writing submissions yet. Submit a task to start tracking your progress.
          </p>
        )}
      </Card>

      {/* Row C: grammar accuracy */}
      {CRITERIA.length > 0 && (
        <div className="grid grid-cols-2 gap-5">
          <Card className="p-6">
            <CardTitle action={<Pill tone="accent">latest essay</Pill>}>Criteria summary</CardTitle>
            <div className="grid grid-cols-2 gap-4">
              {CRITERIA.map(c => (
                <div key={c.key} className="p-4 rounded-[12px] border border-gray-100 dark:border-gray-800">
                  <p className="text-[11px] text-gray-400 uppercase tracking-[0.06em] mb-1.5">{c.label}</p>
                  <p className="text-[22px] font-bold tabular-nums text-gray-900 dark:text-white leading-none">
                    {c.value.toFixed(1)}
                  </p>
                  <div className="mt-2.5">
                    <Pill tone={c.value >= targetBand ? 'up' : c.value >= targetBand - 1 ? 'accent' : 'neutral'}>
                      {c.value >= targetBand ? 'on target' : `${(targetBand - c.value).toFixed(1)} to go`}
                    </Pill>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <CardTitle>Score trend</CardTitle>
            {data.mockLine.length >= 2
              ? <LineChart data={data.mockLine} target={targetBand} height={200} />
              : <EmptyChart message="Complete more tests to see your trend" />}
          </Card>
        </div>
      )}
    </div>
  )
}

/* ================================================================
   Mock Tests
   ================================================================ */
function MockScreen({ data }: { data: PageData | null }) {
  if (!data) return <EmptyState />

  const { mockAttempts, mockLine, targetBand } = data
  const last = mockAttempts.at(-1)
  const best = mockAttempts.reduce<MockAttempt | null>((b, m) =>
    m.band_score != null && (b == null || m.band_score > (b.band_score ?? 0)) ? m : b, null)

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[12px] font-mono text-gray-400 dark:text-gray-500 mb-1.5">OVERVIEW · MOCK TESTS</p>
        <h1 className="text-[28px] font-bold tracking-[-0.02em] text-gray-900 dark:text-white">
          {mockAttempts.length} full mock{mockAttempts.length !== 1 ? 's' : ''}
          {last?.band_score != null ? ` · last band ${last.band_score.toFixed(1)}` : ''}
        </h1>
      </div>

      {/* Row A: KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard label="Latest band"
          value={last?.band_score?.toFixed(1) ?? '—'}
          sub={last ? new Date(last.completed_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' · full test' : 'No attempts yet'}
          accent />
        <KPICard label="Best band"
          value={best?.band_score?.toFixed(1) ?? '—'}
          sub={best ? 'personal best' : 'No attempts yet'} />
        <KPICard label="Total attempts"
          value={String(mockAttempts.length)}
          sub={mockAttempts.length > 0 ? 'listening tests' : 'Start a test'} />
        <KPICard label="Avg band"
          value={mockAttempts.filter(m => m.band_score != null).length > 0
            ? (mockAttempts.filter(m => m.band_score != null)
                .reduce((s, m) => s + m.band_score!, 0) /
               mockAttempts.filter(m => m.band_score != null).length).toFixed(1)
            : '—'}
          sub="across all mocks" />
      </div>

      {/* Row B: line chart */}
      <Card className="p-6">
        <CardTitle action={
          mockLine.length >= 2
            ? <Pill tone="up">+{(mockLine.at(-1)!.value - mockLine[0].value).toFixed(1)} since first</Pill>
            : null
        }>
          Band progression
        </CardTitle>
        {mockLine.length >= 2
          ? <LineChart data={mockLine} target={targetBand} height={260} />
          : <EmptyChart message="Complete two or more mock tests to see your progression" />}
      </Card>

      {/* Row C: table */}
      <Card className="p-6">
        <CardTitle action={
          <span className="text-[12px] text-indigo-500 font-semibold cursor-pointer">review →</span>
        }>
          All mock tests
        </CardTitle>
        {mockAttempts.length > 0 ? (
          <table className="w-full text-[13px]" style={{ borderCollapse: 'collapse', fontFeatureSettings: '"tnum"' }}>
            <thead>
              <tr>
                {['Date', 'Type', 'Score', 'Band', ''].map((h, i) => (
                  <th key={i}
                    className={`text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-[0.08em] pb-3 px-3 ${i === 0 ? 'pl-0 text-left' : i < 4 ? 'text-right' : 'text-right'}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {[...mockAttempts].reverse().map((m) => (
                <tr key={m.id}>
                  <td className="py-3.5 px-3 pl-0 font-mono text-gray-400 dark:text-gray-500">
                    {new Date(m.completed_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="py-3.5 px-3"><Pill>Listening</Pill></td>
                  <td className="py-3.5 px-3 text-right tabular-nums text-gray-500 dark:text-gray-400">
                    {m.total_score != null ? `${m.total_score} / 40` : '—'}
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    {m.band_score != null
                      ? <Pill tone={m.band_score >= 7 ? 'up' : 'neutral'}>{m.band_score.toFixed(1)}</Pill>
                      : <span className="text-gray-300 dark:text-gray-600">—</span>}
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <a href={`/listening/${m.id}/results`}
                      className="text-[12px] text-indigo-500 font-semibold hover:underline">
                      review →
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-[13px] text-gray-400 dark:text-gray-500 py-4">
            No mock tests yet. Head to Listening to start your first test.
          </p>
        )}
      </Card>
    </div>
  )
}

/* ================================================================
   Small helpers
   ================================================================ */
function MiniStat({ label, value, tone = 'neutral' }: {
  label: string; value: string; tone?: 'neutral' | 'up'
}) {
  return (
    <div className="text-center">
      <div className="text-[10px] text-gray-400 uppercase tracking-[0.08em]">{label}</div>
      <div className={`text-[16px] font-semibold mt-1 tabular-nums ${tone === 'up' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}>
        {value}
      </div>
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="w-2 h-2 rounded-sm inline-block" style={{ background: color }} />
      {label}
    </span>
  )
}

function KPICard({ label, value, sub, accent = false }: {
  label: string; value: string; sub: string; accent?: boolean
}) {
  return (
    <Card className="p-5">
      <p className="text-[11px] text-gray-400 uppercase tracking-[0.08em]">{label}</p>
      <p className={`text-[36px] font-bold tracking-[-0.02em] tabular-nums leading-none mt-3 ${accent ? 'text-indigo-500' : 'text-gray-900 dark:text-white'}`}>
        {value}
      </p>
      <p className="text-[12px] text-gray-400 dark:text-gray-500 mt-2.5">{sub}</p>
    </Card>
  )
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-24 text-[13px] text-gray-400 dark:text-gray-500">
      {message}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex items-center justify-center py-20">
      <p className="text-sm text-gray-400 dark:text-gray-500">Sign in to view your progress.</p>
    </div>
  )
}

function gapNote(skill: string, band: number, target: number): string {
  const gap = +(target - band).toFixed(1)
  if (gap <= 0) return 'On target — keep it up.'
  const notes: Record<string, string> = {
    writing:   `Need +${gap} — focus on coherence and task response in Task 2.`,
    speaking:  `Need +${gap} — expand vocabulary range and reduce filler words.`,
    reading:   `Need +${gap} — drill True/False/NG and matching headings questions.`,
    listening: `Need +${gap} — practise section 3 & 4 multiple-choice under timed conditions.`,
  }
  return notes[skill] ?? `Need +${gap} to hit target.`
}
