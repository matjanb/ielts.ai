'use client'

import Link from 'next/link'
import type { IeltsTest } from '@/lib/types/database'

// ── Icon paths ────────────────────────────────────────────────────────────────
const ICON_PATHS: Record<string, React.ReactNode> = {
  headphones: <><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1v-6h3z"/><path d="M3 19a2 2 0 0 0 2 2h1v-6H3z"/></>,
  book:       <><path d="M4 4h7a3 3 0 0 1 3 3v13"/><path d="M20 4h-7a3 3 0 0 0-3 3"/><path d="M4 4v15a1 1 0 0 0 1 1h15"/></>,
  pencil:     <path d="M14 4l6 6L9 21H3v-6z"/>,
  mic:        <><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></>,
  clipboard:  <><rect x="6" y="4" width="12" height="17" rx="2"/><rect x="9" y="2" width="6" height="4" rx="1"/></>,
  arrowRight: <path d="M5 12h14M13 5l7 7-7 7"/>,
  play:       <path d="M6 4l14 8-14 8z"/>,
  clock:      <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  help:       <><circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.82 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></>,
}

function NavIcon({ name, size = 18, color = 'currentColor', sw = 1.8 }: { name: string; size?: number; color?: string; sw?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {ICON_PATHS[name]}
    </svg>
  )
}

// ── Skill Hub Header ───────────────────────────────────────────────────────────
interface SkillHubHeaderProps {
  name: string
  icon: string
  band?: number
  delta?: string
  hours?: number
  nextTest?: string
  startHref: string
}

export function SkillHubHeader({ name, icon, band, delta, hours, nextTest, startHref }: SkillHubHeaderProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <NavIcon name={icon} size={22} color="var(--accent)" />
          </div>
          <div>
            <h1 style={{ fontSize: 30, margin: 0, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)' }}>{name}</h1>
            {(hours != null || band != null) && (
              <div style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 2 }}>
                {hours != null && <span>{hours}h practiced · </span>}
                {band != null && (
                  <span>current band{' '}
                    <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{band.toFixed(1)}</span>
                    {delta && <span> ({delta})</span>}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <Link href={startHref} style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '12px 20px', borderRadius: 'var(--radius-lg)',
        fontWeight: 600, fontSize: 14,
        background: 'var(--accent)', color: 'var(--accent-fg)',
        textDecoration: 'none', transition: 'background .15s, transform .15s',
        flexShrink: 0,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-hover)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.transform = 'none' }}
      >
        <NavIcon name="play" size={14} color="var(--accent-fg)" />
        Next test
        {nextTest && <span style={{ opacity: 0.7, fontWeight: 400, fontSize: 12, marginLeft: 4 }}>· {nextTest}</span>}
      </Link>
    </div>
  )
}

// ── Subskill accuracy card ─────────────────────────────────────────────────────
interface SubskillRow { label: string; value: number }

export function SubskillCard({ title, rows }: { title: string; rows: SubskillRow[] }) {
  return (
    <div className="card" style={{ padding: 24 }}>
      <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{title}</h3>
      <div style={{ display: 'grid', gap: 14 }}>
        {rows.map((r, i) => (
          <div key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, color: 'var(--text)' }}>
              <span>{r.label}</span>
              <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{Math.round(r.value * 100)}%</span>
            </div>
            <div style={{ height: 6, background: 'var(--bg-soft)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${r.value * 100}%`,
                background: r.value < 0.55 ? 'var(--warn)' : 'var(--accent)',
                borderRadius: 999, transition: 'width .6s',
              }}/>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Test card list ─────────────────────────────────────────────────────────────
interface TestCardProps {
  test: IeltsTest
  href: string
  icon: string
  questionsLabel?: string
  timeLabel?: string
}

export function TestCard({ test, href, icon, questionsLabel = '40 questions', timeLabel }: TestCardProps) {
  return (
    <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '16px 18px', borderRadius: 12,
        background: 'var(--bg-soft)',
        border: '1px solid transparent',
        cursor: 'pointer', transition: 'transform .12s, border-color .15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(2px)'; e.currentTarget.style.borderColor = 'var(--border)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'transparent' }}
      >
        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--bg-elev)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <NavIcon name={icon} size={15} color="var(--text-2)" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {test.title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
            {(test.book_number != null || test.test_number != null) && (
              <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                {test.book_number != null ? `Book ${test.book_number}` : ''}
                {test.book_number != null && test.test_number != null ? ' · ' : ''}
                {test.test_number != null ? `Test ${test.test_number}` : ''}
              </span>
            )}
            <span style={{ fontSize: 11, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <NavIcon name="help" size={10} color="var(--text-3)" /> {questionsLabel}
            </span>
            {timeLabel && (
              <span style={{ fontSize: 11, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <NavIcon name="clock" size={10} color="var(--text-3)" /> {timeLabel}
              </span>
            )}
          </div>
        </div>
        <NavIcon name="arrowRight" size={14} color="var(--text-3)" />
      </div>
    </Link>
  )
}

// ── Loading spinner ────────────────────────────────────────────────────────────
export function HubSpinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160 }}>
      <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }}/>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
