'use client'

import { useEffect, useState, type ReactNode } from 'react'
import {
  FileText, BookOpen, Mic, Headphones, Flame, BarChart3,
  Sparkles, Calendar, Play, ArrowRight, Zap, TrendingUp,
} from 'lucide-react'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { createClient } from '@/lib/supabase/client'
import { getRecentActivity, getStudyStreak } from '@/lib/services/user'
import {
  BandRingOverview,
  WeekChart,
  MockChart,
  OvHeatmap,
  MiniSpark,
} from '@/components/charts/overview-charts'
import type { Profile } from '@/lib/types/database'

/* ── Types ──────────────────────────────────────────────── */
interface SkillRow {
  key: 'writing' | 'reading' | 'listening' | 'speaking'
  band: number
  target: number
  trend: number[]
  color: string
  icon: typeof FileText
  lastLabel: string
  lastBand: number | null
  lastWhen: string
}

interface WeekBar {
  label: string
  writing: number
  speaking: number
  reading: number
  listening: number
  isToday: boolean
}

interface PageData {
  profile: Profile | null
  overallBand: number
  skills: SkillRow[]
  weekBars: WeekBar[]
  mockHistory: { label: string; value: number }[]
  heatmap: number[]
  recentActivity: { skill: string; icon: typeof FileText; label: string; meta: string; band: number | null; when: string }[]
  streak: number
  totalMinsThisWeek: number
  vsLastWeekPct: number
  activeDaysThisQuarter: number
}

/* ── Helpers ────────────────────────────────────────────── */
const SKILL_COLORS = {
  writing:   '#60A5FA',
  reading:   '#A78BFA',
  listening: '#FBBF24',
  speaking:  '#8B5CF6',
} as const

const SKILL_ICONS = {
  writing:   FileText,
  reading:   BookOpen,
  listening: Headphones,
  speaking:  Mic,
} as const

function makeDaysAgo(t: (k: string, p?: Record<string, string>) => string) {
  return function daysAgo(dateStr: string): string {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
    if (diff === 0) return t('dashboard.overview.daysAgoToday')
    if (diff === 1) return t('dashboard.overview.daysAgoYesterday')
    return t('dashboard.overview.daysAgoN', { n: String(diff) })
  }
}

/* ── Shared UI atoms ────────────────────────────────────── */
function OvCard({
  children,
  className = '',
  style,
  interactive,
}: {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
  interactive?: boolean
}) {
  return (
    <div
      className={`rounded-[18px] border transition-colors duration-150 ${
        interactive
          ? 'cursor-pointer hover:border-[var(--ov-line-2)] hover:bg-[var(--ov-card-2)]'
          : ''
      } ${className}`}
      style={{
        background: 'var(--ov-card)',
        borderColor: 'var(--ov-line)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function OvCardTitle({
  children,
  sub,
  action,
}: {
  children: ReactNode
  sub?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3 mb-[18px]">
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ov-ink)' }}>{children}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--ov-muted)', marginTop: 2 }}>{sub}</div>}
      </div>
      {action}
    </div>
  )
}

function OvPill({
  children,
  tone = 'neutral',
  icon,
}: {
  children: ReactNode
  tone?: 'neutral' | 'up' | 'accent' | 'warn'
  icon?: React.ReactNode
}) {
  const styles: Record<string, React.CSSProperties> = {
    neutral: { background: 'var(--ov-track)',  color: 'var(--ov-muted)' },
    up:      { background: 'color-mix(in oklch, var(--ov-good) 16%, transparent)',   color: 'var(--ov-good)' },
    accent:  { background: 'color-mix(in oklch, var(--ov-accent) 18%, transparent)', color: 'var(--ov-accent-fg)' },
    warn:    { background: 'color-mix(in oklch, var(--ov-warn) 18%, transparent)',   color: 'var(--ov-warn)' },
  }
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap"
      style={{
        padding: '4px 10px', borderRadius: 999,
        fontSize: 11, fontWeight: 600,
        ...styles[tone],
      }}>
      {icon}{children}
    </span>
  )
}

