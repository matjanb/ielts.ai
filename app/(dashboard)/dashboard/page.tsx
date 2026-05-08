'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, Flame, Target, BookOpen, Mic, FileText, ChevronRight, Zap } from 'lucide-react'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { createClient } from '@/lib/supabase/client'
import { getRecentActivity, getStudyStreak } from '@/lib/services/user'
import type { Profile } from '@/lib/types/database'

interface BandSnapshot {
  skill: string
  score: number
  pct: number
  color: string
}

interface ActivityItem {
  icon: typeof BookOpen
  label: string
  score: number | null
  href: string
}

export default function DashboardPage() {
  const { t } = useLanguage()
  const [profile, setProfile]           = useState<Profile | null>(null)
  const [bandScores, setBandScores]     = useState<BandSnapshot[]>([])
  const [recentItems, setRecentItems]   = useState<ActivityItem[]>([])
  const [streak, setStreak]             = useState(0)
  const [loading, setLoading]           = useState(true)

  const hour = new Date().getHours()
  const greeting = hour < 18 ? t('dashboard.greeting') : t('dashboard.greetingEvening')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load profile
      const { data: prof } = await (supabase as any)
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(prof)

      // Load band score history (latest per skill)
      const { data: history } = await (supabase as any)
        .from('band_score_history')
        .select('skill, score, recorded_at')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: false })
        .limit(40)

      if (history?.length) {
        const latest: Record<string, number> = {}
        for (const row of history) {
          if (!latest[row.skill]) latest[row.skill] = row.score
        }
        const colorMap: Record<string, string> = {
          overall:   'bg-indigo-500',
          writing:   'bg-violet-500',
          speaking:  'bg-blue-500',
          reading:   'bg-emerald-500',
          listening: 'bg-rose-400',
        }
        const labelMap: Record<string, string> = {
          overall:   t('dashboardPreview.overall'),
          writing:   t('dashboardPreview.writing'),
          speaking:  t('dashboardPreview.speaking'),
          reading:   t('dashboardPreview.reading'),
          listening: t('dashboardPreview.listening'),
        }
        const order = ['overall', 'writing', 'speaking', 'reading', 'listening']
        setBandScores(
          order
            .filter(s => latest[s] != null)
            .map(s => ({
              skill:  s,
              score:  latest[s],
              pct:    Math.round((latest[s] / 9) * 100),
              color:  colorMap[s],
              label:  labelMap[s],
            })) as any
        )
      } else {
        // Default placeholder scores if no data yet
        setBandScores([
          { skill: 'overall',   score: 0, pct: 0, color: 'bg-indigo-500' },
          { skill: 'writing',   score: 0, pct: 0, color: 'bg-violet-500' },
          { skill: 'speaking',  score: 0, pct: 0, color: 'bg-blue-500'   },
          { skill: 'reading',   score: 0, pct: 0, color: 'bg-emerald-500'},
          { skill: 'listening', score: 0, pct: 0, color: 'bg-rose-400'   },
        ] as any)
      }

      // Load recent activity
      const activity = await getRecentActivity(user.id, 5)
      const items: ActivityItem[] = [
        ...activity.writing.slice(0, 2).map((w: any) => ({
          icon:  BookOpen,
          label: `${t('dashboardPreview.writingTask')} ${w.task_type === '1' ? '1' : '2'}`,
          score: w.band_score,
          href:  '/dashboard/writing',
        })),
        ...activity.speaking.slice(0, 2).map((s: any) => ({
          icon:  Mic,
          label: `${t('dashboardPreview.speakingPart')} ${s.part}`,
          score: s.band_score,
          href:  '/dashboard/speaking',
        })),
      ]

      if (items.length === 0) {
        setRecentItems([
          { icon: FileText, label: t('dashboardPreview.readingTest'),  score: null, href: '/mock-tests' },
          { icon: BookOpen, label: t('dashboardPreview.writingTask'),  score: null, href: '/dashboard/writing'    },
          { icon: Mic,      label: t('dashboardPreview.speakingPart'), score: null, href: '/dashboard/speaking'   },
        ])
      } else {
        setRecentItems(items.slice(0, 3))
      }

      // Load streak
      const s = await getStudyStreak(user.id)
      setStreak(s)

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

  const name = profile?.full_name?.split(' ')[0] ?? 'there'
  const scores = bandScores as (BandSnapshot & { label: string })[]

  return (
    <div className="max-w-3xl mx-auto space-y-8">

      {/* Greeting header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
            {greeting}, {name}
          </h1>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            {t('dashboard.targetBand')}
            <span className="font-medium text-gray-700 dark:text-gray-300 ml-1">
              {profile?.target_band_score ?? '—'}
            </span>
          </p>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-100 dark:border-amber-500/15">
            <Flame size={14} strokeWidth={2} />
            <span className="text-sm font-semibold">{streak}</span>
            <span className="text-xs text-amber-500/80 dark:text-amber-400/70">{t('dashboard.studyStreak')}</span>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: '/mock-tests',           icon: FileText,   label: t('dashboard.mockTests'), color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10'   },
          { href: '/dashboard/writing',    icon: BookOpen,   label: t('dashboard.writing'),   color: 'text-violet-500 bg-violet-50 dark:bg-violet-500/10'   },
          { href: '/dashboard/speaking',   icon: Mic,        label: t('dashboard.speaking'),  color: 'text-blue-500   bg-blue-50   dark:bg-blue-500/10'     },
          { href: '/dashboard/progress',   icon: TrendingUp, label: t('dashboard.progress'),  color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' },
        ].map(({ href, icon: Icon, label, color }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-white dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 hover:shadow-md hover:shadow-black/4 transition-all duration-200 group"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
              <Icon size={18} strokeWidth={1.8} />
            </div>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{label}</span>
          </Link>
        ))}
      </div>

      {/* Band scores */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t('dashboard.bandScores')}</h2>
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Target size={11} strokeWidth={2} />
            {t('dashboard.targetBand')} {profile?.target_band_score ?? 7}
          </span>
        </div>
        <div className="space-y-4">
          {scores.length > 0 ? scores.map(({ label, score, color, pct }) => (
            <div key={label}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
                  {score > 0 ? score.toFixed(1) : '—'}
                </span>
              </div>
              <div className="h-1 rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  className={`h-1 rounded-full ${color} transition-all duration-700`}
                  style={{ width: score > 0 ? `${pct}%` : '0%' }}
                />
              </div>
            </div>
          )) : (
            <p className="text-sm text-gray-400 dark:text-gray-500 py-2">
              Complete a mock test or practice session to see your scores.
            </p>
          )}
        </div>
      </div>

      {/* Recent activity */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t('dashboard.recentActivity')}</h2>
          <Link href="/dashboard/progress" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5">
            {t('dashboardPreview.viewAll')}
            <ChevronRight size={11} strokeWidth={2.5} />
          </Link>
        </div>
        <div className="space-y-1">
          {recentItems.map(({ icon: Icon, label, score, href }) => (
            <Link
              key={label}
              href={href}
              className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-gray-100/60 dark:hover:bg-white/4 transition-colors group"
            >
              <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/10 group-hover:text-indigo-500 transition-all">
                <Icon size={14} strokeWidth={1.8} />
              </div>
              <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">{label}</span>
              <div className="flex items-center gap-2">
                {score != null ? (
                  <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">{score.toFixed(1)}</span>
                ) : (
                  <span className="text-xs text-gray-400 dark:text-gray-600">Start</span>
                )}
                <ChevronRight size={13} strokeWidth={2} className="text-gray-300 dark:text-gray-700 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Upgrade nudge for free users */}
      {profile?.subscription_status === 'free' && (
        <div className="relative overflow-hidden rounded-2xl border border-indigo-100 dark:border-indigo-500/20 bg-indigo-50 dark:bg-indigo-500/8 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <Zap size={14} strokeWidth={2} className="text-indigo-500" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t('subscription.title')}</h3>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('subscription.subtitle')}</p>
            </div>
            <Link
              href="/subscription"
              className="shrink-0 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors"
            >
              {t('subscription.upgradeBtn')}
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
