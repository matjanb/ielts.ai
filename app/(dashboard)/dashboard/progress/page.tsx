'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, BookOpen, FileText, Calendar, Clock } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { createClient } from '@/lib/supabase/client'
import {
  BandRing,
  LineChart,
  StackBars,
  CriteriaRadar,
  StreakHeatmap,
} from '@/components/charts/progress-charts'

/* ------------------------------------------------------------------ */
type TabKey = 'overview' | 'writing' | 'mocks'

interface SkillScore {
  key: string
  label: string
  color: string
  score: number
  target: number
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
  skillScores: SkillScore[]
  mockLinePoints: { label: string; value: number }[]
  writingCriteria: { task: number; coherence: number; lexical: number; grammar: number } | null
  writingHistory: WritingSubmission[]
  mockAttempts: MockAttempt[]
  heatmapCells: number[]
  weeklyBars: { label: string; writing: number; speaking: number; reading: number; listening: number }[]
  targetBand: number
}

const SKILL_META = [
  { key: 'writing',   label: 'Writing',   color: '#8b5cf6' },
  { key: 'speaking',  label: 'Speaking',  color: '#3b82f6' },
  { key: 'reading',   label: 'Reading',   color: '#10b981' },
  { key: 'listening', label: 'Listening', color: '#fb7185' },
]