function IconChip({
  icon: Icon,
  color,
  size = 40,
  radius = 11,
}: {
  icon: typeof FileText
  color: string
  size?: number
  radius?: number
}) {
  return (
    <div className="shrink-0 grid place-items-center"
      style={{
        width: size, height: size, borderRadius: radius,
        background: `color-mix(in oklch, ${color} 16%, transparent)`,
        border: `1px solid color-mix(in oklch, ${color} 22%, transparent)`,
        color,
      }}>
      <Icon size={size * 0.45} strokeWidth={1.6} />
    </div>
  )
}

/* ── Main page ──────────────────────────────────────────── */
const LOCALE_MAP: Record<string, string> = { en: 'en-GB', ru: 'ru-RU', kz: 'kk-KZ', uz: 'uz-UZ' }

export default function DashboardPage() {
  const { t, language } = useLanguage()
  const [data, setData]       = useState<PageData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const daysAgo = makeDaysAgo(t)

    async function load() {
      const supabase = createClient() as any
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return

      const [
        { data: profile },
        { data: history },
        { data: sessions },
        { data: attempts },
        { data: writingSubs },
        { data: speakingSubs },
        streak,
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('band_score_history').select('skill,score,recorded_at,source').eq('user_id', user.id).order('recorded_at', { ascending: false }).limit(200),
        supabase.from('study_sessions').select('skill,duration_minutes,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(500),
        supabase.from('user_attempts').select('band_score,completed_at').eq('user_id', user.id).not('completed_at', 'is', null).not('band_score', 'is', null).order('completed_at', { ascending: false }).limit(10),
        supabase.from('writing_submissions').select('band_score,task_type,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('speaking_submissions').select('band_score,part,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
        getStudyStreak(user.id),
      ])

      if (cancelled) return

      /* ─ Band history per skill ─ */
      const bySkill: Record<string, number[]> = {}
      const latestBand: Record<string, number> = {};
      (history ?? []).forEach((row: any) => {
        if (!bySkill[row.skill]) bySkill[row.skill] = []
        bySkill[row.skill].push(row.score)
        if (!latestBand[row.skill]) latestBand[row.skill] = row.score
      })

      const target = (profile as Profile | null)?.target_band_score ?? 7.5

      const SKILL_KEYS = ['writing', 'reading', 'listening', 'speaking'] as const
      const skills: SkillRow[] = SKILL_KEYS.map(key => {
        const full = bySkill[key] ?? []
        const trend = full.slice(0, 6).reverse()
        const band = latestBand[key] ?? 0
        return {
          key,
          band,
          target,
          trend: trend.length > 0 ? trend : [band],
          color: SKILL_COLORS[key],
          icon:  SKILL_ICONS[key],
          lastLabel: '',
          lastBand: null,
          lastWhen: '',
        }
      })

      /* ─ Patch last-task labels from submissions ─ */
      if ((writingSubs ?? []).length > 0) {
        const w = writingSubs![0]
        const row = skills.find(s => s.key === 'writing')!
        row.lastLabel = t('dashboard.overview.writingTaskN', { n: w.task_type === '1' ? '1' : '2' })
        row.lastBand  = w.band_score
        row.lastWhen  = daysAgo(w.created_at)
      }
      if ((speakingSubs ?? []).length > 0) {
        const s = speakingSubs![0]
        const row = skills.find(r => r.key === 'speaking')!
        row.lastLabel = t('dashboard.overview.speakingPartN', { n: String(s.part) })
        row.lastBand  = s.band_score
        row.lastWhen  = daysAgo(s.created_at)
      }

      const nonZero = skills.filter(s => s.band > 0).map(s => s.band)
      const overallBand = latestBand['overall']
        ?? (nonZero.length ? nonZero.reduce((a, b) => a + b, 0) / nonZero.length : 0)

      /* ─ Weekly bars ─ */
      const weekBars: WeekBar[] = Array.from({ length: 7 }, (_, i) => {
        const d = new Date()
        d.setDate(d.getDate() - (6 - i))
        d.setHours(0, 0, 0, 0)
        const dayStr = d.toDateString()
        const dayName = d.toLocaleDateString(LOCALE_MAP[language] ?? undefined, { weekday: 'short' })
        const day = (sessions ?? []).filter((s: any) =>
          new Date(s.created_at).toDateString() === dayStr
        )
        const sum = (sk: string) => day.filter((s: any) => s.skill === sk).reduce((a: number, s: any) => a + s.duration_minutes, 0)
        return {
          label: dayName,
          writing:   sum('writing'),
          speaking:  sum('speaking'),
          reading:   sum('reading'),
          listening: sum('listening'),
          isToday: i === 6,
        }
      })

      const totalMinsThisWeek = weekBars.reduce((a, d) =>
        a + d.writing + d.speaking + d.reading + d.listening, 0)

      /* ─ Last-week comparison ─ */
      let lastWeekMins = 0
      for (let i = 7; i < 14; i++) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        d.setHours(0, 0, 0, 0)
        const dayStr = d.toDateString()
        lastWeekMins += (sessions ?? []).filter((s: any) =>
          new Date(s.created_at).toDateString() === dayStr
        ).reduce((a: number, s: any) => a + s.duration_minutes, 0)
      }
      const vsLastWeekPct = lastWeekMins > 0
        ? Math.round(((totalMinsThisWeek - lastWeekMins) / lastWeekMins) * 100)
        : 0

      /* ─ Mock chart ─ */
      const mockHistory = (attempts ?? [])
        .filter((a: any) => a.band_score != null)
        .slice(0, 6)
        .reverse()
        .map((a: any) => ({
          label: new Date(a.completed_at).toLocaleDateString(LOCALE_MAP[language] ?? undefined, { day: '2-digit', month: '2-digit' }).replace(/\.$/, ''),
          value: a.band_score as number,
        }))

      /* ─ Heatmap (84 days) ─ */
      const heatmap = Array.from({ length: 84 }, (_, i) => {
        const d = new Date()
        d.setDate(d.getDate() - (83 - i))
        d.setHours(0, 0, 0, 0)
        const dayStr = d.toDateString()
        const mins = (sessions ?? [])
          .filter((s: any) => new Date(s.created_at).toDateString() === dayStr)
          .reduce((a: number, s: any) => a + s.duration_minutes, 0)
        if (mins === 0)  return 0
        if (mins < 20)   return 1
        if (mins < 40)   return 2
        if (mins < 60)   return 3
        return 4
      })

      const activeDaysThisQuarter = heatmap.filter(v => v > 0).length

      /* ─ Recent activity ─ */
      const recentActivity = [
        ...(writingSubs ?? []).slice(0, 2).map((w: any) => ({
          skill: 'writing',
          icon:  FileText,
          label: t('dashboard.overview.writingTaskN', { n: w.task_type === '1' ? '1' : '2' }),
          meta:  '',
          band:  w.band_score as number | null,
          when:  daysAgo(w.created_at),
        })),
        ...(speakingSubs ?? []).slice(0, 2).map((s: any) => ({
          skill: 'speaking',
          icon:  Mic,
          label: t('dashboard.overview.speakingPartN', { n: String(s.part) }),
          meta:  '',
          band:  s.band_score as number | null,
          when:  daysAgo(s.created_at),
        })),
      ].slice(0, 4)

      setData({
        profile: profile as Profile | null,
        overallBand,
        skills,
        weekBars,
        mockHistory,
        heatmap,
        recentActivity,
        streak,
        totalMinsThisWeek,
        vsLastWeekPct,
        activeDaysThisQuarter,
      })
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-5 h-5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!data) return null

  const {
    profile, overallBand, skills, weekBars, mockHistory,
    heatmap, recentActivity, streak, totalMinsThisWeek, vsLastWeekPct, activeDaysThisQuarter,
  } = data

  const firstName = profile?.full_name?.split(' ')[0] ?? ''
  const target    = profile?.target_band_score ?? 7.5
  const delta     = Math.max(0, target - overallBand).toFixed(1)

  const h = Math.floor(totalMinsThisWeek / 60)
  const m = totalMinsThisWeek % 60
  const hA = t('dashboard.overview.hourAbbr')
  const mA = t('dashboard.overview.minAbbr')
  const hoursStr = totalMinsThisWeek >= 60
    ? (m > 0 ? `${h}${hA} ${m}${mA}` : `${h}${hA}`)
    : `${totalMinsThisWeek}${mA}`

  const todayTasks = [
    { skill: t('dashboard.overview.writingLabel'),   color: '#60A5FA', icon: FileText,   title: t('dashboard.overview.todayTask1Title'), mins: 30, why: t('dashboard.overview.todayTask1Why'), href: '/dashboard/writing'  },
    { skill: t('dashboard.overview.listeningLabel'), color: '#FBBF24', icon: Headphones, title: t('dashboard.overview.todayTask2Title'), mins: 20, why: t('dashboard.overview.todayTask2Why'), href: '/listening' },
    { skill: t('dashboard.overview.speakingLabel'),  color: '#8B5CF6', icon: Mic,        title: t('dashboard.overview.todayTask3Title'), mins: 15, why: t('dashboard.overview.todayTask3Why'), href: '/dashboard/speaking' },
  ]

  const insights = [
    { skill: t('dashboard.overview.insightTitle1'), color: '#60A5FA', quote: t('dashboard.overview.insightQuote1'), delta: t('dashboard.overview.insightDelta1') },
    { skill: t('dashboard.overview.insightTitle2'), color: '#8B5CF6', quote: t('dashboard.overview.insightQuote2'), delta: t('dashboard.overview.insightDelta2') },
  ]

  return (
    <div className="w-full min-w-0 space-y-5 pb-10">

      {/* ── Row 1: Hero + Exam/Stats ─────────────────────── */}
      <div className="grid gap-5" style={{ gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)' }}>

        {/* Hero greeting card */}
        <OvCard className="p-7 relative overflow-hidden" style={{
          background: 'linear-gradient(135deg, color-mix(in oklch, #8b5cf6 14%, var(--ov-card)) 0%, var(--ov-card) 55%)',
        }}>
          {/* bg glow */}
          <div className="absolute pointer-events-none" style={{
            top: -40, right: -40, width: 240, height: 240, borderRadius: '50%',
            background: 'radial-gradient(circle, color-mix(in oklch, #8b5cf6 22%, transparent) 0%, transparent 70%)',
          }} />
          <div className="flex gap-6 relative">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-2.5" style={{ fontSize: 12, color: 'var(--ov-muted)' }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--ov-good)' }} />
                {t('dashboard.overview.aiOnline')}
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-.02em', lineHeight: 1.2, margin: 0, color: 'var(--ov-ink)' }}>
                {t('dashboard.greeting')}{firstName ? `, ${firstName}` : ''}.<br />
                <span style={{ color: 'var(--ov-accent-fg)' }}>
                  {t('dashboard.overview.scoreDelta', { delta })}
                </span>
              </h1>
              <p className="mt-3 mb-5" style={{ fontSize: 13.5, color: 'var(--ov-muted)', maxWidth: 440, lineHeight: 1.55 }}>
                {t('dashboard.overview.heroSub', { score: overallBand.toFixed(1) })}
              </p>
              <div className="flex items-center gap-2.5 flex-wrap">
                <Link href="/mock-tests"
                  className="inline-flex items-center gap-1.5 text-white rounded-xl px-[18px] py-[11px]"
                  style={{
                    background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                    fontSize: 13.5, fontWeight: 600,
                    boxShadow: '0 4px 16px color-mix(in oklch, #8b5cf6 35%, transparent)',
                  }}>
                  <Play size={14} fill="white" strokeWidth={0} />
                  {t('dashboard.overview.startSession')}
                </Link>
                <Link href="/dashboard/study-plan"
                  className="inline-flex items-center gap-1.5 rounded-xl px-[18px] py-[11px]"
                  style={{
                    background: 'var(--ov-card-2)', color: 'var(--ov-ink)',
                    border: '1px solid var(--ov-line-2)',
                    fontSize: 13.5, fontWeight: 500,
                  }}>
                  {t('dashboard.overview.weekPlan')}
                </Link>
              </div>
            </div>
            <BandRingOverview
              band={overallBand}
              target={target}
              size={178}
              stroke={14}
              labelScore={t('dashboard.overview.currentScore')}
              labelTarget={t('dashboard.overview.goalWord')}
            />
          </div>
        </OvCard>

        {/* Right column: exam countdown + KPI tiles */}
        <div className="grid gap-4" style={{ gridTemplateRows: 'auto 1fr' }}>
          {/* Exam countdown */}
          <OvCard className="p-[22px] flex items-center gap-[18px]" style={{
            background: 'linear-gradient(135deg, color-mix(in oklch, #6366f1 16%, var(--ov-card)) 0%, var(--ov-card) 60%)',
          }}>
            <div className="shrink-0 grid place-items-center" style={{
              width: 56, height: 56, borderRadius: 14,
              background: 'color-mix(in oklch, #6366f1 20%, transparent)',
              border: '1px solid color-mix(in oklch, #6366f1 28%, transparent)',
              color: '#818cf8',
            }}>
              <Calendar size={26} strokeWidth={1.6} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--ov-muted)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                {t('dashboard.overview.untilExam')}
              </div>
              {/* TODO: connect to actual exam date from diagnostic_data or profile */}
              <div className="flex items-baseline gap-1.5 mt-1">
                <span style={{ fontSize: 32, fontWeight: 700, color: 'var(--ov-ink)', lineHeight: 1, fontVariantNumeric: 'tabular-nums', letterSpacing: '-.02em' }}>—</span>
                <span style={{ fontSize: 14, color: 'var(--ov-muted)' }}>{t('dashboard.overview.days')}</span>
              </div>
              <div className="mt-1.5" style={{ fontSize: 12, color: 'var(--ov-muted)' }}>
                {t('dashboard.nextTest')}
              </div>
            </div>
          </OvCard>

          {/* Streak + hours KPI tiles */}
          <div className="grid grid-cols-2 gap-4">
            <OvCard className="p-[18px]">
              <div className="flex items-center gap-2 mb-2">
                <Flame size={16} strokeWidth={1.6} style={{ color: '#F97316' }} />
                <span style={{ fontSize: 11, color: 'var(--ov-muted)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                  {t('dashboard.overview.streakLabel')}
                </span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--ov-ink)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {streak}<span style={{ fontSize: 12, color: 'var(--ov-muted)', fontWeight: 500, marginLeft: 4 }}>{t('dashboard.overview.days')}</span>
              </div>
              {streak > 0 && (
                <div className="mt-1.5" style={{ fontSize: 11, color: 'var(--ov-good)', fontWeight: 600 }}>
                  {t('dashboard.overview.personalRecord')}
                </div>
              )}
            </OvCard>
            <OvCard className="p-[18px]">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 size={16} strokeWidth={1.6} style={{ color: 'var(--ov-accent-fg)' }} />
                <span style={{ fontSize: 11, color: 'var(--ov-muted)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                  {t('dashboard.overview.thisWeek')}
                </span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--ov-ink)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {hoursStr}
              </div>
              {vsLastWeekPct > 0 && (
                <div className="mt-1.5" style={{ fontSize: 11, color: 'var(--ov-good)', fontWeight: 600 }}>
                  {t('dashboard.overview.vsLast', { pct: String(vsLastWeekPct) })}
                </div>
              )}
            </OvCard>
          </div>
        </div>
      </div>

      {/* ── Row 2: Today's plan ──────────────────────────── */}
      <OvCard className="p-6" style={{
        background: 'linear-gradient(135deg, color-mix(in oklch, #8b5cf6 10%, var(--ov-card)) 0%, var(--ov-card) 60%)',
        borderColor: 'color-mix(in oklch, #8b5cf6 18%, var(--ov-line))',
      }}>
        <OvCardTitle
          sub={t('dashboard.overview.aiGenerated', { mins: String(todayTasks.reduce((a, t) => a + t.mins, 0)) })}
          action={<OvPill tone="accent" icon={<Sparkles size={11} />}>{t('dashboard.overview.aiLabel')}</OvPill>}
        >
          {t('dashboard.overview.todayPlan')}
        </OvCardTitle>
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
          {todayTasks.map((task, i) => (
            <div key={i} style={{
              padding: 16, borderRadius: 14,
              border: '1px solid var(--ov-line)',
              background: 'var(--ov-bg-soft)',
              display: 'flex', flexDirection: 'column', gap: 14,
            }}>
              <div className="flex items-center justify-between">
                <IconChip icon={task.icon} color={task.color} size={36} radius={10} />
                <div className="flex items-center gap-1" style={{
                  fontSize: 11, color: 'var(--ov-muted)', fontWeight: 500,
                  padding: '3px 8px', background: 'var(--ov-track)', borderRadius: 999,
                }}>
                  <Zap size={12} strokeWidth={1.6} />
                  {task.mins} {t('dashboard.overview.mins')}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: task.color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>
                  {task.skill}
                </div>
                <div style={{ fontSize: 14, color: 'var(--ov-ink)', fontWeight: 600, lineHeight: 1.35 }}>{task.title}</div>
                <div style={{ fontSize: 12, color: 'var(--ov-muted)', marginTop: 8, lineHeight: 1.4 }}>{task.why}</div>
              </div>
              <Link href={task.href}
                className="mt-auto flex items-center justify-between w-full rounded-xl"
                style={{
                  padding: '8px 12px', fontSize: 12, fontWeight: 500,
                  background: 'var(--ov-card-2)', color: 'var(--ov-ink)',
                  border: '1px solid var(--ov-line-2)',
                }}>
                {i === 0 ? t('dashboard.overview.start') : t('dashboard.overview.planned')}
                <ArrowRight size={14} />
              </Link>
            </div>
          ))}
        </div>
      </OvCard>

      {/* ── Row 3: Skills grid ───────────────────────────── */}
      <div>
        <div className="flex items-baseline justify-between mb-3.5">
          <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ov-ink)', margin: 0 }}>
            {t('dashboard.overview.skillsTitle')}
          </h2>
          <Link href="/dashboard/progress"
            style={{ fontSize: 12, color: 'var(--ov-accent-fg)', fontWeight: 600 }}>
            {t('dashboard.overview.seeAll')}
          </Link>
        </div>
        <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
          {skills.map(skill => (
            <OvCard key={skill.key} interactive className="p-5 flex flex-col gap-3.5">
              <div className="flex justify-between items-start">
                <IconChip icon={skill.icon} color={skill.color} size={40} radius={11} />
                {skill.band > 0 && (
                  <OvPill tone="up">
                    <span style={{ fontSize: 9 }}>↑</span>
                    {skill.band.toFixed(1)}
                  </OvPill>
                )}
              </div>
              <div>
                <div style={{ fontSize: 13, color: 'var(--ov-muted)', fontWeight: 500 }}>
                  {t(`dashboard.overview.${skill.key}Label`)}
                </div>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span style={{ fontSize: 32, fontWeight: 700, color: 'var(--ov-ink)', lineHeight: 1, fontVariantNumeric: 'tabular-nums', letterSpacing: '-.02em' }}>
                    {skill.band > 0 ? skill.band.toFixed(1) : '—'}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--ov-muted)' }}>/ {skill.target.toFixed(1)}</span>
                </div>
              </div>
              <MiniSpark data={skill.trend.length >= 2 ? skill.trend : [0, skill.band]} color={skill.color} h={32} />
              {(skill.lastLabel || skill.lastBand != null) && (
                <div style={{
                  fontSize: 11, color: 'var(--ov-muted)', lineHeight: 1.45,
                  paddingTop: 12, borderTop: '1px solid var(--ov-line)',
                }}>
                  <div style={{ color: 'var(--ov-ink-soft)', fontWeight: 500, marginBottom: 2 }}>
                    {skill.lastLabel}
                  </div>
                  <div className="flex justify-between">
                    <span>{skill.lastWhen}</span>
                    {skill.lastBand != null && (
                      <span style={{ color: skill.color, fontWeight: 600 }}>{skill.lastBand.toFixed(1)}</span>
                    )}
                  </div>
                </div>
              )}
            </OvCard>
          ))}
        </div>
      </div>

      {/* ── Row 4: Week chart + Mock progression ─────────── */}
      <div className="grid gap-5" style={{ gridTemplateColumns: '1fr 1.1fr' }}>

        {/* Weekly study minutes */}
        <OvCard className="p-[22px]">
          <OvCardTitle
            sub={`${hoursStr} · ${t('dashboard.overview.weekSub')}`}
            action={
              <div className="flex gap-2.5" style={{ fontSize: 11, color: 'var(--ov-muted)' }}>
                {[
                  { c: '#60A5FA', l: t('dashboard.overview.writingLabel').slice(0,4)   },
                  { c: '#8B5CF6', l: t('dashboard.overview.speakingLabel').slice(0,3)  },
                  { c: '#A78BFA', l: t('dashboard.overview.readingLabel').slice(0,4)   },
                  { c: '#FBBF24', l: t('dashboard.overview.listeningLabel').slice(0,3) },
                ].map(d => (
                  <span key={d.l} className="inline-flex items-center gap-1">
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: d.c, display: 'inline-block' }} />{d.l}
                  </span>
                ))}
              </div>
            }
          >
            {t('dashboard.overview.weekTitle')}
          </OvCardTitle>
          <WeekChart days={weekBars} height={180} />
        </OvCard>

        {/* Mock test progression */}
        <OvCard className="p-[22px]">
          <OvCardTitle
            sub={mockHistory.length > 1
              ? `${mockHistory.length} ${t('dashboard.overview.mocksTitle').toLowerCase()} · ${t('dashboard.overview.trendUp')}`
              : t('dashboard.overview.mocksTitle')
            }
            action={mockHistory.length > 1 ? <OvPill tone="up">{t('dashboard.overview.trendUp')}</OvPill> : undefined}
          >
            {t('dashboard.overview.mocksTitle')}
          </OvCardTitle>
          {mockHistory.length >= 2 ? (
            <MockChart data={mockHistory} height={200} target={target} targetLabel={t('dashboard.overview.goalWord')} />
          ) : (
            <div className="flex items-center justify-center h-[200px]" style={{ fontSize: 13, color: 'var(--ov-muted)' }}>
              {t('dashboard.overview.noBandData')}
            </div>
          )}
        </OvCard>
      </div>

      {/* ── Row 5: AI insight + Discipline | Recent activity ─ */}
      <div className="grid gap-5" style={{ gridTemplateColumns: '1.05fr 1fr' }}>

        {/* Left column: AI insights + Heatmap */}
        <div className="grid gap-4">

          {/* AI insights */}
          <OvCard className="p-[22px]" style={{
            background: 'linear-gradient(135deg, color-mix(in oklch, #8b5cf6 12%, var(--ov-card)) 0%, var(--ov-card) 70%)',
          }}>
            <OvCardTitle action={<OvPill tone="accent" icon={<Sparkles size={11} />}>{t('dashboard.overview.aiInsight')}</OvPill>}>
              {t('dashboard.overview.whereScore')}
            </OvCardTitle>
            <div className="grid gap-3.5">
              {insights.map((ins, i) => (
                <div key={i} className="flex gap-3.5">
                  <div style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, background: ins.color, opacity: 0.8, flexShrink: 0 }} />
                  <div className="flex-1">
                    <div className="flex justify-between items-baseline mb-1.5">
                      <div style={{ fontSize: 12, fontWeight: 600, color: ins.color }}>{ins.skill}</div>
                      <div style={{ fontSize: 11, color: 'var(--ov-muted)', fontVariantNumeric: 'tabular-nums' }}>{ins.delta}</div>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--ov-ink-soft)', margin: 0, lineHeight: 1.5 }}>{ins.quote}</p>
                  </div>
                </div>
              ))}
            </div>
          </OvCard>

          {/* Activity heatmap */}
          <OvCard className="p-[22px]">
            <OvCardTitle action={<span style={{ fontSize: 11, color: 'var(--ov-muted)' }}>{t('dashboard.overview.last12weeks')}</span>}>
              {t('dashboard.overview.discipline')}
            </OvCardTitle>
            <div className="flex gap-[18px] items-center">
              <OvHeatmap data={heatmap} weeks={12} />
              <div className="flex-1">
                <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--ov-ink)', lineHeight: 1, fontVariantNumeric: 'tabular-nums', letterSpacing: '-.02em' }}>
                  {activeDaysThisQuarter}
                  <span style={{ fontSize: 14, color: 'var(--ov-muted)', fontWeight: 500, marginLeft: 2 }}>%</span>
                </div>
                <div className="mt-1.5" style={{ fontSize: 12, color: 'var(--ov-muted)', lineHeight: 1.5 }}>
                  {t('dashboard.overview.daysStudied')}
                </div>
                <div className="flex items-center gap-1 mt-4" style={{ fontSize: 10, color: 'var(--ov-muted)' }}>
                  <span>{t('dashboard.overview.less')}</span>
                  {[0, 1, 2, 3, 4].map(v => (
                    <span key={v} style={{
                      display: 'inline-block', width: 10, height: 10, borderRadius: 2,
                      background: v === 0 ? 'var(--ov-track)' : 'var(--ov-accent-fg)',
                      opacity: v === 0 ? 1 : [0.08, 0.25, 0.45, 0.7, 1][v],
                    }} />
                  ))}
                  <span>{t('dashboard.overview.more')}</span>
                </div>
              </div>
            </div>
          </OvCard>
        </div>

        {/* Recent activity */}
        <OvCard className="p-[22px]">
          <OvCardTitle action={
            <Link href="/dashboard/progress" style={{ fontSize: 12, color: 'var(--ov-accent-fg)', fontWeight: 600 }}>
              {t('dashboard.overview.seeAllActivity')}
            </Link>
          }>
            {t('dashboard.overview.activityTitle')}
          </OvCardTitle>
          {recentActivity.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--ov-muted)', paddingTop: 24, textAlign: 'center', lineHeight: 1.6 }}>
              {t('dashboard.noActivity')}
            </div>
          ) : (
            <div className="flex flex-col">
              {recentActivity.map((a, i) => {
                const color = SKILL_COLORS[a.skill as keyof typeof SKILL_COLORS] ?? '#A78BFA'
                const Icon  = a.icon
                return (
                  <div key={i} className="flex items-center gap-3.5 py-3.5"
                    style={{ borderTop: i === 0 ? 'none' : '1px solid var(--ov-line)' }}>
                    <IconChip icon={Icon} color={color} size={38} radius={10} />
                    <div className="flex-1 min-w-0">
                      <div style={{ fontSize: 13, color: 'var(--ov-ink)', fontWeight: 600 }}>{a.label}</div>
                      {a.meta && <div style={{ fontSize: 12, color: 'var(--ov-muted)', marginTop: 2 }}>{a.meta}</div>}
                    </div>
                    <div className="text-right">
                      {a.band != null && (
                        <div style={{ fontSize: 14, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>
                          {a.band.toFixed(1)}
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: 'var(--ov-muted)', marginTop: 2 }}>{a.when}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {/* Upgrade nudge for free users */}
          {profile?.subscription_status === 'free' && (
            <div className="mt-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
              <div className="flex items-start gap-3">
                <TrendingUp size={14} strokeWidth={2} className="text-indigo-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-gray-400 dark:text-gray-500 leading-snug">
                    {t('subscription.subtitle')}
                  </p>
                </div>
                <Link href="/subscription"
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors">
                  {t('subscription.upgradeBtn')}
                </Link>
              </div>
            </div>
          )}
        </OvCard>
      </div>
    </div>
  )
}
