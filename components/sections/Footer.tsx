'use client'

import Link from 'next/link'

export function Footer() {
  return (
    <footer style={{ borderTop: '1px solid var(--border)', padding: '32px' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Logo */}
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 700, letterSpacing: '-0.02em', fontSize: 15 }}>
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <path d="M4 19L10 5l3 7 2.5-4L20 19" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="20" cy="6" r="2" fill="var(--accent)"/>
          </svg>
          ielts<span style={{ color: 'var(--accent)' }}>.</span>camp
        </Link>

        <div style={{ fontSize: 13, color: 'var(--text-3)', display: 'flex', gap: 24, alignItems: 'center' }}>
          <Link href="#schools" style={{ transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}>
            For schools
          </Link>
          <Link href="/privacy" style={{ transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}>
            Privacy
          </Link>
          <Link href="/terms" style={{ transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}>
            Terms
          </Link>
          <span>© 2026</span>
        </div>
      </div>
    </footer>
  )
}
