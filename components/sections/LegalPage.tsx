import Link from 'next/link'
import type { ReactNode } from 'react'

interface Section { heading: string; body: ReactNode }

export function LegalPage({ title, updated, intro, sections }: {
  title: string
  updated: string
  intro: string
  sections: Section[]
}) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        backdropFilter: 'blur(20px)',
        background: 'color-mix(in srgb, var(--bg) 80%, transparent)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ maxWidth: 820, margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 700, letterSpacing: '-0.02em', fontSize: 16, color: 'var(--text)', textDecoration: 'none' }}>
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <path d="M4 19L10 5l3 7 2.5-4L20 19" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="20" cy="6" r="2" fill="var(--accent)"/>
            </svg>
            ielts<span style={{ color: 'var(--accent)' }}>.</span>camp
          </Link>
          <Link href="/" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', textDecoration: 'none' }}>
            ← Back to home
          </Link>
        </div>
      </header>

      {/* Content */}
      <article style={{ maxWidth: 760, margin: '0 auto', padding: '56px 24px 96px' }}>
        <h1 style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 8px' }}>{title}</h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', margin: '0 0 28px' }}>
          Last updated {updated}
        </p>
        <p style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--text-2)', margin: '0 0 40px' }}>{intro}</p>

        {sections.map((s, i) => (
          <section key={i} style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.01em', margin: '0 0 12px', color: 'var(--text)' }}>
              {i + 1}. {s.heading}
            </h2>
            <div style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--text-2)' }}>{s.body}</div>
          </section>
        ))}

        <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid var(--border)', fontSize: 14, color: 'var(--text-3)' }}>
          Questions? Email{' '}
          <a href="mailto:hello@ielts.camp" style={{ color: 'var(--accent)', textDecoration: 'none' }}>hello@ielts.camp</a>.
        </div>
      </article>
    </div>
  )
}
