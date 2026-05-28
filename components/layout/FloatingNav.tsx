'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

const NAV_ITEMS = [
  { id: 'features', label: 'Skills' },
  { id: 'how',      label: 'How it works' },
  { id: 'pricing',  label: 'Pricing' },
  { id: 'schools',  label: 'For schools' },
]

export function FloatingNav() {
  const { t } = useLanguage()
  const [visible, setVisible] = useState(false)
  const [active, setActive] = useState('features')

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      setVisible(y > 360)

      let current = 'features'
      for (const item of NAV_ITEMS) {
        const el = document.getElementById(item.id)
        if (el) {
          const rect = el.getBoundingClientRect()
          if (rect.top < window.innerHeight * 0.4) current = item.id
        }
      }
      setActive(current)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const jump = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 80
      window.scrollTo({ top, behavior: 'smooth' })
    }
  }

  return (
    <>
      {/* Top-right controls */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          backdropFilter: 'blur(20px) saturate(1.2)',
          background: 'color-mix(in srgb, var(--bg) 80%, transparent)',
          borderBottom: '1px solid color-mix(in srgb, var(--border) 60%, transparent)',
        }}
      >
        <div style={{ maxWidth: 1240, margin: '0 auto', padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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

      {/* Floating bottom pill nav */}
      <div style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: `translateX(-50%) translateY(${visible ? 0 : 30}px)`,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        zIndex: 50,
        transition: 'transform 0.35s cubic-bezier(0.2,0.7,0.2,1), opacity 0.25s ease',
      }}>
        <nav style={{
          display: 'flex', alignItems: 'center', gap: 2, padding: 6,
          background: 'color-mix(in srgb, var(--bg-elev) 85%, transparent)',
          backdropFilter: 'blur(20px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
          border: '1px solid var(--border)',
          borderRadius: 999,
          boxShadow: 'var(--shadow-lg)',
        }}>
          {NAV_ITEMS.map(item => {
            const isActive = active === item.id
            return (
              <button
                key={item.id}
                onClick={() => jump(item.id)}
                style={{
                  padding: '9px 16px', borderRadius: 999,
                  fontSize: 13.5, fontWeight: 500,
                  color: isActive ? 'var(--accent-fg)' : 'var(--text)',
                  background: isActive ? 'var(--accent)' : 'transparent',
                  transition: 'background 0.2s, color 0.2s',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.label}
              </button>
            )
          })}
        </nav>
      </div>
    </>
  )
}
