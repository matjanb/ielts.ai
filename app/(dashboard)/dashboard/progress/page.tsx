'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, BookOpen, Mic, FileText, Headphones } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { createClient } from '@/lib/supabase/client'

interface ScoreEntry {
  skill: string
  score: number
  source: string
  recorded_at: string
}

const SKILL_META: Record<string, { label: string; icon: typeof TrendingUp; color: string; bar: string }> = {
  overall:   { label: 'Overall',   icon: TrendingUp,  color: 'text-indigo-500',  bar: 'bg-indigo-500'  },
  writing:   { label: 'Writing',   icon: BookOpen,    color: 'text-violet-500',  bar: 'bg-violet-500'  },
  speaking:  { label: 'Speaking',  icon: Mic,         color: 'text-blue-500',    bar: 'bg-blue-500'    },
  reading:   { label: 'Reading',   icon: FileText,    color: 'text-emerald-500', bar: 'bg-emerald-500' },
  listening: { label: 'Listening', icon: Headphones,  color: 'text-rose-400',    bar: 'bg-rose-400'    },
}

export default function ProgressPage() {
  const { t } = useLanguage()
  const [history, setHistory] = useState<ScoreEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await (supabase as any)
        .from('band_score_history')
        .select('skill, score, source, recorded_at')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: false })
        .limit(100)
      setHistory(data ?? [])
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

  // Latest score per skill
  const latest: Record<string, number> = {}
  for (const entry of history) {
    if (!latest[entry.skill]) latest[entry.skill] = entry.score
  }

  const skills = ['overall', 'writing', 'speaking', 'reading', 'listening'].filter(s => latest[s] != null)

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{t('dashboard.progress')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Your band score history across all four IELTS skills.</p>
      </div>

      {/* Current scores */}
      {skills.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t('dashboard.bandScores')}</h2>
          {skills.map(skill => {
            const meta = SKILL_META[skill]
            const score = latest[skill]
            const Icon = meta.icon
            return (
              <div key={skill} className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-gray-50 dark:bg-gray-800 ${meta.color}`}>
                  <Icon size={16} strokeWidth={1.8} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{meta.label}</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{score.toFixed(1)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className={`h-1.5 rounded-full ${meta.bar} transition-all duration-700`}
                      style={{ width: `${Math.round((score / 9) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : null}

      {/* History timeline */}
      {history.length > 0 ? (
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Score History</h2>
          <div className="space-y-2">
            {history.slice(0, 20).map((entry, i) => {
              const meta = SKILL_META[entry.skill] ?? SKILL_META.overall
              const Icon = meta.icon
              const date = new Date(entry.recorded_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
              const source = entry.source.replace(/_/g, ' ')
              return (
                <div key={i} className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/3 transition-colors">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-gray-100 dark:bg-gray-800 ${meta.color}`}>
                    <Icon size={13} strokeWidth={1.8} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white capitalize">{meta.label}</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 capitalize">{source} · {date}</div>
                  </div>
                  <span className={`text-sm font-bold tabular-nums ${meta.color}`}>{entry.score.toFixed(1)}</span>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center mx-auto mb-4">
            <TrendingUp size={24} className="text-indigo-500" strokeWidth={1.5} />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">No scores yet</h3>
          <p className="text-sm text-gray-400 dark:text-gray-500 max-w-xs mx-auto">
            Complete a mock test or submit a writing/speaking practice to start tracking your progress.
          </p>
        </div>
      )}
    </div>
  )
}
