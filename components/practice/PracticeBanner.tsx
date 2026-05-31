'use client'

import Link from 'next/link'

/** CTA on the Reading/Listening hubs linking to the targeted-practice drill. */
export function PracticeBanner({ skill }: { skill: 'reading' | 'listening' }) {
  const label = skill === 'reading' ? 'Reading' : 'Listening'
  return (
    <Link href={`/${skill}/practice`} style={{ textDecoration: 'none' }}>
      <div className="card" style={{
        marginTop: 16, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 16, cursor: 'pointer', border: '1px solid var(--accent)', background: 'var(--accent-soft)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="var(--accent-fg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Targeted practice</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-2)' }}>
              Drill one {label.toLowerCase()} question type (e.g. True/False/NG) by difficulty level.
            </div>
          </div>
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>Start →</span>
      </div>
    </Link>
  )
}
