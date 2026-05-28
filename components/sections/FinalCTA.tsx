'use client'

import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'

export function FinalCTA() {
  const { t } = useLanguage()

  return (
    <section id="pricing" style={{ padding: '80px 32px' }}>
      <div style={{
        maxWidth: 880, margin: '0 auto', padding: '60px 48px',
        background: 'var(--accent)', color: 'var(--accent-fg)',
        borderRadius: 24, textAlign: 'center',
      }}>
        <h2 style={{ fontSize: 40, letterSpacing: '-0.03em', margin: 0, fontWeight: 700, lineHeight: 1.05 }}>
          Ready when you are.
        </h2>
        <p style={{ fontSize: 16, opacity: 0.85, margin: '12px 0 28px' }}>
          Free diagnostic. No card required.
        </p>
        <Link href="/diagnostic/start" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '14px 24px', borderRadius: 'var(--radius-lg)',
          fontWeight: 600, fontSize: 15,
          background: 'white', color: 'var(--accent)',
          transition: 'opacity 0.15s, transform 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.opacity = '0.92'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'none'; }}
        >
          {t('hero.cta')}
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 5l7 7-7 7"/>
          </svg>
        </Link>
      </div>
    </section>
  )
}
