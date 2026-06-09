'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { getProgressData } from '@/lib/services/progress'
import { getUser } from '@/lib/services/auth'

/* ── Types ────────────────────────────────────────────────────────────────── */
interface SkillRow { key: string; label: string; band: number; start: number; target: number; delta: number; sparkline: number[] }
interface WCrit { task: number; coherence: number; lexical: number; grammar: number }
interface WritingSubmission {
  id: string; task_type: string; band_score: number | null
  task_achievement: number | null; coherence_cohesion: number | null
  lexical_resource: number | null; grammatical_accuracy: number | null; created_at: string
}
interface MockAttempt { id: string; completed_at: string; band_score: number | null; total_score: number | null }
/** A weak spot within a skill — a question type (accuracy) or a criterion (band). */
interface Spot { label: string; value: number; kind: 'accuracy' | 'band' }
/** Per-skill detail: current band, improvement since start, trend, and weak spots. */
interface SkillDetail {
  key: string; label: string; band: number; startBand: number; delta: number
  attempts: number; sparkline: number[]; spots: Spot[]
}
interface PageData {
  overallBand: number; targetBand: number; streak: number; hoursThisWeek: string; vsLastPct: number
  skillRows: SkillRow[]
  trajectory: number[]
  perSkill: SkillDetail[]
  weeklyBars: { label: string; w: number; s: number; r: number; l: number }[]
  mockLine: { label: string; value: number }[]
  heatmap: number[]
  writingCriteria: WCrit | null; writingHistory: WritingSubmission[]; mockAttempts: MockAttempt[]
}

/** Raw data + the weak-spot accuracy, computed once; PageData is derived per period. */
interface RawProgress {
  bandHistory: any[]; writingSubmissions: any[]; speakingSubmissions: any[]
  attempts: any[]; studySessions: any[]; profile: any
  readingAcc: { label: string; accuracy: number; total: number }[]
  listeningAcc: { label: string; accuracy: number; total: number }[]
}

const SKILL_META = [
  { key: 'writing', label: 'Writing' }, { key: 'speaking', label: 'Speaking' },
  { key: 'reading', label: 'Reading' }, { key: 'listening', label: 'Listening' },
]

const roundToHalf = (n: number) => Math.round(n * 2) / 2

// week / month / all-time (the period toggle, default = month).
const PERIOD_DAYS = [7, 30, Infinity]
const WRITING_CRIT = [
  { key: 'task_achievement', label: 'Task' }, { key: 'coherence_cohesion', label: 'Coherence' },
  { key: 'lexical_resource', label: 'Lexical' }, { key: 'grammatical_accuracy', label: 'Grammar' },
] as const
const SPEAKING_CRIT = [
  { key: 'fluency_score', label: 'Fluency' }, { key: 'lexical_score', label: 'Lexical' },
  { key: 'grammar_score', label: 'Grammar' }, { key: 'pronunciation_score', label: 'Pronunciation' },
] as const

function avgCrit(rows: any[], key: string): number | null {
  const v = rows.map(r => r[key]).filter((x: any) => typeof x === 'number') as number[]
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
}