/* ------------------------------------------------------------------ */
export default function ProgressPage() {
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [data, setData] = useState<PageData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient() as any
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const [
        { data: bandHistory },
        { data: writingSubs },
        { data: mockAttempts },
        { data: studySessions },
        { data: profile },
      ] = await Promise.all([
        supabase.from('band_score_history')
          .select('skill, score, source, recorded_at')
          .eq('user_id', user.id)
          .order('recorded_at', { ascending: true })
          .limit(200),
        supabase.from('writing_submissions')
          .select('id, task_type, band_score, task_achievement, coherence_cohesion, lexical_resource, grammatical_accuracy, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase.from('user_attempts')
          .select('id, completed_at, band_score, total_score')
          .eq('user_id', user.id)
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: true }),
        supabase.from('study_sessions')
          .select('skill, duration_minutes, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(500),
        supabase.from('profiles')
          .select('target_band_score')
          .eq('id', user.id)
          .single(),
      ])

      const targetBand: number = profile?.target_band_score ?? 7.5
      const history: any[] = bandHistory ?? []
      const sessions: any[] = studySessions ?? []

      // Latest band score per skill (iterate from newest → oldest)
      const latestScores: Record<string, number> = {}
      for (const row of [...history].reverse()) {
        if (!latestScores[row.skill]) latestScores[row.skill] = row.score
      }

      const skillScores: SkillScore[] = SKILL_META.map(m => ({
        ...m,
        score: latestScores[m.key] ?? 0,
        target: targetBand,
      }))

      // Mock test score progression (overall skill, source = mock_test)
      const mockLinePoints = history
        .filter(r => r.source === 'mock_test' && r.skill === 'overall')
        .map(r => ({
          label: new Date(r.recorded_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          value: r.score,
        }))

      // Latest writing criteria
      const latestW: WritingSubmission | undefined = (writingSubs ?? []).find(
        (w: WritingSubmission) => w.task_achievement != null
      )
      const writingCriteria = latestW
        ? {
            task:      latestW.task_achievement  ?? 0,
            coherence: latestW.coherence_cohesion ?? 0,
            lexical:   latestW.lexical_resource   ?? 0,
            grammar:   latestW.grammatical_accuracy ?? 0,
          }
        : null

      // Heatmap: 84 days (12 weeks × 7 days)
      const now = new Date()
      now.setHours(0, 0, 0, 0)
      const heatmapCells = Array(84).fill(0) as number[]
      for (const s of sessions) {
        const d = new Date(s.created_at)
        d.setHours(0, 0, 0, 0)
        const diffDays = Math.round((now.getTime() - d.getTime()) / 86400000)
        if (diffDays >= 0 && diffDays < 84) {
          heatmapCells[83 - diffDays] = (heatmapCells[83 - diffDays] ?? 0) + (s.duration_minutes ?? 0)
        }
      }

      // Weekly bars: last 7 days, minutes per skill per day
      type SkillKey = 'writing' | 'speaking' | 'reading' | 'listening'
      const SKILLS: SkillKey[] = ['writing', 'speaking', 'reading', 'listening']
      const DAY_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
      const weeklyBars = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now)
        d.setDate(d.getDate() - 6 + i)
        const dayStr = d.toDateString()
        const daySess = sessions.filter(s => new Date(s.created_at).toDateString() === dayStr)
        const entry: { label: string } & Record<SkillKey, number> = {
          label: DAY_SHORT[d.getDay()],
          writing: 0, speaking: 0, reading: 0, listening: 0,
        }
        for (const sk of SKILLS) {
          entry[sk] = daySess
            .filter(s => s.skill === sk)
            .reduce((sum: number, s: any) => sum + (s.duration_minutes ?? 0), 0)
        }
        return entry
      })

      setData({
        skillScores,
        mockLinePoints,
        writingCriteria,
        writingHistory: writingSubs ?? [],
        mockAttempts: mockAttempts ?? [],
        heatmapCells,
        weeklyBars,
        targetBand,
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
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
          {t('dashboard.progress')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Track your band scores and study activity across all four IELTS skills.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800/60 rounded-xl w-fit">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Panels */}
      {activeTab === 'overview' && <OverviewTab data={data} />}
      {activeTab === 'writing'  && <WritingTab  data={data} />}
      {activeTab === 'mocks'    && <MocksTab    data={data} />}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Overview Tab                                                         */
/* ------------------------------------------------------------------ */
function OverviewTab({ data }: { data: PageData | null }) {
  if (!data) return <EmptyState />

  const hasScores = data.skillScores.some(s => s.score > 0)

  return (
    <div className="space-y-6">
      {/* Band rings */}
      <div className="bg-white dark:bg-gray-900/60 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-5">
          Current Band Scores
          <span className="ml-2 text-xs font-normal text-gray-400">
            target {data.targetBand.toFixed(1)}
          </span>
        </h2>
        {hasScores ? (
          <div className="grid grid-cols-4 gap-4">
            {data.skillScores.map(s => (
              <BandRing
                key={s.key}
                score={s.score}
                target={s.target}
                color={s.color}
                label={s.label}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">
            Complete a mock test to see your band scores.
          </p>
        )}
      </div>

      {/* Activity heatmap */}
      <div className="bg-white dark:bg-gray-900/60 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Study Activity</h2>
          <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
            <Calendar size={11} />
            Last 12 weeks
          </span>
        </div>
        <StreakHeatmap cells={data.heatmapCells} />
        <div className="flex items-center gap-1.5 mt-3 justify-end">
          <span className="text-[10px] text-gray-400">Less</span>
          {[0, 0.3, 0.55, 0.8, 1].map((op, i) => (
            <div key={i}
              className={`w-3 h-3 rounded-sm ${op === 0 ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
              style={op > 0 ? { background: `rgba(99,102,241,${op})` } : undefined}
            />
          ))}
          <span className="text-[10px] text-gray-400">More</span>
        </div>
      </div>

      {/* Weekly study + score trend */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Weekly bars */}
        <div className="bg-white dark:bg-gray-900/60 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">This Week</h2>
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Clock size={10} /> minutes
            </span>
          </div>
          <StackBars days={data.weeklyBars} />
          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-3">
            {[
              { label: 'Writing',   color: '#8b5cf6' },
              { label: 'Speaking',  color: '#3b82f6' },
              { label: 'Reading',   color: '#10b981' },
              { label: 'Listening', color: '#fb7185' },
            ].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                <span className="text-[10px] text-gray-400 dark:text-gray-500">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Score trend */}
        <div className="bg-white dark:bg-gray-900/60 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Score Trend</h2>
          <LineChart
            points={data.mockLinePoints}
            targetBand={data.targetBand}
            height={100}
          />
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Writing Tab                                                          */
/* ------------------------------------------------------------------ */
function WritingTab({ data }: { data: PageData | null }) {
  if (!data) return <EmptyState />

  const crit = data.writingCriteria
  const history = data.writingHistory

  const CRITERIA = crit
    ? [
        { label: 'Task Achievement',      value: crit.task,      color: '#8b5cf6' },
        { label: 'Coherence & Cohesion',  value: crit.coherence, color: '#6366f1' },
        { label: 'Lexical Resource',      value: crit.lexical,   color: '#3b82f6' },
        { label: 'Grammatical Accuracy',  value: crit.grammar,   color: '#10b981' },
      ]
    : []

  return (
    <div className="space-y-6">
      {/* Criteria breakdown */}
      {crit ? (
        <div className="bg-white dark:bg-gray-900/60 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-5">
            Criteria Breakdown
            <span className="ml-2 text-xs font-normal text-gray-400">latest submission</span>
          </h2>
          <div className="flex flex-col sm:flex-row gap-6 items-center">
            <div className="shrink-0">
              <CriteriaRadar
                task={crit.task}
                coherence={crit.coherence}
                lexical={crit.lexical}
                grammar={crit.grammar}
              />
            </div>
            <div className="flex-1 w-full space-y-3">
              {CRITERIA.map(({ label, value, color }) => (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
                    <span className="text-xs font-bold tabular-nums" style={{ color }}>{value.toFixed(1)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className="h-1.5 rounded-full transition-all duration-700"
                      style={{ width: `${(value / 9) * 100}%`, background: color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900/60 rounded-2xl border border-gray-100 dark:border-gray-800 p-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center mx-auto mb-3">
            <BookOpen size={20} className="text-violet-500" strokeWidth={1.5} />
          </div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">No criteria data yet</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Submit a writing task with AI feedback to see your criteria breakdown.
          </p>
        </div>
      )}

      {/* Recent submissions */}
      {history.length > 0 && (
        <div className="bg-white dark:bg-gray-900/60 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Recent Submissions</h2>
          <div className="space-y-2">
            {history.slice(0, 8).map(sub => (
              <div key={sub.id}
                className="flex items-center gap-4 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/3 transition-colors">
                <div className="w-8 h-8 rounded-xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center shrink-0">
                  <BookOpen size={13} className="text-violet-500" strokeWidth={1.8} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Task {sub.task_type}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">
                    {new Date(sub.created_at).toLocaleDateString(undefined, {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </div>
                </div>
                {sub.band_score != null && (
                  <span className="text-sm font-bold text-violet-600 dark:text-violet-400 tabular-nums">
                    {sub.band_score.toFixed(1)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Mock Tests Tab                                                       */
/* ------------------------------------------------------------------ */
function MocksTab({ data }: { data: PageData | null }) {
  if (!data) return <EmptyState />

  const mocks = data.mockAttempts
  const linePoints = mocks
    .filter(m => m.band_score != null)
    .map(m => ({
      label: new Date(m.completed_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      value: m.band_score!,
    }))

  return (
    <div className="space-y-6">
      {/* Score progression */}
      <div className="bg-white dark:bg-gray-900/60 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Score Progression</h2>
          {data.targetBand > 0 && (
            <span className="text-xs text-gray-400">target {data.targetBand.toFixed(1)}</span>
          )}
        </div>
        <LineChart
          points={linePoints}
          targetBand={data.targetBand}
          height={120}
        />
      </div>

      {/* Mock attempts list */}
      {mocks.length > 0 ? (
        <div className="bg-white dark:bg-gray-900/60 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
            All Attempts
          </h2>
          <div className="space-y-2">
            {[...mocks].reverse().map((m, i) => (
              <div key={m.id}
                className="flex items-center gap-4 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/3 transition-colors">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0 text-indigo-500">
                  <FileText size={13} strokeWidth={1.8} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Mock Test #{mocks.length - i}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">
                    {new Date(m.completed_at).toLocaleDateString(undefined, {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                    {m.total_score != null && ` · ${m.total_score} / 40`}
                  </div>
                </div>
                {m.band_score != null ? (
                  <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                    {m.band_score.toFixed(1)}
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">—</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900/60 rounded-2xl border border-gray-100 dark:border-gray-800 p-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center mx-auto mb-3">
            <FileText size={20} className="text-indigo-500" strokeWidth={1.5} />
          </div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">No mock tests yet</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Complete a mock test to track your score progression over time.
          </p>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
function EmptyState() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center mx-auto mb-4">
          <TrendingUp size={24} className="text-indigo-500" strokeWidth={1.5} />
        </div>
        <p className="text-sm text-gray-400 dark:text-gray-500">Sign in to view your progress.</p>
      </div>
    </div>
  )
}
