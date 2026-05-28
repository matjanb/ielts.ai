'use client'

import { useEffect, useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { getProgressData } from '@/lib/services/progress'
import { getUser } from '@/lib/services/auth'

/* ── Types ────────────────────────────────────────────────────────────────── */
interface SkillRow { key: string; label: string; band: number; target: number; delta: number; sparkline: number[] }
interface WCrit { task: number; coherence: number; lexical: number; grammar: number }
interface WritingSubmission {
  id: string; task_type: string; band_score: number | null
  task_achievement: number | null; coherence_cohesion: number | null
  lexical_resource: number | null; grammatical_accuracy: number | null; created_at: string
}
interface MockAttempt { id: string; completed_at: string; band_score: number | null; total_score: number | null }
interface PageData {
  overallBand: number; targetBand: number; streak: number; hoursThisWeek: string; vsLastPct: number
  skillRows: SkillRow[]
  weeklyBars: { label: string; w: number; s: number; r: number; l: number }[]
  mockLine: { label: string; value: number }[]
  heatmap: number[]
  writingCriteria: WCrit | null; writingHistory: WritingSubmission[]; mockAttempts: MockAttempt[]
}

const SKILL_META = [
  { key: 'writing', label: 'Writing' }, { key: 'speaking', label: 'Speaking' },
  { key: 'reading', label: 'Reading' }, { key: 'listening', label: 'Listening' },
]

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
  // Use real band history if available, else show placeholder
  const history = data.skillRows.some(s => s.sparkline.length > 0)
    ? data.skillRows.find(s => s.key === 'listening')?.sparkline ?? []
    : [5.0, 5.5, 5.5, 6.0, 6.0, 6.5, 6.5, 7.0]

  const points = history.length >= 2 ? history : [5.0, 5.5, 5.5, 6.0, 6.0, 6.5, 6.5, overallBand || 7.0]
  const labels = points.map((_, i) => i === points.length - 1 ? 'Today' : `W${i + 1}`)
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
  const displayBand = overallBand > 0 ? overallBand.toFixed(1) : points.at(-1)?.toFixed(1) ?? '—'
  const delta = points.length >= 2 ? +(points.at(-1)! - points[0]).toFixed(1) : 0

  return (
    <div className="card" style={{ padding: 28 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)' }}>Overall band trajectory</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 6 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 52, lineHeight: 1, color: 'var(--accent)', fontWeight: 500 }}>{displayBand}</span>
            {delta > 0 && (
              <span className="chip chip-accent" style={{ fontSize: 11 }}>+{delta.toFixed(1)} from start</span>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Target band</div>
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
  const rows = [
    { icon: 'flame',     color: 'var(--warn)',   label: 'Current streak',  value: `${data.streak} days`,   sub: data.streak > 0 ? 'keep it up' : 'start today' },
    { icon: 'clock',     color: 'var(--info)',   label: 'Hours practiced', value: data.hoursThisWeek,      sub: data.vsLastPct !== 0 ? `${data.vsLastPct > 0 ? '+' : ''}${data.vsLastPct}% vs last wk` : '' },
    { icon: 'clipboard', color: 'var(--accent)', label: 'Mock tests',      value: `${data.mockAttempts.length}`, sub: 'completed' },
    { icon: 'layers',    color: '#6b46c1',       label: 'Words learned',   value: '412',                   sub: '98 to review' },
    { icon: 'trophy',    color: '#c47a1a',       label: 'Badges earned',   value: '4 / 12' },
  ]

  return (
    <div className="card" style={{ padding: 24 }}>
      <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Key stats</h3>
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
  const COLORS: Record<string, string> = {
    listening: 'var(--accent)', reading: 'var(--info)', writing: 'var(--warn)', speaking: 'var(--danger)',
  }
  const skills = data.skillRows.map(s => ({
    name: s.label,
    key: s.key,
    current: s.band > 0 ? s.band : 5.5,
    start:   Math.max(4, (s.band > 0 ? s.band - 1.0 : 5.0)),
    target:  s.target > 0 ? s.target : 7.5,
    color:   COLORS[s.key] ?? 'var(--accent)',
  }))
  const range = 9 - 4

  return (
    <div className="card" style={{ padding: 28 }}>
      <h3 style={{ margin: '0 0 18px', fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>Skill breakdown</h3>
      <div style={{ display: 'grid', gap: 18 }}>
        {skills.map(s => {
          const startPct = ((s.start - 4) / range) * 100
          const curPct   = ((s.current - 4) / range) * 100
          const tgtPct   = ((s.target - 4) / range) * 100
          return (
            <div key={s.name}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{s.name}</span>
                <span style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
                  <span style={{ color: 'var(--text-3)' }}>{s.start.toFixed(1)} → </span>
                  <strong style={{ color: 'var(--text)' }}>{s.current.toFixed(1)}</strong>
                  <span style={{ color: 'var(--text-3)' }}> → {s.target.toFixed(1)}</span>
                </span>
              </div>
              <div style={{ position: 'relative', height: 8, background: 'var(--bg-soft)', borderRadius: 999 }}>
                <div style={{ position: 'absolute', left: `${startPct}%`, width: `${curPct - startPct}%`, height: '100%', background: s.color, borderRadius: 999 }}/>
                <div style={{ position: 'absolute', left: `${tgtPct}%`, top: -3, bottom: -3, width: 2, background: 'var(--text)', borderRadius: 1 }}/>
                <div style={{ position: 'absolute', left: `${curPct}%`, top: -4, transform: 'translateX(-50%)', width: 14, height: 14, borderRadius: '50%', background: 'var(--bg-elev)', border: `2px solid ${s.color}` }}/>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginTop: 4, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                <span>4.0</span><span>6.5</span><span>9.0</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── StudyTime ────────────────────────────────────────────────────────────── */
function StudyTime({ data }: { data: PageData }) {
  const colors = { l: 'var(--accent)', r: 'var(--info)', w: 'var(--warn)', s: 'var(--danger)' } as const
  const days = data.weeklyBars
  const maxH = Math.max(...days.map(d => d.w + d.s + d.r + d.l), 1)
  const total = days.reduce((s, d) => s + d.w + d.s + d.r + d.l, 0)

  return (
    <div className="card" style={{ padding: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>Study time</h3>
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
          {Math.floor(total / 60)}h {total % 60}m this week
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
        {[['Listening', colors.l], ['Reading', colors.r], ['Writing', colors.w], ['Speaking', colors.s]].map(([k, v]) => (
          <div key={k as string} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: v as string }}/>
            {k}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── ActivityLog ──────────────────────────────────────────────────────────── */
function ActivityLog({ data }: { data: PageData }) {
  // Build real events from data, fall back to design placeholder
  const realEvents: Array<{ date: string; icon: string; color: string; title: string; meta: string }> = []

  for (const sub of data.writingHistory.slice(0, 3)) {
    realEvents.push({
      date: new Date(sub.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      icon: 'pencil', color: 'var(--warn)',
      title: `Submitted Writing Task ${sub.task_type === '1' ? '1' : '2'} essay`,
      meta: sub.band_score != null ? `${sub.band_score.toFixed(1)} band · AI feedback ready` : 'Pending review',
    })
  }

  const events = realEvents.length > 0 ? realEvents : [
    { date: 'Today, 09:24', icon: 'headphones', color: 'var(--accent)', title: 'Completed Listening · Section 4 — Urban planning', meta: '8.0 band · 9/10 correct' },
    { date: 'Today, 08:50', icon: 'layers',     color: '#6b46c1',       title: 'Reviewed 24 words from Academic Word List', meta: 'Set 12 · 100% recall' },
    { date: 'Yesterday',   icon: 'pencil',      color: 'var(--warn)',   title: 'Submitted Writing Task 2 essay', meta: '6.5 band · AI feedback ready' },
    { date: 'Yesterday',   icon: 'mic',         color: 'var(--danger)', title: 'AI Speaking session · Part 2 cue card', meta: '13:42 duration · 6.5 band' },
    { date: 'Last week',   icon: 'clipboard',   color: 'var(--info)',   title: 'Mock Test #03 completed', meta: 'Overall 7.0 · 3h 12m' },
    { date: 'Last week',   icon: 'trophy',      color: '#c47a1a',       title: 'Earned badge: 21-day streak', meta: '+50 XP' },
  ]

  return (
    <div className="card" style={{ padding: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>Activity log</h3>
        <button style={{ fontSize: 12, color: 'var(--text-3)', background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer' }}>
          Export CSV
        </button>
      </div>
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
    </div>
  )
}

/* ── Main page ────────────────────────────────────────────────────────────── */
export default function ProgressPage() {
  const [period, setPeriod] = useState(1)
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

      const bySkill: Record<string, number[]> = {}
      for (const row of history) {
        if (!bySkill[row.skill]) bySkill[row.skill] = []
        bySkill[row.skill].push(row.score)
      }
      const latestScore = (sk: string) => bySkill[sk]?.at(-1) ?? 0
      const prevScore   = (sk: string) => bySkill[sk]?.at(-2) ?? latestScore(sk)
      const sparkline   = (sk: string) => (bySkill[sk] ?? []).slice(-7)

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

      const mockLine = history
        .filter(r => r.source === 'mock_test' && r.skill === 'listening')
        .map(r => ({ label: new Date(r.recorded_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), value: r.score }))

      const today = new Date()
      today.setHours(0, 0, 0, 0)
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
      const hrs = Math.floor(thisWeekMins / 60)
      const mins2 = thisWeekMins % 60
      const hoursThisWeek = thisWeekMins > 0 ? (mins2 > 0 ? `${hrs}h ${mins2}m` : `${hrs}h`) : '0m'

      const latestW = (writingSubs ?? []).find((w: WritingSubmission) => w.task_achievement != null)
      const writingCriteria: WCrit | null = latestW ? {
        task: latestW.task_achievement ?? 0, coherence: latestW.coherence_cohesion ?? 0,
        lexical: latestW.lexical_resource ?? 0, grammar: latestW.grammatical_accuracy ?? 0,
      } : null

      setData({ overallBand, targetBand, streak, hoursThisWeek, vsLastPct, skillRows, weeklyBars, mockLine, heatmap, writingCriteria, writingHistory: writingSubs ?? [], mockAttempts: mockAttempts ?? [] })
      setLoading(false)
    }
    load()
  }, [])

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
        <p style={{ fontSize: 14, color: 'var(--text-3)' }}>Sign in to view your progress.</p>
      </div>
    )
  }
  const d = data

  return (
    <div style={{ padding: '32px 32px 80px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.025em', margin: 0, color: 'var(--text)' }}>Progress</h1>
          <p style={{ fontSize: 15, margin: '6px 0 0', color: 'var(--text-2)' }}>
            {d.mockAttempts.length} mock{d.mockAttempts.length !== 1 ? 's' : ''} completed · {d.hoursThisWeek} practiced · {d.streak} day streak
          </p>
        </div>
        <div style={{ display: 'flex', gap: 4, padding: 4, background: 'var(--bg-soft)', borderRadius: 999, border: '1px solid var(--border)' }}>
          {['Week', 'Month', 'All time'].map((p, i) => (
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
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16 }}>
        <BandTrajectory data={d} overallBand={d.overallBand} targetBand={d.targetBand} />
        <KeyStats data={d} />
      </div>

      {/* Row 2: skill breakdown + study time */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
        <SkillBreakdown data={d} />
        <StudyTime data={d} />
      </div>

      {/* Row 3: activity log */}
      <div style={{ marginTop: 16 }}>
        <ActivityLog data={d} />
      </div>
    </div>
  )
}
