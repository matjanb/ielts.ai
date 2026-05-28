'use client'

const UNIS = [
  'Cambridge', 'Oxford', 'MIT', 'Stanford', 'ETH Zürich', 'NYU', 'UCL',
  'Imperial College', 'Toronto', 'TUM', 'Edinburgh', 'ANU', 'Melbourne',
  'Tsinghua', 'KAIST', 'EPFL',
]

export function UniversitiesMarquee() {
  const row = [...UNIS, ...UNIS]

  return (
    <section style={{
      borderTop: '1px solid var(--border)',
      borderBottom: '1px solid var(--border)',
      overflow: 'hidden',
      background: 'var(--bg)',
    }}>
      <div style={{ padding: '28px 0', position: 'relative' }}>
        <div style={{ textAlign: 'center', marginBottom: 24, padding: '0 24px' }}>
          <span style={{ fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
            Accepted at 11,000+ institutions
          </span>
        </div>

        <div style={{ display: 'flex', gap: 56, animation: 'marquee 32s linear infinite', width: 'max-content', alignItems: 'center' }}>
          {row.map((u, i) => (
            <span key={i} style={{
              fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em',
              color: 'var(--text-2)', whiteSpace: 'nowrap', opacity: 0.7,
            }}>{u}</span>
          ))}
        </div>

        {/* Fade edges */}
        <div aria-hidden style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 120, background: 'linear-gradient(to right, var(--bg), transparent)', pointerEvents: 'none' }}/>
        <div aria-hidden style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: 120, background: 'linear-gradient(to left, var(--bg), transparent)', pointerEvents: 'none' }}/>
      </div>
    </section>
  )
}