/** Derive everything the page renders from the raw data, scoped to the period. */
function buildPageData(raw: RawProgress, period: number): PageData {
  const cutoff = Date.now() - (PERIOD_DAYS[period] ?? Infinity) * 86400000
  const inPeriod = (ts: string) => new Date(ts).getTime() >= cutoff

  const targetBand: number = raw.profile?.target_band_score ?? 7.5
  // Score-based trends respect the period; the activity heatmap / weekly bars are
  // their own fixed "recent" views and stay independent.
  const history = (raw.bandHistory ?? []).filter(r => inPeriod(r.recorded_at))
  const sessions = (raw.studySessions ?? []) as { skill: string; duration_minutes: number; created_at: string }[]
  const attempts = (raw.attempts ?? []).filter((a: any) => a.completed_at && inPeriod(a.completed_at))

  // Current band is always the latest known score (never hidden by the period);
  // the trend (first score, sparkline, improvement) is scoped to the period.
  const bySkillFull: Record<string, number[]> = {}
  for (const row of (raw.bandHistory ?? [])) { (bySkillFull[row.skill] ??= []).push(row.score) }
  const bySkillPeriod: Record<string, number[]> = {}
  for (const row of history) { (bySkillPeriod[row.skill] ??= []).push(row.score) }

  const latestScore = (sk: string) => bySkillFull[sk]?.at(-1) ?? 0
  const prevScore   = (sk: string) => bySkillFull[sk]?.at(-2) ?? latestScore(sk)
  const firstScore  = (sk: string) => bySkillPeriod[sk]?.[0] ?? latestScore(sk)
  const sparkline   = (sk: string) => {
    const p = bySkillPeriod[sk] ?? []
    return (p.length >= 2 ? p : (bySkillFull[sk] ?? [])).slice(-7)
  }

  const skillRows: SkillRow[] = SKILL_META.map(m => {
    const latest = latestScore(m.key), prev = prevScore(m.key), first = firstScore(m.key)
    return {
      ...m,
      band: latest > 0 ? roundToHalf(latest) : 0,
      start: first > 0 ? roundToHalf(first) : 0,
      target: targetBand,
      delta: +(roundToHalf(latest) - roundToHalf(prev)).toFixed(1),
      sparkline: sparkline(m.key).map(v => roundToHalf(v)),
    }
  })

  const overallBand = skillRows.some(s => s.band > 0)
    ? roundToHalf(skillRows.reduce((s, r) => s + r.band, 0) / skillRows.filter(r => r.band > 0).length)
    : 0

  // Overall mock-band trajectory (all skills) — built from completed attempts, so
  // it's clean even after individual tests are removed.
  const mocks = attempts.filter((a: any) => a.band_score != null)
  const trajectory = mocks.map((a: any) => roundToHalf(a.band_score)).slice(-12)
  const mockLine = mocks.map((a: any) => ({
    label: new Date(a.completed_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    value: a.band_score,
  }))

  // Activity heatmap (12 weeks) + streak — from all sessions.
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const heatmap = Array(84).fill(0) as number[]
  for (const s of sessions) {
    const d = new Date(s.created_at); d.setHours(0, 0, 0, 0)
    const diff = Math.round((today.getTime() - d.getTime()) / 86400000)
    if (diff >= 0 && diff < 84) heatmap[83 - diff] += s.duration_minutes ?? 0
  }
  let streak = 0
  for (let i = 83; i >= 0; i--) { if (heatmap[i] > 0) streak++; else break }

  type SK = 'writing' | 'speaking' | 'reading' | 'listening'
  const SKS: SK[] = ['writing', 'speaking', 'reading', 'listening']
  const DAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  const weeklyBars = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today); d.setDate(d.getDate() - 6 + i)
    const ds = d.toDateString()
    const ds2 = sessions.filter(s => new Date(s.created_at).toDateString() === ds)
    const mins: Record<SK, number> = { writing: 0, speaking: 0, reading: 0, listening: 0 }
    for (const sk of SKS) mins[sk] = ds2.filter(s => s.skill === sk).reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0)
    return { label: DAY[d.getDay()], w: mins.writing, s: mins.speaking, r: mins.reading, l: mins.listening }
  })

  const thisWeekMins = weeklyBars.reduce((s, d) => s + d.w + d.s + d.r + d.l, 0)
  const lastWeekMins = heatmap.slice(83 - 14, 83 - 7).reduce((s, v) => s + v, 0)
  const vsLastPct = lastWeekMins > 0 ? Math.round(((thisWeekMins - lastWeekMins) / lastWeekMins) * 100) : 0
  const hrs = Math.floor(thisWeekMins / 60), m2 = thisWeekMins % 60
  const hoursThisWeek = thisWeekMins > 0 ? (m2 > 0 ? `${hrs}h ${m2}m` : `${hrs}h`) : '0m'

  // Writing criteria — averaged across recent essays (not just the latest).
  const writingCriteria: WCrit | null = (raw.writingSubmissions ?? []).some((w: any) => w.task_achievement != null) ? {
    task: avgCrit(raw.writingSubmissions, 'task_achievement') ?? 0,
    coherence: avgCrit(raw.writingSubmissions, 'coherence_cohesion') ?? 0,
    lexical: avgCrit(raw.writingSubmissions, 'lexical_resource') ?? 0,
    grammar: avgCrit(raw.writingSubmissions, 'grammatical_accuracy') ?? 0,
  } : null

  // Per-skill weak spots: question-type accuracy for reading/listening, criterion
  // averages for writing/speaking (weakest first).
  const critSpots = (rows: any[], defs: readonly { key: string; label: string }[]): Spot[] =>
    defs.map(d => ({ key: d.key, label: d.label, avg: avgCrit(rows, d.key) }))
      .filter(x => x.avg != null)
      .sort((a, b) => (a.avg as number) - (b.avg as number))
      .slice(0, 3)
      .map(x => ({ label: x.label, value: x.avg as number, kind: 'band' as const }))

  const perSkill: SkillDetail[] = SKILL_META.map(m => {
    const sk = m.key
    const band = latestScore(sk) > 0 ? roundToHalf(latestScore(sk)) : 0
    const startBand = firstScore(sk) > 0 ? roundToHalf(firstScore(sk)) : band
    let spots: Spot[] = []
    if (sk === 'reading') spots = raw.readingAcc.slice(0, 3).map(a => ({ label: a.label, value: a.accuracy, kind: 'accuracy' as const }))
    else if (sk === 'listening') spots = raw.listeningAcc.slice(0, 3).map(a => ({ label: a.label, value: a.accuracy, kind: 'accuracy' as const }))
    else if (sk === 'writing') spots = critSpots(raw.writingSubmissions, WRITING_CRIT)
    else if (sk === 'speaking') spots = critSpots(raw.speakingSubmissions, SPEAKING_CRIT)
    return {
      key: sk, label: m.label, band, startBand,
      delta: +(band - startBand).toFixed(1),
      attempts: bySkillFull[sk]?.length ?? 0,
      sparkline: sparkline(sk).map(v => roundToHalf(v)),
      spots,
    }
  })

  return {
    overallBand, targetBand, streak, hoursThisWeek, vsLastPct, skillRows, trajectory, perSkill,
    weeklyBars, mockLine, heatmap, writingCriteria,
    writingHistory: raw.writingSubmissions ?? [], mockAttempts: attempts,
  }
}

