'use client'

import { useState, useRef, useEffect } from 'react'
import { useLanguage, type Language } from '@/lib/i18n/LanguageContext'

const LANGS: { code: Language; label: string; short: string }[] = [
  { code: 'en', label: 'English',  short: 'EN' },
  { code: 'ru', label: 'Русский',  short: 'RU' },
  { code: 'kz', label: 'Қазақша', short: 'KZ' },
  { code: 'uz', label: "O'zbek",  short: 'UZ' },
]

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const current = LANGS.find(l => l.code === language) ?? LANGS[0]

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 10px', borderRadius: 8,
          fontSize: 13, fontWeight: 600,
          color: 'var(--text-2)',
          border: '1px solid var(--border-strong)',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-soft)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        aria-label="Switch language"
      >
        <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>
        </svg>
        <span>{current.short}</span>
      </button>

      {open && (
        <div className="card animate-fade-in" style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, padding: 6, minWidth: 160, zIndex: 50, boxShadow: 'var(--shadow)' }}>
          {LANGS.map(lang => (
            <button
              key={lang.code}
              onClick={() => { setLanguage(lang.code); setOpen(false) }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '8px 10px', borderRadius: 8,
                fontSize: 13,
                background: lang.code === language ? 'var(--bg-soft)' : 'transparent',
                color: lang.code === language ? 'var(--accent)' : 'var(--text)',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { if (lang.code !== language) e.currentTarget.style.background = 'var(--bg-soft)' }}
              onMouseLeave={e => { if (lang.code !== language) e.currentTarget.style.background = 'transparent' }}
            >
              <span>{lang.label}</span>
              {lang.code === language && (
                <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12l5 5L20 7"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
