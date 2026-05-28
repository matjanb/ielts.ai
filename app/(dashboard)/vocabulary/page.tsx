'use client'

import { useState } from 'react'

// ── Flashcard SRS session ─────────────────────────────────────────────────────
const FLASHCARDS = [
  {
    word: 'exacerbate', pos: 'v', ipa: '/ɪɡˈzæsərbeɪt/',
    def: 'To make a problem, bad situation, or negative feeling worse.',
    ex: 'Cutting public transport will only exacerbate traffic congestion.',
    syn: ['aggravate', 'worsen', 'intensify'],
    ant: ['alleviate', 'mitigate'],
    band: '7.5+',
  },
  {
    word: 'ubiquitous', pos: 'adj', ipa: '/juːˈbɪkwɪtəs/',
    def: 'Present, appearing, or found everywhere.',
    ex: 'Smartphones have become ubiquitous in modern life.',
    syn: ['omnipresent', 'pervasive', 'universal'],
    ant: ['scarce', 'rare'],
    band: '7.5+',
  },
  {
    word: 'preclude', pos: 'v', ipa: '/prɪˈkluːd/',
    def: 'To prevent from happening; make impossible.',
    ex: 'His lack of qualifications precluded him from applying.',
    syn: ['prevent', 'rule out', 'obviate'],
    ant: ['allow', 'enable'],
    band: '7.5+',
  },
]

const SRS_BUTTONS = [
  { label: 'Again', sub: '<1min', color: 'var(--danger)' },
  { label: 'Hard',  sub: '6min',  color: 'var(--warn)'   },
  { label: 'Good',  sub: '1 day', color: 'var(--accent)'  },
  { label: 'Easy',  sub: '4 days', color: 'var(--info)'  },
]