/* ── SVG Icon helper ──────────────────────────────────────────────────────── */
const ICON_PATHS: Record<string, React.ReactNode> = {
  flame:     <path d="M12 22c4 0 7-3 7-7 0-3-2-5-3-7-1.5 2-3 3-3 5 0-2-1-4-3-6-1 2-5 4-5 9 0 4 3 6 7 6z"/>,
  clock:     <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  clipboard: <><rect x="6" y="4" width="12" height="17" rx="2"/><rect x="9" y="2" width="6" height="4" rx="1"/></>,
  layers:    <><path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/><path d="M3 18l9 5 9-5"/></>,
  trophy:    <><path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M16 5h3v3a3 3 0 0 1-3 3M8 5H5v3a3 3 0 0 0 3 3"/><path d="M10 14h4v3h2v3H8v-3h2z"/></>,
  headphones:<><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1v-6h3z"/><path d="M3 19a2 2 0 0 0 2 2h1v-6H3z"/></>,
  pencil:    <path d="M14 4l6 6L9 21H3v-6z"/>,
  mic:       <><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></>,
  chevronRight: <path d="M9 6l6 6-6 6"/>,
}

function Icon({ name, size = 16, color = 'currentColor' }: { name: string; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {ICON_PATHS[name]}
    </svg>
  )
}

