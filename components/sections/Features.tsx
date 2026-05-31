'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

function MiniChatBubble() {
  const [step, setStep] = useState(0)
  const messages = [
    'Your essay scored Band 6.5.',
    "Watch articles — 3 missed 'the'.",
    'Use more conditional forms in para 2.',
  ]
  useEffect(() => {
    const id = setInterval(() => setStep(s => (s + 1) % 3), 2800)
    return () => clearInterval(id)
  }, [])
  return (
    <div style={{ width: 200, flexShrink: 0 }}>
      <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 14, padding: '11px 13px', boxShadow: 'var(--shadow)', fontSize: 12.5, lineHeight: 1.5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
          <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l1.7 4.8L18 9.5l-4.3 1.7L12 16l-1.7-4.8L6 9.5l4.3-1.7z"/>
          </svg>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-3)' }}>AI EXAMINER</span>
        </div>
        <div key={step} className="animate-fade-in">{messages[step]}</div>
        <div style={{ display: 'flex', gap: 3, marginTop: 8 }}>
          {messages.map((_, i) => (
            <span key={i} style={{ flex: 1, height: 2, background: i === step ? 'var(--accent)' : 'var(--border)', borderRadius: 1, transition: 'background 0.3s' }}/>
          ))}
        </div>
      </div>
    </div>
  )
}

function BentoCell({ span, accent, children }: { span: number; accent?: boolean; children: React.ReactNode }) {
  return (
    <div
      className="card"
      style={{
        gridColumn: `span ${span}`,
        padding: 22,
        display: 'flex',
        flexDirection: 'column',
        background: accent
          ? 'linear-gradient(140deg, var(--accent-soft), var(--bg-elev) 60%)'
          : 'var(--bg-elev)',
        transition: 'transform 0.2s',
        cursor: 'default',
      }}
      onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
      onMouseLeave={e => (e.currentTarget.style.transform = 'none')}
    >
      {children}
    </div>
  )
}

