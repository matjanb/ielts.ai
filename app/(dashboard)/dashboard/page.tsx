'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { getStudyStreak } from '@/lib/services/user'
import { getDashboardData } from '@/lib/services/progress'
import { getUser } from '@/lib/services/auth'
import type { Profile } from '@/lib/types/database'

// ── Sparkline (mini SVG line chart) ───────────────────────────────────────────
function Sparkline({ data, width = 120, height = 28 }: { data: number[]; width?: number; height?: number }) {
  if (!data.length) return null
  const min = Math.min(...data), max = Math.max(...data)
  const range = max - min || 1
  const step = width / (data.length - 1)
  const pts = data.map((v, i) => [i * step, height - ((v - min) / range) * (height - 4) - 2])
  const d = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ')
  const area = `${d} L${width},${height} L0,${height} Z`
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="sg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.2" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sg)" />
      <path d={d} fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── Ring (SVG donut) ───────────────────────────────────────────────────────────
function Ring({ value, size = 56, stroke = 5, label }: { value: number; size?: number; stroke?: number; label?: string }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const off = c - Math.max(0, Math.min(1, value)) * c
  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} strokeWidth={stroke} fill="none" stroke="var(--border)" />
        <circle cx={size/2} cy={size/2} r={r} strokeWidth={stroke} fill="none"
          stroke="var(--accent)" strokeDasharray={c} strokeDashoffset={off}
          strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} />
      </svg>
      {label && (
        <div style={{ position: 'absolute', fontSize: size * 0.22, fontWeight: 700, textAlign: 'center', color: 'var(--text)' }}>
          {label}
        </div>
      )}
    </div>
  )
}

// ── Band predictor arc ─────────────────────────────────────────────────────────
function BandPredictor({ current = 0, target = 7.5 }: { current: number; target: number }) {
  const min = 4, max = 9
  const pct = current > 0 ? (current - min) / (max - min) : 0
  const targetPct = (target - min) / (max - min)
  return (
    <div className="card" style={{ padding: 28 }}>
      <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)' }}>Predicted band</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 8 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 68, lineHeight: 0.9, color: 'var(--accent)', fontWeight: 500 }}>
          {current > 0 ? current.toFixed(1) : '—'}
        </span>
      </div>
      <svg viewBox="0 0 200 110" style={{ width: '100%', marginTop: 16 }}>
        <path d="M10,100 A90,90 0 0 1 190,100" stroke="var(--border)" strokeWidth="6" fill="none" strokeLinecap="round"/>
        {pct > 0 && (
          <path d={`M10,100 A90,90 0 0 1 ${10 + 180 * pct},${100 - Math.sin(Math.PI * pct) * 90}`}
            stroke="var(--accent)" strokeWidth="6" fill="none" strokeLinecap="round"/>
        )}
        {(() => {
          const angle = Math.PI * (1 - targetPct)
          const cx = 100 + Math.cos(angle) * 90
          const cy = 100 - Math.sin(angle) * 90
          return (
            <g>
              <circle cx={cx} cy={cy} r="4" fill="var(--bg)" stroke="var(--accent)" strokeWidth="2"/>
              <text x={cx} y={cy - 8} textAnchor="middle" fill="var(--accent)" fontSize="9" fontWeight="700">TARGET</text>
            </g>
          )
        })()}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
        <span>4.0</span><span>6.5</span><span>9.0</span>
      </div>
    </div>
  )
}

// ── Skill tile ─────────────────────────────────────────────────────────────────
const SKILL_ICONS: Record<string, React.ReactNode> = {
  listening: <><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1v-6h3z"/><path d="M3 19a2 2 0 0 0 2 2h1v-6H3z"/></>,
  reading:   <><path d="M4 4h7a3 3 0 0 1 3 3v13"/><path d="M20 4h-7a3 3 0 0 0-3 3"/><path d="M4 4v15a1 1 0 0 0 1 1h15"/></>,
  writing:   <path d="M14 4l6 6L9 21H3v-6z"/>,
  speaking:  <><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></>,
  overall:   <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></>,
}

const SKILL_HREFS: Record<string, string> = {
  listening: '/listening',
  reading:   '/reading',
  writing:   '/dashboard/writing',
  speaking:  '/dashboard/speaking',
  overall:   '/dashboard/progress',
}

function SkillTile({ skill, score, delta }: { skill: string; score: number; delta: number }) {
  const sparkData = [score - 1.5, score - 1.2, score - 0.8, score - 0.4, score]
  const isPos = delta >= 0
  return (
    <Link href={SKILL_HREFS[skill] ?? '/dashboard'} style={{ textDecoration: 'none' }}>
      <div className="card" style={{ padding: 20, position: 'relative', overflow: 'hidden', transition: 'transform .2s' }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'none')}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="var(--text-2)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                {SKILL_ICONS[skill]}
              </svg>
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', textTransform: 'capitalize' }}>{skill}</span>
          </div>
          {delta !== 0 && (
            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 999, background: 'var(--accent-soft)', color: 'var(--accent)' }}>
              {isPos ? '+' : ''}{delta.toFixed(1)}
            </span>
          )}
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 40, lineHeight: 1, color: 'var(--text)', fontWeight: 500, marginBottom: 8 }}>
          {score > 0 ? score.toFixed(1) : '—'}
        </div>
        <Sparkline data={sparkData} height={24} />
      </div>
    </Link>
  )
}