/* ── BandTrajectory ───────────────────────────────────────────────────────── */
function BandTrajectory({ data, overallBand, targetBand }: { data: PageData; overallBand: number; targetBand: number }) {
  const { t } = useLanguage()
  // Overall mock-band trajectory across all skills (not listening-only).
  const history = data.trajectory
  const hasRealData = history.length >= 2

  if (!hasRealData) {
    return (
      <div className="card" style={{ padding: 28 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)' }}>{t('progress.trajectory')}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 6 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 52, lineHeight: 1, color: 'var(--text-3)', fontWeight: 500 }}>—</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{t('progress.targetBand')}</div>
            <div style={{ fontSize: 24, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--text)' }}>{(targetBand || 7.5).toFixed(1)}</div>
          </div>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 20, lineHeight: 1.55 }}>
          {t('progress.trajectoryEmpty')}
        </p>
      </div>
    )
  }

  const points = history
  const labels = points.map((_, i) => i === points.length - 1 ? t('progress.today') : `W${i + 1}`)
  const target = targetBand || 7.5
  const W = 600, H = 220
  const padL = 36, padR = 16, padT = 24, padB = 32
  const w = W - padL - padR, h = H - padT - padB
  const min = 4.0, max = 9.0
  const xs = points.map((_, i) => padL + (i / (points.length - 1)) * w)
  const ys = points.map(v => padT + (1 - (v - min) / (max - min)) * h)
  const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x},${ys[i]}`).join(' ')
  const area = `${path} L${xs[xs.length - 1]},${padT + h} L${xs[0]},${padT + h} Z`
  const ty = padT + (1 - (target - min) / (max - min)) * h
  const displayBand = overallBand > 0 ? overallBand.toFixed(1) : '—'
  const delta = points.length >= 2 ? +(points.at(-1)! - points[0]).toFixed(1) : 0

  return (
    <div className="card" style={{ padding: 28 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)' }}>{t('progress.trajectory')}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 6 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 52, lineHeight: 1, color: 'var(--accent)', fontWeight: 500 }}>{displayBand}</span>
            {delta > 0 && (
              <span className="chip chip-accent" style={{ fontSize: 11 }}>+{delta.toFixed(1)} {t('progress.fromStart')}</span>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{t('progress.targetBand')}</div>
          <div style={{ fontSize: 24, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--text)' }}>{target.toFixed(1)}</div>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', marginTop: 14 }}>
        <defs>
          <linearGradient id="bg" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25"/>
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0"/>
          </linearGradient>
        </defs>
        {[5, 6, 7, 8, 9].map(v => {
          const y = padT + (1 - (v - min) / (max - min)) * h
          return (
            <g key={v}>
              <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="var(--border)" strokeDasharray="2 4"/>
              <text x={padL - 8} y={y + 3} textAnchor="end" fontSize="10" fill="var(--text-3)">{v}.0</text>
            </g>
          )
        })}
        <line x1={padL} x2={W - padR} y1={ty} y2={ty} stroke="var(--warn)" strokeDasharray="4 4" strokeWidth="1.5"/>
        <text x={W - padR - 4} y={ty - 6} textAnchor="end" fontSize="10" fill="var(--warn)" fontWeight="700">TARGET</text>
        <path d={area} fill="url(#bg)"/>
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        {xs.map((x, i) => (
          <g key={i}>
            <circle cx={x} cy={ys[i]} r={i === xs.length - 1 ? 5 : 3} fill="var(--accent)" stroke="var(--bg)" strokeWidth="2"/>
            <text x={x} y={H - 12} textAnchor="middle" fontSize="10" fill="var(--text-3)">{labels[i]}</text>
          </g>
        ))}
      </svg>
    </div>
  )
}

/* ── KeyStats ─────────────────────────────────────────────────────────────── */
function KeyStats({ data }: { data: PageData }) {
  const { t } = useLanguage()
  const bestBand = Math.max(0, ...data.skillRows.map(s => s.band))
  const essaysGraded = data.writingHistory.length
  const rows = [
    { icon: 'flame',     color: 'var(--warn)',   label: t('progress.currentStreak'),  value: data.streak > 0 ? `${data.streak} ${data.streak === 1 ? t('progress.day') : t('progress.days')}` : '—', sub: data.streak > 0 ? t('progress.keepItUp') : t('progress.startToday') },
    { icon: 'clock',     color: 'var(--info)',   label: t('progress.hoursPracticed'), value: data.hoursThisWeek,      sub: data.vsLastPct !== 0 ? `${data.vsLastPct > 0 ? '+' : ''}${data.vsLastPct}% ${t('progress.vsLastWk')}` : t('progress.thisWeek') },
    { icon: 'clipboard', color: 'var(--accent)', label: t('progress.mockTests'),      value: `${data.mockAttempts.length}`, sub: t('progress.completed') },
    { icon: 'pencil',    color: '#6b46c1',       label: t('progress.essaysGraded'),   value: `${essaysGraded}`,       sub: essaysGraded > 0 ? t('progress.aiFeedback') : t('progress.noneYet') },
    { icon: 'trophy',    color: '#c47a1a',       label: t('progress.bestBand'),       value: bestBand > 0 ? bestBand.toFixed(1) : '—', sub: bestBand > 0 ? t('progress.acrossSkills') : '' },
  ]

  return (
    <div className="card" style={{ padding: 24 }}>
      <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{t('progress.keyStats')}</h3>
      <div style={{ display: 'grid', gap: 14 }}>
        {rows.map(r => (
          <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `color-mix(in srgb, ${r.color} 12%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name={r.icon} size={16} color={r.color} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{r.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.1, color: 'var(--text)' }}>
                {r.value}
                {r.sub && <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)', marginLeft: 6 }}>· {r.sub}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── SkillBreakdown ───────────────────────────────────────────────────────── */