export function Features() {
  const { t } = useLanguage()

  return (
    <section id="features" style={{ maxWidth: 1080, margin: '0 auto', padding: '60px 32px' }}>
      <h2 style={{ fontSize: 38, letterSpacing: '-0.025em', margin: '0 0 40px', fontWeight: 700, textAlign: 'center' }}>
        Everything the test throws at you.{' '}
        <span className="font-serif" style={{ color: 'var(--text-2)' }}>In one place.</span>
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gridAutoRows: 'minmax(180px, auto)', gap: 12 }}>

        {/* Big AI coach — 4 cols */}
        <BentoCell span={4} accent>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, height: '100%' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3l1.7 4.8L18 9.5l-4.3 1.7L12 16l-1.7-4.8L6 9.5l4.3-1.7z"/>
                  <path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8z"/>
                </svg>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--accent)' }}>AI EXAMINER</span>
              </div>
              <h3 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 8px' }}>Live AI graders for Writing &amp; Speaking</h3>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: 'var(--text-2)', maxWidth: 380 }}>
                Band scores on all four official descriptors, with line-by-line feedback. Instantly.
              </p>
            </div>
            <MiniChatBubble />
          </div>
        </BentoCell>

        {/* Mock test — 2 cols */}
        <BentoCell span={2}>
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="6" y="4" width="12" height="17" rx="2"/><rect x="9" y="2" width="6" height="4" rx="1"/>
          </svg>
          <h3 style={{ fontSize: 17, margin: '16px 0 4px', fontWeight: 600 }}>{t('features.mockTestsTitle')}</h3>
          <p style={{ fontSize: 13, margin: 0, lineHeight: 1.5, color: 'var(--text-2)' }}>{t('features.mockTestsDesc')}</p>
          <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 32, fontWeight: 700, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>2:45</span>
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>full mock</span>
          </div>
        </BentoCell>

        {/* All four skills — 3 cols */}
        <BentoCell span={3}>
          <div style={{ display: 'flex', gap: 20, height: '100%', alignItems: 'center' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, width: 140 }}>
              {[['L', 8.0], ['R', 7.5], ['W', 7.0], ['S', 7.5]].map(([k, v]) => (
                <div key={k as string} style={{ background: 'var(--bg-soft)', borderRadius: 8, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.06em' }}>{k}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{(v as number).toFixed(1)}</span>
                </div>
              ))}
            </div>
            <div>
              <h3 style={{ fontSize: 17, margin: '0 0 4px', fontWeight: 600 }}>All four skills</h3>
              <p style={{ fontSize: 13, margin: 0, lineHeight: 1.5, color: 'var(--text-2)' }}>One platform. One plan. Tuned to your weakest.</p>
            </div>
          </div>
        </BentoCell>

        {/* Vocab — 3 cols */}
        <BentoCell span={3}>
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/><path d="M3 18l9 5 9-5"/>
          </svg>
          <h3 style={{ fontSize: 17, margin: '16px 0 4px', fontWeight: 600 }}>{t('features.recommendationsTitle')}</h3>
          <p style={{ fontSize: 13, margin: 0, lineHeight: 1.5, color: 'var(--text-2)', marginBottom: 12 }}>Spaced-repetition decks tuned to your weakest topics.</p>
          <div style={{ display: 'flex', gap: 4, marginTop: 'auto' }}>
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} style={{ flex: 1, height: 8 + (i % 4) * 4, background: i < 14 ? 'var(--accent)' : 'var(--border)', borderRadius: 2, opacity: i < 14 ? 0.4 + (i / 30) : 1 }}/>
            ))}
          </div>
          <div style={{ fontSize: 11, marginTop: 8, display: 'flex', justifyContent: 'space-between', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
            <span>412 learned</span><span>+24 today</span>
          </div>
        </BentoCell>

        {/* Streaks — 2 cols */}
        <BentoCell span={2}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="var(--warn)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22c4 0 7-3 7-7 0-3-2-5-3-7-1.5 2-3 3-3 5 0-2-1-4-3-6-1 2-5 4-5 9 0 4 3 6 7 6z"/>
            </svg>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--warn)' }}>STREAKS</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 16 }}>
            <span style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>23</span>
            <span style={{ fontSize: 13, color: 'var(--text-2)' }}>day streak</span>
          </div>
          <div style={{ display: 'flex', gap: 3, marginTop: 14 }}>
            {Array.from({ length: 14 }).map((_, i) => (
              <div key={i} style={{ flex: 1, height: 14, borderRadius: 3, background: i < 12 ? 'var(--warn)' : 'var(--border)' }}/>
            ))}
          </div>
        </BentoCell>

        {/* Exam mode — 2 cols */}
        <BentoCell span={2}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>
            </svg>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em' }}>EXAM MODE</span>
          </div>
          <h3 style={{ fontSize: 16, margin: '12px 0 4px', fontWeight: 600 }}>Pixel-perfect simulator</h3>
          <p style={{ fontSize: 12.5, margin: 0, lineHeight: 1.45, color: 'var(--text-2)' }}>The exact computer-based UI you'll see on test day.</p>
          <div style={{ marginTop: 'auto', padding: '8px 10px', background: '#000', color: '#ffcb05', borderRadius: 4, fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
            IELTS · 29:42 remaining
          </div>
        </BentoCell>

        {/* Languages — 2 cols */}
        <BentoCell span={2}>
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>
          </svg>
          <h3 style={{ fontSize: 17, margin: '16px 0 4px', fontWeight: 600 }}>Speaks your language</h3>
          <p style={{ fontSize: 13, margin: 0, lineHeight: 1.5, color: 'var(--text-2)', marginBottom: 14 }}>Instructions in 4 languages.</p>
          <div style={{ marginTop: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['EN', 'RU', 'KZ', 'UZ'].map(l => (
              <span key={l} className="chip" style={{ fontSize: 11, fontWeight: 600 }}>{l}</span>
            ))}
          </div>
        </BentoCell>

      </div>
    </section>
  )
}