function FlashcardSession({ onClose }: { onClose: () => void }) {
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const card = FLASHCARDS[idx]

  const next = () => {
    if (idx < FLASHCARDS.length - 1) { setIdx(idx + 1); setFlipped(false) }
    else onClose()
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
        <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-2)', background: 'transparent', border: '1px solid var(--border-strong)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}>
          ✕ Exit
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{idx + 1} / {FLASHCARDS.length}</span>
          <div style={{ width: 240, height: 4, background: 'var(--bg-soft)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${((idx + 1) / FLASHCARDS.length) * 100}%`, background: 'var(--accent)', transition: 'width .3s' }}/>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <span className="chip">
            <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="var(--warn)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22c4 0 7-3 7-7 0-3-2-5-3-7-1.5 2-3 3-3 5 0-2-1-4-3-6-1 2-5 4-5 9 0 4 3 6 7 6z"/>
            </svg>
            23
          </span>
          <span className="chip">+{idx} XP</span>
        </div>
      </header>

      {/* Card area */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 560 }} key={card.word}>
          {!flipped ? (
            <div className="card" style={{ padding: 64, textAlign: 'center', minHeight: 360, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 24 }}>
                <span className="chip" style={{ fontStyle: 'italic' }}>{card.pos}</span>
                <span className="chip chip-accent">Band {card.band}</span>
              </div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 72, fontWeight: 500, margin: '0 0 8px', letterSpacing: '-0.02em', color: 'var(--text)' }}>
                {card.word}
              </h1>
              <div style={{ fontSize: 14, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 20 }}>{card.ipa}</div>
              <button onClick={() => setFlipped(true)} style={{
                padding: '12px 24px', borderRadius: 'var(--radius-lg)', fontSize: 14, fontWeight: 600,
                background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', cursor: 'pointer',
                alignSelf: 'center',
              }}>
                Show definition
              </button>
            </div>
          ) : (
            <div className="card animate-fade-in" style={{ padding: 36, minHeight: 360 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 18 }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 34, fontWeight: 500, margin: 0, color: 'var(--accent)' }}>{card.word}</h2>
                <span className="chip" style={{ fontStyle: 'italic' }}>{card.pos}</span>
                <span style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{card.ipa}</span>
              </div>
              <p style={{ fontSize: 17, lineHeight: 1.5, marginTop: 0, marginBottom: 16, fontWeight: 500, color: 'var(--text)' }}>{card.def}</p>
              <div style={{ padding: 14, background: 'var(--bg-soft)', borderRadius: 10, fontStyle: 'italic', fontSize: 14, lineHeight: 1.55, marginBottom: 20, color: 'var(--text-2)' }}>
                "{card.ex}"
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
                {[{ label: 'SYNONYMS', words: card.syn }, { label: 'ANTONYMS', words: card.ant }].map(g => (
                  <div key={g.label}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 8 }}>{g.label}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {g.words.map(w => <span key={w} className="chip" style={{ fontSize: 11 }}>{w}</span>)}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ paddingTop: 20, borderTop: '1px dashed var(--border)' }}>
                <div style={{ fontSize: 11, textAlign: 'center', color: 'var(--text-3)', marginBottom: 14 }}>HOW WELL DO YOU KNOW THIS?</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {SRS_BUTTONS.map(b => (
                    <button key={b.label} onClick={next} style={{
                      padding: '12px 8px', borderRadius: 10, textAlign: 'center',
                      background: 'var(--bg-soft)', border: '1px solid var(--border)',
                      cursor: 'pointer', transition: 'all .15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = `color-mix(in srgb, ${b.color} 12%, var(--bg-soft))`; e.currentTarget.style.borderColor = b.color }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-soft)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{b.label}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{b.sub}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Deck data ─────────────────────────────────────────────────────────────────
const DECKS = [
  { title: 'Academic Word List', desc: 'The 570 most common words in academic writing.', n: 570, learned: 312, color: 'var(--accent)' },
  { title: 'IELTS Topic — Education', desc: 'Tuned to Writing Task 2 prompts on schooling.', n: 92, learned: 41, color: 'var(--info)' },
  { title: 'Speaking · Part 3 abstract', desc: 'Less common idioms for high-band Speaking.', n: 64, learned: 18, color: 'var(--danger)' },
  { title: 'Collocations · environment', desc: 'Useful for Writing & Reading on climate topics.', n: 78, learned: 26, color: '#6b46c1' },
  { title: 'Linkers & cohesion', desc: 'Sequencing, contrasting, exemplifying — for essays.', n: 48, learned: 35, color: 'var(--warn)' },
]

const RECENTLY_LEARNED = [
  { w: 'ambivalent', pos: 'adj', def: 'Having mixed feelings or contradictory ideas', got: 3 },
  { w: 'exacerbate', pos: 'v',   def: 'To make a problem or bad situation worse', got: 4 },
  { w: 'discernible', pos: 'adj', def: 'Able to be perceived; noticeable', got: 3 },
  { w: 'ubiquitous', pos: 'adj', def: 'Present, appearing, or found everywhere', got: 5 },
  { w: 'preclude', pos: 'v',    def: 'To prevent from happening; make impossible', got: 2 },
  { w: 'salient', pos: 'adj',   def: 'Most noticeable or important', got: 3 },
  { w: 'scrutinize', pos: 'v',  def: 'To examine or inspect closely and thoroughly', got: 4 },
  { w: 'tenuous', pos: 'adj',   def: 'Very weak or slight', got: 2 },
]

// ── Main page ─────────────────────────────────────────────────────────────────
export default function VocabularyPage() {
  const [studying, setStudying] = useState(false)
  if (studying) return <FlashcardSession onClose={() => setStudying(false)} />

  return (
    <div style={{ padding: '32px 32px 80px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.025em', margin: 0, color: 'var(--text)' }}>Vocabulary</h1>
          <p style={{ color: 'var(--text-2)', fontSize: 15, margin: '6px 0 0' }}>
            412 words learned · 98 to review today · spaced repetition tuned to your weak topics
          </p>
        </div>
        <button onClick={() => setStudying(true)} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 20px', borderRadius: 'var(--radius-lg)',
          fontWeight: 600, fontSize: 14,
          background: 'var(--accent)', color: 'var(--accent-fg)',
          border: 'none', cursor: 'pointer', flexShrink: 0, transition: 'background .15s',
        }}>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2L4 14h7l-1 8 9-12h-7z"/>
          </svg>
          Start review · 98 due
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginTop: 28 }}>
        {[
          { big: '412', label: 'LEARNED', color: 'var(--accent)', sub: 'of 800 in your plan' },
          { big: '98', label: 'DUE TODAY', color: 'var(--warn)', sub: '≈ 15 min' },
          { big: '247', label: 'IN LEARNING', color: 'var(--info)', sub: '< 5 reviews each' },
          { big: '89%', label: 'RETENTION', color: 'var(--accent)', sub: 'last 30 days' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: 22 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.08em', color: 'var(--text-3)' }}>{s.label}</div>
            <div style={{ fontSize: 38, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1, marginTop: 6, color: s.color, fontVariantNumeric: 'tabular-nums' }}>{s.big}</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Deck grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginTop: 16 }}>
        {DECKS.map(d => {
          const pct = (d.learned / d.n) * 100
          return (
            <div key={d.title} className="card" style={{ padding: 22, position: 'relative', overflow: 'hidden' }}>
              <div style={{ width: 28, height: 4, background: d.color, borderRadius: 2, marginBottom: 16 }}/>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, letterSpacing: '-0.01em', color: 'var(--text)' }}>{d.title}</h3>
                <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{d.learned}/{d.n}</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '0 0 16px', lineHeight: 1.45 }}>{d.desc}</p>
              <div style={{ height: 5, background: 'var(--bg-soft)', borderRadius: 999, overflow: 'hidden', marginBottom: 12 }}>
                <div style={{ height: '100%', width: `${pct}%`, background: d.color, borderRadius: 999 }}/>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{Math.round(pct)}% complete</span>
                <button onClick={() => setStudying(true)} style={{
                  padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  background: 'var(--bg-soft)', color: 'var(--text)', border: '1px solid var(--border)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  Study
                  <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 5l7 7-7 7"/>
                  </svg>
                </button>
              </div>
            </div>
          )
        })}

        {/* Browse more */}
        <button onClick={() => {}} className="card" style={{
          padding: 22, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          textAlign: 'center', borderStyle: 'dashed', background: 'transparent', cursor: 'pointer', minHeight: 180,
        }}>
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}>
            <path d="M12 5v14M5 12h14"/>
          </svg>
          <div style={{ fontWeight: 600, color: 'var(--text-2)', marginBottom: 4 }}>+ Browse 24 more decks</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Pick by topic, level, or skill</div>
        </button>
      </div>

      {/* Recently learned */}
      <div className="card" style={{ padding: 28, marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>Recently learned</h3>
          <button style={{ fontSize: 12, color: 'var(--text-3)', background: 'transparent', border: 'none', cursor: 'pointer' }}>See all</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {RECENTLY_LEARNED.map(v => (
            <div key={v.w} style={{ padding: 14, background: 'var(--bg-soft)', borderRadius: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{v.w}</span>
                <span className="chip" style={{ fontSize: 9, fontStyle: 'italic' }}>{v.pos}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 6, lineHeight: 1.4 }}>{v.def}</div>
              <div style={{ display: 'flex', gap: 2, marginTop: 10 }}>
                {[1,2,3,4,5].map(n => (
                  <span key={n} style={{ flex: 1, height: 3, borderRadius: 2, background: n <= v.got ? 'var(--accent)' : 'var(--border)' }}/>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