function SkillBreakdown({ data }: { data: PageData }) {
  const { t } = useLanguage()
  const COLORS: Record<string, string> = {
    listening: 'var(--accent)', reading: 'var(--info)', writing: 'var(--warn)', speaking: 'var(--danger)',
  }
  // Only show skills the user has actually attempted (real band data)
  const skills = data.skillRows
    .filter(s => s.band > 0)
    .map(s => ({
      name: s.label,
      key: s.key,
      current: s.band,
      start:   s.start > 0 ? s.start : s.band,
      target:  s.target > 0 ? s.target : 7.5,
      color:   COLORS[s.key] ?? 'var(--accent)',
    }))
  const range = 9 - 4

  return (
    <div className="card" style={{ padding: 28 }}>
      <h3 style={{ margin: '0 0 18px', fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>{t('progress.skillBreakdown')}</h3>
      {skills.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.5, margin: 0 }}>
          {t('progress.skillEmpty')}
        </p>
      ) : (
      <div style={{ display: 'grid', gap: 18 }}>
        {skills.map(s => {
          const clamp = (v: number) => Math.max(0, Math.min(100, ((v - 4) / range) * 100))
          const startPct = clamp(s.start)
          const curPct   = clamp(s.current)
          const tgtPct   = clamp(s.target)
          const fillLeft  = Math.min(startPct, curPct)
          const fillWidth = Math.abs(curPct - startPct)
          return (
            <div key={s.name}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{t('dashboard.' + s.key)}</span>
                <span style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
                  <span style={{ color: 'var(--text-3)' }}>{s.start.toFixed(1)} → </span>
                  <strong style={{ color: 'var(--text)' }}>{s.current.toFixed(1)}</strong>
                  <span style={{ color: 'var(--text-3)' }}> → {s.target.toFixed(1)}</span>
                </span>
              </div>
              <div style={{ position: 'relative', height: 8, background: 'var(--bg-soft)', borderRadius: 999, overflow: 'visible' }}>
                <div style={{ position: 'absolute', left: `${fillLeft}%`, width: `${fillWidth}%`, height: '100%', background: s.color, borderRadius: 999 }}/>
                <div style={{ position: 'absolute', left: `${tgtPct}%`, top: -3, bottom: -3, width: 2, background: 'var(--text)', borderRadius: 1 }}/>
                <div style={{ position: 'absolute', left: `clamp(7px, ${curPct}%, calc(100% - 7px))`, top: -4, transform: 'translateX(-50%)', width: 14, height: 14, borderRadius: '50%', background: 'var(--bg-elev)', border: `2px solid ${s.color}` }}/>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginTop: 4, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                <span>4.0</span><span>6.5</span><span>9.0</span>
              </div>
            </div>
          )
        })}
      </div>
      )}
    </div>
  )
}

