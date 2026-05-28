'use client'

const TESTIMONIALS = [
  {
    name: 'Aiganym M.',
    from: 'Almaty → Toronto',
    band: '8.5',
    quote: 'Band 8.5 in 11 weeks. The AI examiner is uncannily close to the real thing.',
  },
  {
    name: 'Rohit S.',
    from: 'Bengaluru → London',
    band: '7.5',
    quote: 'Reading went from 6.0 to 7.5. The skim/scan drills are the secret.',
  },
  {
    name: 'Madina T.',
    from: 'Tashkent → Berlin',
    band: '7.0',
    quote: 'Writing feedback is brutal but exactly what I needed.',
  },
]

const FLAGS = ['🇰🇿', '🇺🇿', '🇷🇺', '🇻🇳', '🇮🇳', '🇧🇷', '🇪🇬', '🇲🇽', '🇮🇩', '🇵🇭']

function StarIcon() {
  return (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="var(--warn)" stroke="var(--warn)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l3 6 6 1-4.5 4.5L18 21l-6-3-6 3 1.5-6.5L3 10l6-1z"/>
    </svg>
  )
}

function BandBadge({ value }: { value: string }) {
  return (
    <div style={{
      width: 44, height: 44, borderRadius: 12,
      background: 'var(--accent-soft)', color: 'var(--accent)',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: 18,
      fontFamily: 'var(--font-display)',
      fontStyle: 'italic',
      border: '1px solid var(--accent)',
      letterSpacing: '-0.02em',
    }}>
      {value}
    </div>
  )
}

export function Testimonials() {
  return (
    <section style={{ maxWidth: 1080, margin: '0 auto', padding: '80px 32px', textAlign: 'center' }}>
      <div style={{ fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
        Used by candidates in 92 countries
      </div>

      {/* Flags */}
      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center', gap: 20, fontSize: 28, opacity: 0.85, flexWrap: 'wrap' }}>
        {FLAGS.map((f, i) => <span key={i}>{f}</span>)}
      </div>

      <h2 style={{ fontSize: 36, letterSpacing: '-0.025em', margin: '56px 0 36px', fontWeight: 700 }}>
        Real <span className="font-serif" style={{ color: 'var(--accent)' }}>results</span>, real students.
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {TESTIMONIALS.map((tm, i) => (
          <div key={i} className="card" style={{ padding: 24, textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <BandBadge value={tm.band} />
              <div style={{ display: 'flex', gap: 2 }}>
                {[1,2,3,4,5].map(s => <StarIcon key={s} />)}
              </div>
            </div>
            <p style={{ fontSize: 15, lineHeight: 1.55, margin: '0 0 14px' }}>"{tm.quote}"</p>
            <div style={{ fontSize: 13 }}>
              <div style={{ fontWeight: 600 }}>{tm.name}</div>
              <div style={{ color: 'var(--text-3)' }}>{tm.from}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
