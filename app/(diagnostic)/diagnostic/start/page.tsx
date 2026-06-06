'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

/* ── Icons (Feather-style, matching the design) ───────────────────────────── */
type IconProps = { size?: number; stroke?: string; strokeWidth?: number }
const ICONS: Record<string, React.ReactNode> = {
  x:          <path d="M6 6l12 12M18 6L6 18"/>,
  arrowLeft:  <path d="M19 12H5M11 19l-7-7 7-7"/>,
  arrowRight: <path d="M5 12h14M13 5l7 7-7 7"/>,
  check:      <path d="M5 12l5 5L20 7"/>,
  sparkle:    <><path d="M12 3l1.7 4.8L18 9.5l-4.3 1.7L12 16l-1.7-4.8L6 9.5l4.3-1.7z"/><path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8z"/></>,
  book:       <><path d="M4 4h7a3 3 0 0 1 3 3v13"/><path d="M20 4h-7a3 3 0 0 0-3 3"/><path d="M4 4v15a1 1 0 0 0 1 1h15"/></>,
  layers:     <><path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/><path d="M3 18l9 5 9-5"/></>,
  headphones: <><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1v-6h3z"/><path d="M3 19a2 2 0 0 0 2 2h1v-6H3z"/></>,
  pencil:     <path d="M14 4l6 6L9 21H3v-6z"/>,
  mic:        <><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></>,
  globe:      <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></>,
  user:       <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
}
function Icon({ name, size = 18, stroke = 'currentColor', strokeWidth = 1.8 }: IconProps & { name: string }) {
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

/* ── Steps ────────────────────────────────────────────────────────────────── */
type Answers = Record<string, unknown>
interface Step {
  id: string
  type: 'radio' | 'bandPicker' | 'selfRate' | 'deadline' | 'multi' | 'slider'
  title: string
  sub: string
  target?: boolean
  options?: { value: string; label: string; icon?: string; desc?: string }[]
  min?: number; max?: number; step?: number; defaultValue?: number
  showIf?: (a: Answers) => boolean
}

const DIAG_STEPS: Step[] = [
  {
    id: 'previous', type: 'radio',
    title: 'Have you taken IELTS before?',
    sub: 'Just so we know your starting point.',
    options: [
      { value: 'never', label: 'Never, this is my first time', icon: 'sparkle' },
      { value: 'once', label: 'Yes, once', icon: 'book' },
      { value: 'many', label: 'Yes, multiple times', icon: 'layers' },
    ],
  },
  {
    id: 'current', type: 'bandPicker',
    title: "What's your current level?",
    sub: "Best estimate. We'll verify with a 4-minute placement test.",
    showIf: (a) => a.previous !== 'never',
  },
  {
    id: 'currentNew', type: 'selfRate',
    title: 'Roughly, how would you rate your English?',
    sub: "We'll fine-tune with the placement test.",
    options: [
      { value: 'begin', label: 'Beginner', desc: 'I can read simple texts, struggle with conversation' },
      { value: 'inter', label: 'Intermediate', desc: 'I can hold a conversation, mistakes are common' },
      { value: 'upper', label: 'Upper-intermediate', desc: 'Comfortable in most situations, vocabulary gaps' },
      { value: 'adv', label: 'Advanced', desc: 'Fluent, just need to learn the IELTS format' },
    ],
    showIf: (a) => a.previous === 'never',
  },
  {
    id: 'target', type: 'bandPicker', target: true,
    title: 'What band do you want?',
    sub: 'Most universities ask for 6.5 — 7.5. Be ambitious.',
  },
  {
    id: 'deadline', type: 'deadline',
    title: "When's your exam?",
    sub: "We'll pace your plan to land you ready, not burnt out.",
  },
  {
    id: 'weak', type: 'multi',
    title: 'Which skills feel weakest?',
    sub: "Pick up to two. We'll bias your plan there.",
    options: [
      { value: 'listen', label: 'Listening', icon: 'headphones' },
      { value: 'read', label: 'Reading', icon: 'book' },
      { value: 'write', label: 'Writing', icon: 'pencil' },
      { value: 'speak', label: 'Speaking', icon: 'mic' },
    ],
  },
  {
    id: 'goal', type: 'radio',
    title: 'Why are you taking IELTS?',
    sub: 'Lets us tailor vocabulary and writing topics.',
    options: [
      { value: 'uni', label: 'University admissions', icon: 'book' },
      { value: 'visa', label: 'Immigration / visa', icon: 'globe' },
      { value: 'work', label: 'Job requirement', icon: 'user' },
      { value: 'self', label: 'Self-improvement', icon: 'sparkle' },
    ],
  },
  {
    id: 'time', type: 'slider',
    title: 'How many minutes per day can you commit?',
    sub: "Honest answer. We'd rather give you 25 great minutes than 90 you skip.",
    min: 15, max: 120, step: 5, defaultValue: 45,
  },
]

/* Map the questionnaire answers to the shape saveDiagnosticData() expects. */
const SELF_RATE_BAND: Record<string, number> = { begin: 4.5, inter: 5.5, upper: 6.5, adv: 7.5 }
const WEAK_SKILL: Record<string, string> = { listen: 'listening', read: 'reading', write: 'writing', speak: 'speaking' }

function persist(a: Answers) {
  const weeks = typeof a.deadline === 'number' ? a.deadline : null
  const examDate = weeks && weeks < 99
    ? new Date(Date.now() + weeks * 7 * 86400000).toISOString().slice(0, 10)
    : null
  const estimatedBand = typeof a.current === 'number'
    ? a.current
    : (typeof a.currentNew === 'string' ? SELF_RATE_BAND[a.currentNew] ?? null : null)
  const background = {
    takenBefore: a.previous === undefined ? null : a.previous !== 'never',
    ieltsType: null,
    targetBand: typeof a.target === 'number' ? a.target : 7.0,
    estimatedBand,
    examDate,
    dailyStudyTime: a.time != null ? String(a.time) : null,
    weakestSkills: Array.isArray(a.weak) ? (a.weak as string[]).map(w => WEAK_SKILL[w] ?? w) : [],
    biggestStruggle: typeof a.goal === 'string' ? a.goal : null,
  }
  try { localStorage.setItem('ielts-diagnostic-background', JSON.stringify(background)) } catch { /* ignore */ }
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function DiagnosticPage() {
  const router = useRouter()
  const [diagAnswers, setDiagAnswers] = useState<Answers>({})
  const [stepIdx, setStepIdx] = useState(0)

  // Get Started always runs the diagnostic — no auto-skip for logged-in users.
  const visibleSteps = useMemo(() => DIAG_STEPS.filter(s => !s.showIf || s.showIf(diagAnswers)), [diagAnswers])
  const safeIdx = Math.min(stepIdx, visibleSteps.length - 1)
  const step = visibleSteps[safeIdx]
  const total = visibleSteps.length
  const progress = (safeIdx + 1) / total

  const answer = diagAnswers[step.id]
  const hasAnswer = answer !== undefined && answer !== null && (!Array.isArray(answer) || answer.length > 0)
  const setAnswer = (val: unknown) => setDiagAnswers({ ...diagAnswers, [step.id]: val })

  function finish() {
    persist(diagAnswers)
    // Don't save here: saveDiagnosticData clears localStorage, which the result
    // page needs to render the plan. DiagnosticSync persists it once the user
    // lands back in the app (dashboard / subscription).
    router.push('/diagnostic/result')
  }

  const next = () => { if (safeIdx < total - 1) setStepIdx(safeIdx + 1); else finish() }
  const back = () => { if (safeIdx > 0) setStepIdx(safeIdx - 1); else router.push('/') }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      {/* slim top bar */}
      <header style={{ padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => router.push('/')} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Logo/>
        </button>
        <div className="dim" style={{ fontSize: 13 }}>Let&apos;s tune your plan</div>
        <button className="btn btn-sm btn-ghost" onClick={() => router.push('/')}>Skip<Icon name="x" size={13}/></button>
      </header>

      {/* progress bar */}
      <div style={{ position: 'relative', height: 2, background: 'var(--border)' }}>
        <div style={{ position: 'absolute', inset: 0, right: 'auto', width: `${progress * 100}%`, background: 'var(--accent)', transition: 'width .4s cubic-bezier(.2,.7,.2,1)' }}/>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: 640 }} key={step.id}>
          <div className="fade-up">
            <div className="dim mono" style={{ fontSize: 12, letterSpacing: '0.08em' }}>QUESTION {String(safeIdx + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}</div>
            <h1 style={{ fontSize: 36, letterSpacing: '-0.025em', margin: '16px 0 10px', fontWeight: 700, lineHeight: 1.1 }}>{step.title}</h1>
            <p className="muted" style={{ fontSize: 16, margin: '0 0 32px' }}>{step.sub}</p>

            <StepBody step={step} value={answer} onChange={setAnswer} onAdvance={next}/>
          </div>
        </div>
      </div>

      <footer style={{ padding: '20px 32px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button className="btn btn-ghost" onClick={back}>
          <Icon name="arrowLeft" size={14}/>Back
        </button>
        <div style={{ display: 'flex', gap: 4 }}>
          {visibleSteps.map((_, i) => (
            <span key={i} style={{ width: i === safeIdx ? 18 : 6, height: 6, borderRadius: 999, background: i <= safeIdx ? 'var(--accent)' : 'var(--border)', transition: 'all .3s' }}/>
          ))}
        </div>
        <button className="btn btn-primary" onClick={next} disabled={!hasAnswer} style={{ opacity: hasAnswer ? 1 : 0.4, pointerEvents: hasAnswer ? 'auto' : 'none' }}>
          {safeIdx === total - 1 ? 'Build my plan' : 'Continue'}<Icon name="arrowRight" size={14}/>
        </button>
      </footer>
    </div>
  )
}

/* ── Step bodies ──────────────────────────────────────────────────────────── */
function StepBody({ step, value, onChange, onAdvance }: { step: Step; value: unknown; onChange: (v: unknown) => void; onAdvance: () => void }) {
  if (step.type === 'radio') {
    return (
      <div style={{ display: 'grid', gap: 10 }}>
        {step.options!.map(o => {
          const selected = value === o.value
          return (
            <button key={o.value} onClick={() => { onChange(o.value); setTimeout(onAdvance, 220) }} className="card"
              style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', width: '100%', borderColor: selected ? 'var(--accent)' : 'var(--border)', background: selected ? 'var(--accent-soft)' : 'var(--bg-elev)', transition: 'all .15s' }}>
              {o.icon && <div style={{ width: 36, height: 36, borderRadius: 10, background: selected ? 'var(--accent)' : 'var(--bg-soft)', color: selected ? 'var(--accent-fg)' : 'var(--text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={o.icon} size={16} stroke="currentColor"/></div>}
              <span style={{ fontSize: 16, fontWeight: 500, flex: 1 }}>{o.label}</span>
              {selected && <Icon name="check" size={16} stroke="var(--accent)"/>}
            </button>
          )
        })}
      </div>
    )
  }

  if (step.type === 'selfRate') {
    return (
      <div style={{ display: 'grid', gap: 10 }}>
        {step.options!.map(o => {
          const selected = value === o.value
          return (
            <button key={o.value} onClick={() => { onChange(o.value); setTimeout(onAdvance, 220) }} className="card"
              style={{ padding: '18px 20px', textAlign: 'left', width: '100%', borderColor: selected ? 'var(--accent)' : 'var(--border)', background: selected ? 'var(--accent-soft)' : 'var(--bg-elev)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{o.label}</div>
                {selected && <Icon name="check" size={16} stroke="var(--accent)"/>}
              </div>
              <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{o.desc}</div>
            </button>
          )
        })}
      </div>
    )
  }

  if (step.type === 'multi') {
    const picked = Array.isArray(value) ? (value as string[]) : []
    const toggle = (v: string) => {
      if (picked.includes(v)) onChange(picked.filter(x => x !== v))
      else if (picked.length < 2) onChange([...picked, v])
    }
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        {step.options!.map(o => {
          const selected = picked.includes(o.value)
          return (
            <button key={o.value} onClick={() => toggle(o.value)} className="card"
              style={{ padding: 20, textAlign: 'left', borderColor: selected ? 'var(--accent)' : 'var(--border)', background: selected ? 'var(--accent-soft)' : 'var(--bg-elev)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Icon name={o.icon!} size={20} stroke={selected ? 'var(--accent)' : 'var(--text-2)'}/>
                {selected && <Icon name="check" size={14} stroke="var(--accent)"/>}
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, marginTop: 14 }}>{o.label}</div>
            </button>
          )
        })}
      </div>
    )
  }

  if (step.type === 'bandPicker') {
    const bands = [4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0]
    const v = typeof value === 'number' ? value : null
    return (
      <div>
        <div style={{ textAlign: 'center', padding: '20px 0 32px' }}>
          <div style={{ fontSize: 88, lineHeight: 1, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
            {v ? v.toFixed(1) : '—'}
          </div>
          <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{step.target ? 'Target band' : 'Current band'}</div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
          {bands.map(b => (
            <button key={b} onClick={() => onChange(b)}
              style={{ width: 64, padding: '10px 0', borderRadius: 10, border: '1px solid var(--border)', background: v === b ? 'var(--accent)' : 'var(--bg-elev)', color: v === b ? 'var(--accent-fg)' : 'var(--text)', fontWeight: 600, fontSize: 15, fontVariantNumeric: 'tabular-nums', transition: 'all .1s' }}>
              {b.toFixed(1)}
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (step.type === 'deadline') {
    const weeks = [
      { v: 4, label: 'Under 1 month', desc: 'Intensive sprint' },
      { v: 8, label: '1 — 2 months', desc: 'Focused track' },
      { v: 12, label: '2 — 3 months', desc: 'Recommended' },
      { v: 24, label: '3 — 6 months', desc: 'Steady build' },
      { v: 99, label: 'Not scheduled yet', desc: 'Flexible plan' },
    ]
    return (
      <div style={{ display: 'grid', gap: 10 }}>
        {weeks.map(w => {
          const selected = value === w.v
          return (
            <button key={w.v} onClick={() => { onChange(w.v); setTimeout(onAdvance, 220) }} className="card"
              style={{ padding: '16px 20px', textAlign: 'left', width: '100%', borderColor: selected ? 'var(--accent)' : 'var(--border)', background: selected ? 'var(--accent-soft)' : 'var(--bg-elev)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{w.label}</div>
                <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{w.desc}</div>
              </div>
              <div className="num dim mono" style={{ fontSize: 13 }}>{w.v < 99 ? `${w.v}w` : '∞'}</div>
            </button>
          )
        })}
      </div>
    )
  }

  if (step.type === 'slider') {
    const v = typeof value === 'number' ? value : step.defaultValue!
    const pct = (v - step.min!) / (step.max! - step.min!) * 100
    return (
      <div>
        <div style={{ textAlign: 'center', padding: '20px 0 24px' }}>
          <span className="num" style={{ fontSize: 96, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.04em' }}>{v}</span>
          <span className="muted" style={{ fontSize: 18, marginLeft: 8 }}>min / day</span>
        </div>
        <input type="range" min={step.min} max={step.max} step={step.step} value={v}
          onChange={e => onChange(parseInt(e.target.value, 10))}
          style={{ width: '100%', height: 6, appearance: 'none', WebkitAppearance: 'none', background: `linear-gradient(to right, var(--accent) 0 ${pct}%, var(--border) ${pct}% 100%)`, borderRadius: 999, outline: 'none', cursor: 'pointer' }}/>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }} className="dim mono">
          <span>{step.min} min</span>
          <span>{step.max} min</span>
        </div>
        <div className="card" style={{ marginTop: 28, padding: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
          <Icon name="sparkle" size={18} stroke="var(--accent)"/>
          <div style={{ fontSize: 13 }}>
            <span style={{ fontWeight: 600 }}>{v} min × 6 days/week = {Math.round(v * 6 * 12 / 60)} hours over 12 weeks.</span>
            <span className="muted"> Median student at this pace gains +1.5 band.</span>
          </div>
        </div>
      </div>
    )
  }

  return null
}
