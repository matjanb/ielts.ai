'use client'

import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

export function FloatingNav() {
  const { t } = useLanguage()

  return (
    <header
      style={{
        background: 'var(--bg)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div className="section-pad" style={{ maxWidth: 1240, margin: '0 auto', padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        {/* Logo */}
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 700, letterSpacing: '-0.02em', fontSize: 16 }}>
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            <path d="M4 19L10 5l3 7 2.5-4L20 19" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="20" cy="6" r="2" fill="var(--accent)"/>
          </svg>
          ielts<span style={{ color: 'var(--accent)' }}>.</span>camp
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ThemeToggle />
          <LanguageSwitcher />
          <Link href="/login" style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '7px 14px', borderRadius: 'var(--radius)',
            fontSize: 13, fontWeight: 600,
            border: '1px solid var(--border-strong)',
            color: 'var(--text)',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-soft)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            {t('nav.login')}
          </Link>
          <Link href="/diagnostic/start" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 'var(--radius)',
            fontSize: 13, fontWeight: 600,
            background: 'var(--accent)', color: 'var(--accent-fg)',
            transition: 'background 0.15s, transform 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-hover)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.transform = 'none'; }}
          >
            {t('nav.getStarted')}
          </Link>
        </div>
      </div>
    </header>
  )
}