// ── Streak card ────────────────────────────────────────────────────────────────
function StreakCard({ streak }: { streak: number }) {
  return (
    <div className="card" style={{ padding: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'color-mix(in srgb, var(--warn) 14%, transparent)', color: 'var(--warn)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="var(--warn)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22c4 0 7-3 7-7 0-3-2-5-3-7-1.5 2-3 3-3 5 0-2-1-4-3-6-1 2-5 4-5 9 0 4 3 6 7 6z"/>
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.08em' }}>CURRENT STREAK</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
            <span style={{ fontSize: 28, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--text)' }}>{streak}</span>
            <span style={{ fontSize: 13, color: 'var(--text-2)' }}>days</span>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 3, marginTop: 16 }}>
        {Array.from({ length: Math.min(streak + 1, 21) }).map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 20, borderRadius: 3,
            background: i === Math.min(streak, 20) ? 'var(--warn)' : i < Math.min(streak, 20) ? 'var(--accent)' : 'var(--border)',
          }}/>
        ))}
        {Array.from({ length: Math.max(0, 21 - Math.min(streak + 1, 21)) }).map((_, i) => (
          <div key={`e${i}`} style={{ flex: 1, height: 20, borderRadius: 3, background: 'var(--border)' }}/>
        ))}
      </div>
    </div>
  )
}

