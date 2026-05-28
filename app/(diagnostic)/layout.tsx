import Link from 'next/link'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { LanguageProvider } from '@/lib/i18n/LanguageContext'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import type { ReactNode } from 'react'

export default function DiagnosticLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
          {/* Top bar */}
          <header style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 32px', borderBottom: '1px solid var(--border)',
          }}>
            <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 700, letterSpacing: '-0.02em', fontSize: 15, color: 'var(--text)', textDecoration: 'none' }}>
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <path d="M4 19L10 5l3 7 2.5-4L20 19" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="20" cy="6" r="2" fill="var(--accent)"/>
              </svg>
              ielts<span style={{ color: 'var(--accent)' }}>.</span>camp
            </Link>
            <ThemeToggle />
          </header>

          {/* Content */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {children}
          </div>
        </div>
      </LanguageProvider>
    </ThemeProvider>
  )
}
