'use client'

import { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'

function HeroCardStack() {
  const [band, setBand] = useState(5.0)

  useEffect(() => {
    let v = 5.0
    const id = setInterval(() => {
      v = Math.min(7.5, v + 0.1)
      setBand(parseFloat(v.toFixed(1)))
      if (v >= 7.5) clearInterval(id)
    }, 100)
    return () => clearInterval(id)
  }, [])

  const waveHeights = [12, 16, 8, 18, 14, 10, 20, 12, 16, 8, 14, 18, 10, 16, 12, 14]

  return (
    <div style={{ position: 'relative', height: 520, fontSize: 14 }}>
      {/* Glow */}
      <div aria-hidden style={{
        position: 'absolute', inset: -40, borderRadius: '50%',
        background: 'radial-gradient(closest-side, color-mix(in srgb, var(--accent) 18%, transparent), transparent 70%)',
        filter: 'blur(20px)', zIndex: 0, pointerEvents: 'none',
      }}/>

      {/* Main band card */}
      <div className="card animate-fade-up" style={{
        position: 'absolute', top: 20, right: 0, width: 350,
        padding: 22, boxShadow: 'var(--shadow-lg)', zIndex: 3,
        animationDelay: '0.05s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="chip chip-accent" style={{ fontSize: 11 }}>
            <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l1.7 4.8L18 9.5l-4.3 1.7L12 16l-1.7-4.8L6 9.5l4.3-1.7z"/>
              <path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8z"/>
            </svg>
            Predicted band
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>14 MAY</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 16 }}>
          <span className="font-serif" style={{ fontSize: 80, lineHeight: 1, color: 'var(--accent)', fontWeight: 500 }}>
            {band.toFixed(1)}
          </span>
          <span style={{ color: 'var(--text-2)', fontSize: 13 }}>overall</span>
          <span className="chip chip-accent" style={{ marginLeft: 'auto', fontSize: 11 }}>+{(band - 5).toFixed(1)}</span>
        </div>
        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {[['L', 8.0], ['R', 7.5], ['W', 7.0], ['S', 7.5]].map(([k, v]) => (
            <div key={k as string} style={{ padding: '10px 6px', background: 'var(--bg-soft)', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.06em' }}>{k}</div>
              <div style={{ fontWeight: 700, fontSize: 17, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{(v as number).toFixed(1)}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-2)', fontSize: 12 }}>Target Band 7.5 reached</span>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12l5 5L20 7"/>
          </svg>
        </div>
      </div>

      {/* AI Speaking card */}
      <div className="card animate-fade-up" style={{
        position: 'absolute', bottom: 30, left: 0, width: 290,
        padding: 16, boxShadow: 'var(--shadow)', zIndex: 2,
        animationDelay: '0.15s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--accent)', color: 'var(--accent-fg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l1.7 4.8L18 9.5l-4.3 1.7L12 16l-1.7-4.8L6 9.5l4.3-1.7z"/>
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 12.5 }}>AI Examiner Sarah</div>
            <div style={{ fontSize: 10.5, color: 'var(--text-3)' }}>Speaking · Part 2</div>
          </div>
        </div>
        <div style={{ background: 'var(--bg-soft)', borderRadius: 10, padding: '9px 11px', fontSize: 12.5, lineHeight: 1.5 }}>
          Describe a book you read recently that influenced you...
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/>
            </svg>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 2, height: 18 }}>
            {waveHeights.map((h, i) => (
              <div key={i} style={{ width: 2.5, height: h, background: 'var(--accent)', borderRadius: 2, opacity: 0.4 + (i / 30) }}/>
            ))}
          </div>
          <span style={{ fontSize: 10.5, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>0:42</span>
        </div>
      </div>

      {/* Streak card */}
      <div className="card animate-fade-up" style={{
        position: 'absolute', top: 0, left: 24, width: 210,
        padding: 14, boxShadow: 'var(--shadow)', zIndex: 1,
        animationDelay: '0.25s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10.5, color: 'var(--text-3)', letterSpacing: '0.08em' }}>STREAK</span>
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="var(--warn)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22c4 0 7-3 7-7 0-3-2-5-3-7-1.5 2-3 3-3 5 0-2-1-4-3-6-1 2-5 4-5 9 0 4 3 6 7 6z"/>
          </svg>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 4 }}>
          <span style={{ fontSize: 30, fontWeight: 700, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>23</span>
          <span style={{ fontSize: 11.5, color: 'var(--text-2)' }}>days</span>
        </div>
        <div style={{ display: 'flex', gap: 3, marginTop: 10 }}>
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 16, borderRadius: 3,
              background: i < 12 ? 'var(--accent)' : i < 13 ? 'color-mix(in srgb, var(--accent) 40%, transparent)' : 'var(--border)',
            }}/>
          ))}
        </div>
      </div>
    </div>
  )
}

export function Hero() {
  const { t } = useLanguage()
  const ref = useRef<HTMLElement>(null)
  const [mouse, setMouse] = useState({ x: 50, y: 50 })

  const onMove = (e: React.MouseEvent) => {
    if (!ref.current) return
    const r = ref.current.getBoundingClientRect()
    setMouse({
      x: ((e.clientX - r.left) / r.width) * 100,
      y: ((e.clientY - r.top) / r.height) * 100,
    })
  }

  return (
    <section
      ref={ref}
      onMouseMove={onMove}
      id="home"
      style={{ position: 'relative', maxWidth: 1280, margin: '0 auto', padding: '72px 32px 56px', overflow: 'hidden' }}
    >
      {/* Spotlight */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(circle 380px at ${mouse.x}% ${mouse.y}%, color-mix(in srgb, var(--accent) 12%, transparent), transparent 70%)`,
        transition: 'background 0.15s',
        opacity: 0.8,
      }}/>

      <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: 60, alignItems: 'center', position: 'relative' }}>
        {/* Left: text */}
        <div className="animate-fade-up">
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '5px 12px', borderRadius: 999,
            background: 'var(--accent-soft)', color: 'var(--accent)',
            fontSize: 12, fontWeight: 600,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 0 4px color-mix(in srgb, var(--accent) 25%, transparent)' }}/>
            {t('hero.badge')}
          </div>

          <h1 style={{
            fontSize: 'clamp(42px, 5.6vw, 76px)',
            lineHeight: 1.04, letterSpacing: '-0.035em',
            margin: '22px 0 18px', fontWeight: 700,
          }}>
            {t('hero.headline')}<br/>
            <span className="font-serif" style={{ color: 'var(--accent)', fontSize: '1.05em' }}>
              {t('hero.headlineAccent')}
            </span>
          </h1>

          <p style={{ fontSize: 17, color: 'var(--text-2)', maxWidth: 500, lineHeight: 1.55, margin: 0 }}>
            {t('hero.subtitle')}
          </p>

          <div style={{ display: 'flex', gap: 10, marginTop: 30 }}>
            <Link href="/diagnostic/start" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '14px 22px', borderRadius: 'var(--radius-lg)',
              fontWeight: 600, fontSize: 15,
              background: 'var(--accent)', color: 'var(--accent-fg)',
              transition: 'background 0.15s, transform 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-hover)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.transform = 'none'; }}
            >
              {t('hero.cta')}
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 5l7 7-7 7"/>
              </svg>
            </Link>
            <button
              onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '14px 22px', borderRadius: 'var(--radius-lg)',
                fontWeight: 600, fontSize: 15,
                border: '1px solid var(--border-strong)', color: 'var(--text)',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-soft)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 4l14 8-14 8z"/>
              </svg>
              {t('hero.ctaSecondary')}
            </button>
          </div>
        </div>

        {/* Right: floating cards */}
        <HeroCardStack />
      </div>
    </section>
  )
}