// ── Calendar heatmap ──────────────────────────────────────────────────────────
function CalendarStrip({ heatmap }: { heatmap: number[] }) {
  // heatmap: 84 levels (0-3), index 0 = 12 weeks ago, 83 = today
  const cell = (w: number, d: number) => heatmap[w * 7 + d] ?? 0
  return (
    <div className="card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Practice activity</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text-2)' }}>
          <span>Less</span>
          {[0,1,2,3].map(l => (
            <div key={l} style={{ width: 11, height: 11, borderRadius: 3, background: l === 0 ? 'var(--bg-soft)' : `color-mix(in srgb, var(--accent) ${20 + l*25}%, transparent)` }}/>
          ))}
          <span>More</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 3 }}>
        {Array.from({ length: 12 }).map((_, w) => (
          <div key={w} style={{ display: 'grid', gap: 3 }}>
            {Array.from({ length: 7 }).map((_, d) => {
              const v = cell(w, d)
              return (
                <div key={d} style={{
                  width: 13, height: 13, borderRadius: 3,
                  background: v === 0 ? 'var(--bg-soft)' : `color-mix(in srgb, var(--accent) ${20 + v*25}%, transparent)`,
                }}/>
              )
            })}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
        <span>12 weeks ago</span><span>today</span>
      </div>
    </div>
  )
}

// ── Today card ─────────────────────────────────────────────────────────────────
function TodayCard({ recentItems }: { recentItems: Array<{ label: string; score: number | null; href: string; skill: string }> }) {
  const sessions = recentItems.length > 0 ? recentItems : [
    { label: 'Listening practice', score: null, href: '/listening', skill: 'listening' },
    { label: 'Writing Task 2', score: null, href: '/dashboard/writing', skill: 'writing' },
    { label: 'Vocabulary review', score: null, href: '/vocabulary', skill: 'overall' },
  ]

  return (
    <div className="card" style={{ padding: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)' }}>Today's plan</div>
          <h2 style={{ fontSize: 20, margin: '6px 0 0', fontWeight: 600, letterSpacing: '-0.015em', color: 'var(--text)' }}>
            {sessions.length} session{sessions.length !== 1 ? 's' : ''} queued
          </h2>
        </div>
        <Ring value={0} size={52} stroke={4} />
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {sessions.map((s, i) => (
          <Link key={i} href={s.href} style={{ textDecoration: 'none' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '13px 16px', borderRadius: 12,
              background: i === 0 ? 'var(--accent-soft)' : 'var(--bg-soft)',
              border: i === 0 ? '1px solid var(--accent)' : '1px solid transparent',
              transition: 'background .15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = i === 0 ? 'var(--accent-soft)' : 'var(--border)')}
            onMouseLeave={e => (e.currentTarget.style.background = i === 0 ? 'var(--accent-soft)' : 'var(--bg-soft)')}
            >
              <div style={{ width: 34, height: 34, borderRadius: 9, background: i === 0 ? 'var(--accent)' : 'var(--bg-elev)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={i === 0 ? 'var(--accent-fg)' : 'var(--text-2)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  {SKILL_ICONS[s.skill] ?? SKILL_ICONS.overall}
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{s.label}</div>
                {s.score != null && <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Last: {s.score.toFixed(1)}</div>}
              </div>
              {i === 0 && (
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 4l14 8-14 8z"/>
                </svg>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { t } = useLanguage()
  const [profile, setProfile]         = useState<Profile | null>(null)
  const [scores, setScores]           = useState<Record<string, number>>({})
  const [deltas, setDeltas]           = useState<Record<string, number>>({})
  const [heatmap, setHeatmap]         = useState<number[]>([])
  const [recentItems, setRecentItems] = useState<Array<{ label: string; score: number | null; href: string; skill: string }>>([])
  const [streak, setStreak]           = useState(0)
  const [loading, setLoading]         = useState(true)

  const hour = new Date().getHours()
  const greetingTime = hour < 6 ? 'Late night' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  useEffect(() => {
    async function load() {
      const { user } = await getUser()
      if (!user) return

      const dashData = await getDashboardData(user.id)
      setProfile(dashData.profile)

      // Build latest score + real delta per skill (bandHistory is recorded_at DESC)
      const latest: Record<string, number> = {}
      const perSkill: Record<string, number[]> = {}
      for (const row of (dashData.bandHistory ?? [])) {
        if (!latest[row.skill]) latest[row.skill] = row.score
        ;(perSkill[row.skill] ??= []).push(row.score)
      }
      setScores(latest)
      const d: Record<string, number> = {}
      for (const sk of Object.keys(perSkill)) {
        const arr = perSkill[sk]
        d[sk] = arr.length >= 2 ? +(arr[0] - arr[1]).toFixed(1) : 0
      }
      setDeltas(d)

      // Real 84-day (12-week) activity heatmap from study sessions
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const mins = Array(84).fill(0) as number[]
      for (const s of (dashData.studySessions ?? [])) {
        const day = new Date(s.created_at); day.setHours(0, 0, 0, 0)
        const diff = Math.round((today.getTime() - day.getTime()) / 86400000)
        if (diff >= 0 && diff < 84) mins[83 - diff] += s.duration_minutes ?? 0
      }
      setHeatmap(mins.map(m => (m === 0 ? 0 : m < 20 ? 1 : m < 45 ? 2 : 3)))

      // Recent items from writing + speaking submissions
      const items = [
        ...dashData.writingSubmissions.slice(0, 2).map((w: any) => ({
          label: `Writing Task ${w.task_type === '1' ? '1' : '2'}`,
          score: w.band_score,
          href: '/dashboard/writing',
          skill: 'writing',
        })),
        ...dashData.speakingSubmissions.slice(0, 1).map((s: any) => ({
          label: `Speaking Part ${s.part}`,
          score: s.band_score,
          href: '/dashboard/speaking',
          skill: 'speaking',
        })),
      ]
      setRecentItems(items.slice(0, 3))

      const s = await getStudyStreak(user.id)
      setStreak(s)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 260 }}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }}/>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  const name = profile?.full_name?.split(' ')[0] ?? 'there'
  const overall = scores['overall'] ?? 0
  const target = profile?.target_band_score ?? 7.5
  const skills = ['listening', 'reading', 'writing', 'speaking'].filter(s => scores[s] != null)

  return (
    <div style={{ padding: '32px 32px 80px' }}>
      {/* Greeting */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 32, letterSpacing: '-0.025em', margin: 0, fontWeight: 700, color: 'var(--text)' }}>
          {greetingTime},{' '}
          <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--accent)' }}>{name}.</span>
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 15, color: 'var(--text-2)' }}>
          Target Band{' '}
          <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{typeof target === 'number' ? target.toFixed(1) : target}</span>
          {streak > 0 && <> · <span style={{ color: 'var(--warn)', fontWeight: 600 }}>🔥 {streak} day streak</span></>}
        </p>
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2.1fr 1fr', gap: 16, marginBottom: 16 }}>
        <TodayCard recentItems={recentItems} />
        <BandPredictor current={overall} target={typeof target === 'number' ? target : 7.5} />
      </div>

      {/* Skill tiles */}
      {skills.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 16 }}>
          {skills.map(skill => (
            <SkillTile key={skill} skill={skill} score={scores[skill]} delta={deltas[skill] ?? 0} />
          ))}
        </div>
      )}

      {/* Bottom grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <StreakCard streak={streak} />
        <CalendarStrip heatmap={heatmap} />
      </div>

      {/* Upgrade nudge */}
      {profile?.subscription_status === 'free' && (
        <div style={{ marginTop: 16, padding: '20px 24px', borderRadius: 16, background: 'var(--accent-soft)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{t('subscription.title')}</div>
            <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{t('subscription.subtitle')}</div>
          </div>
          <Link href="/subscription" style={{
            padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: 'var(--accent)', color: 'var(--accent-fg)', textDecoration: 'none', flexShrink: 0,
          }}>
            {t('subscription.upgradeBtn')}
          </Link>
        </div>
      )}
    </div>
  )
}