/* ── StudyTime ────────────────────────────────────────────────────────────── */
function StudyTime({ data }: { data: PageData }) {
  const { t } = useLanguage()
  const colors = { l: 'var(--accent)', r: 'var(--info)', w: 'var(--warn)', s: 'var(--danger)' } as const
  const days = data.weeklyBars
  const maxH = Math.max(...days.map(d => d.w + d.s + d.r + d.l), 1)
  const total = days.reduce((s, d) => s + d.w + d.s + d.r + d.l, 0)

  return (
    <div className="card" style={{ padding: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>{t('progress.studyTime')}</h3>
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
          {Math.floor(total / 60)}h {total % 60}m {t('progress.thisWeek')}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 160 }}>
        {days.map((day, i) => {
          const h = day.w + day.s + day.r + day.l
          const segments = [
            { k: 'l' as const, v: day.l },
            { k: 'r' as const, v: day.r },
            { k: 'w' as const, v: day.w },
            { k: 's' as const, v: day.s },
          ].filter(x => x.v > 0)
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10, color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>{h || ''}</span>
              <div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column-reverse', borderRadius: 6, overflow: 'hidden', background: 'var(--bg-soft)', minHeight: 8 }}>
                {segments.map(seg => (
                  <div key={seg.k} style={{ height: `${(seg.v / maxH) * (100 / segments.length)}%`, background: colors[seg.k], opacity: 0.85 }}/>
                ))}
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{day.label}</span>
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap', fontSize: 11, color: 'var(--text-2)' }}>
        {[['listening', colors.l], ['reading', colors.r], ['writing', colors.w], ['speaking', colors.s]].map(([k, v]) => (
          <div key={k as string} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: v as string }}/>
            {t('dashboard.' + (k as string))}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── ActivityLog ──────────────────────────────────────────────────────────── */
function ActivityLog({ data }: { data: PageData }) {
  const { t } = useLanguage()
  // Build the feed purely from the user's real activity — writing submissions and
  // completed mock tests — newest first. No fabricated placeholders.
  const events = [
    ...data.writingHistory.map(sub => ({
      ts: new Date(sub.created_at).getTime(),
      icon: 'pencil', color: 'var(--warn)',
      title: t('progress.submittedWriting', { n: sub.task_type === '1' ? '1' : '2' }),
      meta: sub.band_score != null ? `${sub.band_score.toFixed(1)} ${t('progress.bandFeedbackReady')}` : t('progress.pendingReview'),
    })),
    ...data.mockAttempts.map(att => ({
      ts: new Date(att.completed_at).getTime(),
      icon: 'clipboard', color: 'var(--info)',
      title: t('progress.mockCompleted'),
      meta: att.band_score != null ? t('progress.overallMeta', { band: att.band_score.toFixed(1) }) : t('progress.submitted'),
    })),
  ]
    .filter(e => !Number.isNaN(e.ts))
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 12)
    .map(e => ({
      ...e,
      date: new Date(e.ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    }))

  return (
    <div className="card" style={{ padding: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>{t('progress.activityLog')}</h3>
        <button style={{ fontSize: 12, color: 'var(--text-3)', background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 10px', cursor: events.length === 0 ? 'default' : 'pointer', opacity: events.length === 0 ? 0.5 : 1 }} disabled={events.length === 0}>
          {t('progress.exportCsv')}
        </button>
      </div>
      {events.length === 0 ? (
        <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13, lineHeight: 1.55 }}>
          {t('progress.noActivity')}<br/>
          <span style={{ fontSize: 12 }}>{t('progress.noActivitySub')}</span>
        </div>
      ) : (
      <div style={{ display: 'grid', gap: 4 }}>
        {events.map((e, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px', borderRadius: 10, transition: 'background .15s' }}
            onMouseEnter={el => (el.currentTarget.style.background = 'var(--bg-soft)')}
            onMouseLeave={el => (el.currentTarget.style.background = 'transparent')}>
            <div style={{ fontSize: 11, width: 130, flexShrink: 0, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{e.date}</div>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `color-mix(in srgb, ${e.color} 14%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name={e.icon} size={14} color={e.color} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{e.meta}</div>
            </div>
            <Icon name="chevronRight" size={14} color="var(--text-3)" />
          </div>
        ))}
      </div>
      )}
    </div>
  )
}

/* ── SkillDetails — per-skill improvement + weak spots ────────────────────── */
function MiniSpark({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null
  const W = 88, H = 26, min = 4, max = 9
  const xs = values.map((_, i) => (i / (values.length - 1)) * W)
  const ys = values.map(v => H - ((Math.max(min, Math.min(max, v)) - min) / (max - min)) * H)
  const path = xs.map((x, i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: 88, height: 26 }} preserveAspectRatio="none">
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function spotColor(s: Spot): string {
  const v = s.kind === 'accuracy' ? s.value : s.value / 9
  if (v < 0.6) return 'var(--danger)'
  if (v < 0.78) return 'var(--warn)'
  return 'var(--accent)'
}

function SkillDetails({ data }: { data: PageData }) {
  const { t } = useLanguage()
  const COLORS: Record<string, string> = { listening: 'var(--accent)', reading: 'var(--info)', writing: 'var(--warn)', speaking: 'var(--danger)' }
  const skills = data.perSkill.filter(s => s.band > 0 || s.spots.length > 0)
  if (skills.length === 0) return null

  return (
    <div className="card" style={{ padding: 28 }}>
      <h3 style={{ margin: '0 0 18px', fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>{t('progress.skillDetails')}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 16 }}>
        {skills.map(s => {
          const color = COLORS[s.key] ?? 'var(--accent)'
          return (
            <div key={s.key} style={{ padding: 18, border: '1px solid var(--border)', borderRadius: 12, background: 'var(--bg-soft)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{t('dashboard.' + s.key)}</span>
                <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <strong style={{ fontSize: 18, color, fontVariantNumeric: 'tabular-nums' }}>{s.band > 0 ? s.band.toFixed(1) : '—'}</strong>
                  {s.delta > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>+{s.delta.toFixed(1)}</span>}
                  {s.delta < 0 && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--danger)' }}>{s.delta.toFixed(1)}</span>}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 2, minHeight: 26 }}>
                <span style={{ fontSize: 11, color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>
                  {s.startBand > 0 && s.sparkline.length >= 2 ? `${s.startBand.toFixed(1)} → ${s.band.toFixed(1)}` : ''}
                </span>
                <MiniSpark values={s.sparkline} color={color} />
              </div>

              {s.spots.length > 0 && (
                <div style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8 }}>{t('progress.weakSpots')}</div>
                  <div style={{ display: 'grid', gap: 7 }}>
                    {s.spots.map((sp, i) => {
                      const c = spotColor(sp)
                      const display = sp.kind === 'accuracy' ? `${Math.round(sp.value * 100)}%` : sp.value.toFixed(1)
                      const pct = sp.kind === 'accuracy' ? sp.value * 100 : (sp.value / 9) * 100
                      return (
                        <div key={i}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 3 }}>
                            <span style={{ color: 'var(--text-2)' }}>{sp.label}</span>
                            <span style={{ fontWeight: 700, color: c, fontVariantNumeric: 'tabular-nums' }}>{display}</span>
                          </div>
                          <div style={{ height: 4, background: 'var(--bg-elev)', borderRadius: 999, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: c, borderRadius: 999 }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Main page ────────────────────────────────────────────────────────────── */
export default function ProgressPage() {
  const { t } = useLanguage()
  const [period, setPeriod] = useState(1)
  const [raw, setRaw] = useState<RawProgress | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { user } = await getUser()
      if (!user) { setLoading(false); return }
      const { getSubskillAccuracy } = await import('@/lib/services/tests')
      const [progress, readingAcc, listeningAcc] = await Promise.all([
        getProgressData(user.id),
        getSubskillAccuracy(user.id, 'reading').catch(() => []),
        getSubskillAccuracy(user.id, 'listening').catch(() => []),
      ])
      setRaw({ ...progress, readingAcc, listeningAcc })
      setLoading(false)
    }
    load()
  }, [])

  // Derive everything for the selected period — so the week/month/all-time toggle
  // actually changes the trends (it used to only restyle the buttons).
  const data = useMemo(() => (raw ? buildPageData(raw, period) : null), [raw, period])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 260 }}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin .8s linear infinite' }}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  if (!data) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 260 }}>
        <p style={{ fontSize: 14, color: 'var(--text-3)' }}>{t('progress.signIn')}</p>
      </div>
    )
  }
  const d = data

  return (
    <div style={{ padding: '32px 32px 80px' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.025em', margin: 0, color: 'var(--text)' }}>{t('progress.title')}</h1>
          <p style={{ fontSize: 15, margin: '6px 0 0', color: 'var(--text-2)' }}>
            {d.mockAttempts.length} {t('progress.subMocks')} · {d.hoursThisWeek} {t('progress.subPracticed')} · {d.streak} {t('dash.dayStreak')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 4, padding: 4, background: 'var(--bg-soft)', borderRadius: 999, border: '1px solid var(--border)' }}>
          {[t('progress.week'), t('progress.month'), t('progress.allTime')].map((p, i) => (
            <button key={p} onClick={() => setPeriod(i)} style={{
              padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: i === period ? 'var(--bg-elev)' : 'transparent',
              boxShadow: i === period ? 'var(--shadow-sm)' : 'none',
              color: i === period ? 'var(--text)' : 'var(--text-2)', border: 'none',
            }}>{p}</button>
          ))}
        </div>
      </div>

      {/* Row 1: trajectory + key stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 16 }}>
        <BandTrajectory data={d} overallBand={d.overallBand} targetBand={d.targetBand} />
        <KeyStats data={d} />
      </div>

      {/* Row 2: skill breakdown + study time */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 16, marginTop: 16 }}>
        <SkillBreakdown data={d} />
        <StudyTime data={d} />
      </div>

      {/* Row 3: per-skill detail — improvement + weak spots */}
      <div style={{ marginTop: 16 }}>
        <SkillDetails data={d} />
      </div>

      {/* Row 4: activity log */}
      <div style={{ marginTop: 16 }}>
        <ActivityLog data={d} />
      </div>
    </div>
  )
}
