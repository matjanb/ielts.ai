'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/* ── Minimal icons / logo (kept local to this funnel page) ─────────────────── */
const ICONS: Record<string, React.ReactNode> = {
  arrowRight: <path d="M5 12h14M13 5l7 7-7 7"/>,
  check:      <path d="M5 12l5 5L20 7"/>,
  target:     <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></>,
  calendar:   <><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>,
  clock:      <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  lock:       <><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></>,
}
function Icon({ name, size = 18, stroke = 'currentColor', strokeWidth = 1.8 }: { name: string; size?: number; stroke?: string; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {ICONS[name]}
    </svg>
  )
}
function Logo() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 700, letterSpacing: '-0.02em' }}>
      <svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <path d="M4 19L10 5l3 7 2.5-4L20 19" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="20" cy="6" r="2" fill="var(--accent)"/>
      </svg>
      <span style={{ fontSize: 18 }}>ielts<span style={{ color: 'var(--accent)' }}>.</span>camp</span>
    </span>
  )
}

/* Shape persisted by the diagnostic questionnaire (localStorage). */
type Background = {
  targetBand?: number | null
  estimatedBand?: number | null
  examDate?: string | null
  dailyStudyTime?: string | null
  weakestSkills?: string[]
}

const SKILL_LABEL: Record<string, string> = {
  listening: 'Listening', reading: 'Reading', writing: 'Writing', speaking: 'Speaking',
}

type Derived = {
  current: number | null
  target: number
  gap: number | null
  weeks: number | null
  minutes: number | null
  focus: string[]
}

export default function DiagnosticResultPage() {
  const router = useRouter()
  // Diagnostic answers live in localStorage (client-only), so we read and derive
  // everything in an effect after mount; render stays pure.
  const [view, setView] = useState<Derived | null>(null)
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    let bg: Background | null = null
    try {
      const raw = localStorage.getItem('ielts-diagnostic-background')
      if (raw) bg = JSON.parse(raw) as Background
    } catch { /* ignore */ }

    if (!bg) { router.replace('/diagnostic/start'); return }

    const current = typeof bg.estimatedBand === 'number' ? bg.estimatedBand : null
    const target = typeof bg.targetBand === 'number' ? bg.targetBand : 7.0
    const gap = current != null ? Math.max(0, Math.round((target - current) * 2) / 2) : null

    let weeks: number | null = null
    if (bg.examDate) {
      const days = Math.ceil((new Date(bg.examDate).getTime() - Date.now()) / 86400000)
      weeks = days > 0 ? Math.ceil(days / 7) : null
    }
    const minutes = bg.dailyStudyTime ? parseInt(bg.dailyStudyTime, 10) : null
    const focus = (bg.weakestSkills ?? []).filter(Boolean)

    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time client init
    setView({ current, target, gap, weeks, minutes, focus })

    // CTA adapts to auth: logged-in users continue to the app, others sign up.
    createClient().auth.getUser().then(({ data: { user } }) => setLoggedIn(!!user))
  }, [router])

  if (!view) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div className="dim">Loading your results…</div>
      </div>
    )
  }

  const { current, target, gap, weeks, minutes, focus } = view

  // Lightweight 3-phase roadmap preview (client-side teaser — the real AI plan
  // is generated inside the dashboard after subscribing).
  const focusLabels = focus.map(s => SKILL_LABEL[s] ?? s)
  const phases = [
    {
      title: 'Phase 1 — Foundations',
      desc: focusLabels.length
        ? `Target your weak spots: ${focusLabels.join(' & ')}.`
        : 'Build core grammar, vocabulary and exam familiarity.',
    },
    {
      title: 'Phase 2 — Practice & mocks',
      desc: 'Timed mock tests with AI Writing & Speaking feedback to lift your band.',
    },
    {
      title: 'Phase 3 — Exam polish',
      desc: 'Strategy, weak-area drills and a final readiness check before test day.',
    },
  ]

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <header style={{ padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => router.push('/')} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Logo/>
        </button>
        <div className="dim" style={{ fontSize: 13 }}>Your placement result</div>
      </header>

      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: 640 }} className="fade-up">

          {/* Band summary */}
          <div className="dim mono" style={{ fontSize: 12, letterSpacing: '0.08em' }}>YOUR ESTIMATED BAND</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, margin: '12px 0 6px' }}>
            <span style={{ fontSize: 64, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1 }}>
              {current != null ? current.toFixed(1) : '—'}
            </span>
            <span className="muted" style={{ fontSize: 18 }}>
              → target <strong style={{ color: 'var(--text)' }}>{target.toFixed(1)}</strong>
            </span>
          </div>
          <p className="muted" style={{ fontSize: 16, margin: '0 0 28px' }}>
            {gap != null && gap > 0
              ? `You're about ${gap.toFixed(1)} band${gap === 1 ? '' : 's'} away. Here's the plan to close the gap.`
              : `You're on track for your target. Here's how to lock it in.`}
          </p>

          {/* Quick facts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 28 }}>
            <Fact icon="calendar" label="Time to exam" value={weeks != null ? `${weeks} week${weeks === 1 ? '' : 's'}` : 'Flexible'} />
            <Fact icon="clock" label="Daily study" value={minutes != null ? `${minutes} min` : 'Your pace'} />
            <Fact icon="target" label="Focus skills" value={focusLabels.length ? focusLabels.join(', ') : 'Balanced'} />
          </div>

          {/* Roadmap preview */}
          <div className="dim mono" style={{ fontSize: 12, letterSpacing: '0.08em', marginBottom: 12 }}>YOUR STUDY PLAN</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
            {phases.map((p, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, padding: '16px 18px', borderRadius: 14, border: '1px solid var(--border)', background: 'var(--bg-soft)' }}>
                <div style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 999, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>
                  {i + 1}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{p.title}</div>
                  <div className="muted" style={{ fontSize: 14 }}>{p.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA — logged-in users continue into the app, others sign up first */}
          <button
            className="btn btn-primary"
            onClick={() => router.push(loggedIn ? '/dashboard' : '/signup')}
            style={{ width: '100%', justifyContent: 'center', fontSize: 16, padding: '14px 20px' }}
          >
            {loggedIn ? 'Continue' : 'Create my free account to save this plan'}<Icon name="arrowRight" size={16}/>
          </button>
          <p className="dim" style={{ fontSize: 13, textAlign: 'center', margin: '14px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Icon name="lock" size={13}/>
            Full AI feedback, mock tests and progress tracking unlock with a subscription.
          </p>
        </div>
      </div>
    </div>
  )
}

function Fact({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ padding: '14px 16px', borderRadius: 14, border: '1px solid var(--border)', background: 'var(--bg-soft)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent)', marginBottom: 8 }}>
        <Icon name={icon} size={16}/>
        <span className="dim" style={{ fontSize: 12, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{ fontWeight: 600, fontSize: 15 }}>{value}</div>
    </div>
  )
}
