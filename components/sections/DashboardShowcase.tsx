'use client'

import { useState } from 'react'

const TABS = [
  { id: 'overview',  label: 'Overview',  icon: 'home' },
  { id: 'listening', label: 'Listening', icon: 'headphones' },
  { id: 'reading',   label: 'Reading',   icon: 'book' },
  { id: 'writing',   label: 'Writing',   icon: 'pencil' },
  { id: 'speaking',  label: 'Speaking',  icon: 'mic' },
  { id: 'vocab',     label: 'Vocab',     icon: 'layers' },
]

const TabIcon = ({ name }: { name: string }) => {
  const paths: Record<string, React.ReactNode> = {
    home: <path d="M3 11l9-7 9 7v9a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z"/>,
    headphones: <><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1v-6h3z"/><path d="M3 19a2 2 0 0 0 2 2h1v-6H3z"/></>,
    book: <><path d="M4 4h7a3 3 0 0 1 3 3v13"/><path d="M20 4h-7a3 3 0 0 0-3 3"/><path d="M4 4v15a1 1 0 0 0 1 1h15"/></>,
    pencil: <path d="M14 4l6 6L9 21H3v-6z"/>,
    mic: <><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></>,
    layers: <><path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/><path d="M3 18l9 5 9-5"/></>,
  }
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  )
}

function PreviewOverview() {
  return (
    <div>
      <h3 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.02em' }}>
        Good morning, <span className="font-serif" style={{ color: 'var(--accent)' }}>Aiganym.</span>
      </h3>
      <p style={{ fontSize: 12, color: 'var(--text-2)', margin: '0 0 16px' }}>21 days to exam · 3 sessions today</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 10 }}>
        <div className="card" style={{ padding: 14 }}>
          <div style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.08em', marginBottom: 8 }}>TODAY'S PLAN</div>
          {[
            { c: 'var(--accent)', t: 'Listening · Section 4', time: '30m', done: true },
            { c: 'var(--warn)', t: 'Writing · Task 1 — Pie chart', time: '25m', current: true },
            { c: 'var(--info)', t: 'Vocabulary · AWL Set 12', time: '15m' },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: s.current ? 'var(--accent-soft)' : 'var(--bg-soft)', borderRadius: 6, marginBottom: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.done ? 'var(--accent)' : s.c, flexShrink: 0 }}/>
              <span style={{ flex: 1, fontSize: 11, textDecoration: s.done ? 'line-through' : 'none', color: s.done ? 'var(--text-3)' : 'var(--text)' }}>{s.t}</span>
              <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{s.time}</span>
            </div>
          ))}
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.08em' }}>PREDICTED BAND</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
            <span className="font-serif" style={{ fontSize: 44, lineHeight: 0.9, color: 'var(--accent)', fontWeight: 500 }}>7.0</span>
            <span className="chip chip-accent" style={{ fontSize: 9 }}>+0.5</span>
          </div>
          <svg viewBox="0 0 200 60" style={{ width: '100%', marginTop: 10 }}>
            <path d="M10,55 A85,85 0 0 1 190,55" stroke="var(--border)" strokeWidth="6" fill="none" strokeLinecap="round"/>
            <path d="M10,55 A85,85 0 0 1 150,15" stroke="var(--accent)" strokeWidth="6" fill="none" strokeLinecap="round"/>
          </svg>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 10 }}>
        {[['Listening', 7.0], ['Reading', 6.5], ['Writing', 6.0], ['Speaking', 6.5]].map(([n, v]) => (
          <div key={n as string} className="card" style={{ padding: 10 }}>
            <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{n}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>{(v as number).toFixed(1)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PreviewListening() {
  return (
    <div>
      <div style={{ background: '#2b2b2b', color: '#fff', padding: '7px 12px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, fontFamily: 'var(--font-mono)', marginBottom: 10 }}>
        <span style={{ background: '#ffcb05', color: '#000', padding: '1px 5px', borderRadius: 2, fontSize: 9, fontWeight: 700 }}>IELTS</span>
        ⏱ 29:42 remaining
        <span style={{ marginLeft: 'auto', fontSize: 9 }}>Section 1 of 4</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="card" style={{ padding: 12 }}>
          <div style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.08em' }}>AUDIO · LIVE</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: 13, background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 4h3v16H7zM14 4h3v16h-3z"/>
              </svg>
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1, height: 20 }}>
              {Array.from({ length: 28 }).map((_, i) => {
                const h = 4 + Math.sin(i * 0.7) * 6 + Math.cos(i * 0.3) * 4 + 8
                return <div key={i} style={{ flex: 1, height: Math.abs(h), background: i < 16 ? 'var(--accent)' : 'var(--border)', borderRadius: 1 }}/>
              })}
            </div>
            <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>1:24</span>
          </div>
          <div style={{ marginTop: 10, fontSize: 11 }}>Q3 — Postcode:
            <input defaultValue="SW1 7QQ" style={{ marginLeft: 6, border: '1px solid var(--border-strong)', borderRadius: 4, padding: '2px 6px', fontSize: 11, width: 90, background: 'var(--bg-elev)', color: 'var(--text)' }}/>
          </div>
        </div>
        <div className="card" style={{ padding: 12 }}>
          <div style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.08em', marginBottom: 8 }}>ACCURACY</div>
          {[
            { l: 'Multiple choice', v: 0.82 },
            { l: 'Form completion', v: 0.74 },
            { l: 'Map labelling', v: 0.48 },
          ].map((r, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2, fontSize: 10 }}>
                <span>{r.l}</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{Math.round(r.v * 100)}%</span>
              </div>
              <div style={{ height: 3, background: 'var(--bg-soft)', borderRadius: 999 }}>
                <div style={{ width: `${r.v * 100}%`, height: '100%', background: r.v < 0.55 ? 'var(--warn)' : 'var(--accent)', borderRadius: 999 }}/>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function PreviewReading() {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 8, background: '#f4f4f4', padding: 10, borderRadius: 10, border: '1px solid var(--border)' }}>
        <div style={{ background: '#fff', padding: 12, fontFamily: 'serif', fontSize: 11, lineHeight: 1.55, color: '#1a1a1a', borderRadius: 6 }}>
          <div style={{ fontWeight: 700, marginBottom: 6, color: '#555', fontSize: 9, letterSpacing: '0.08em' }}>READING PASSAGE 1</div>
          <h4 style={{ fontSize: 13, fontWeight: 700, textAlign: 'center', margin: '4px 0 8px' }}>The History of Glass</h4>
          <p style={{ margin: 0 }}>From our earliest origins, man has been making use of glass. <mark style={{ background: '#fff2a8', padding: '0 2px' }}>Natural glass — obsidian</mark> — formed at volcano mouths was first used as spear tips...</p>
        </div>
        <div style={{ background: '#fff', padding: 12, fontSize: 11, color: '#1a1a1a', borderRadius: 6 }}>
          <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 11 }}>Questions 1 — 4</div>
          {['Stone Age weapons used animal materials', 'Glass was discovered by accident', 'Romans popularised coloured glass'].map((q, i) => (
            <div key={i} style={{ marginBottom: 5, padding: '4px 6px', background: i === 0 ? '#fffde0' : 'transparent', borderRadius: 3, fontSize: 10 }}>
              <span style={{ display: 'inline-block', width: 16, height: 14, background: '#e9e9e9', border: '1px solid #b9b9b9', textAlign: 'center', lineHeight: '12px', fontSize: 9, fontWeight: 700, marginRight: 4 }}>{i + 1}</span>
              {q}
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 3, marginTop: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        {Array.from({ length: 13 }).map((_, i) => (
          <span key={i} style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', background: i < 4 ? 'color-mix(in srgb, var(--accent) 20%, transparent)' : i === 4 ? 'var(--warn)' : 'var(--bg-soft)', fontSize: 9, fontWeight: 600, borderRadius: 3 }}>{i + 1}</span>
        ))}
      </div>
    </div>
  )
}

function PreviewWriting() {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="card" style={{ padding: 14 }}>
          <div style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.08em', marginBottom: 6 }}>268 / 250 WORDS</div>
          <div style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.55, fontStyle: 'italic', padding: 8, background: 'var(--bg-soft)', borderRadius: 6 }}>
            "Universities have long debated whether their primary role is to impart academic knowledge or <u style={{ textDecorationStyle: 'wavy', textDecorationColor: 'var(--warn)' }}>preparing</u> students for the workforce..."
          </div>
        </div>
        <div style={{ background: '#0e1011', color: '#fff', padding: 14, borderRadius: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 9, opacity: 0.7, marginBottom: 8 }}>
            <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="#3aa278" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l1.7 4.8L18 9.5l-4.3 1.7L12 16l-1.7-4.8L6 9.5l4.3-1.7z"/>
            </svg>
            AI EXAMINER
          </div>
          <div style={{ textAlign: 'center', padding: '6px 0' }}>
            <span className="font-serif" style={{ fontSize: 34, color: '#3aa278', lineHeight: 1, fontWeight: 500 }}>6.5</span>
            <div style={{ fontSize: 9, opacity: 0.6 }}>overall band</div>
          </div>
          {[
            { k: 'Task response', v: 6.5 },
            { k: 'Coherence', v: 6.0 },
            { k: 'Lexical', v: 7.0 },
            { k: 'Grammar', v: 6.0 },
          ].map(r => (
            <div key={r.k} style={{ marginTop: 5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, marginBottom: 2 }}>
                <span style={{ opacity: 0.8 }}>{r.k}</span>
                <span style={{ fontWeight: 700, color: r.v >= 7 ? '#3aa278' : '#e4b54f' }}>{r.v.toFixed(1)}</span>
              </div>
              <div style={{ height: 2, background: '#26272a', borderRadius: 2 }}>
                <div style={{ width: `${(r.v / 9) * 100}%`, height: '100%', background: '#3aa278', borderRadius: 2 }}/>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function PreviewSpeaking() {
  return (
    <div style={{ background: '#0e1011', color: '#f5f5f3', padding: 18, borderRadius: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3aa278', boxShadow: '0 0 0 3px rgba(58,162,120,0.2)' }}/>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#3aa278' }}>LIVE · AI examiner Sarah</span>
        </div>
        <span style={{ fontSize: 10, color: '#888', fontFamily: 'var(--font-mono)' }}>04:32 · Part 1</span>
      </div>
      {[
        { who: 'Sarah', text: 'What do you like most about where you live?', side: 'left' },
        { who: 'You', text: 'I appreciate the view of the mountains from my apartment...', side: 'right' },
      ].map((m, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: m.side === 'left' ? 'flex-start' : 'flex-end', marginBottom: 8 }}>
          <div style={{ maxWidth: '78%', padding: '7px 11px', borderRadius: 10, background: m.side === 'left' ? '#16191b' : '#1a2a23', fontSize: 11, lineHeight: 1.5, border: `1px solid ${m.side === 'left' ? '#2a2c2e' : '#3aa27855'}` }}>
            {m.text}
          </div>
        </div>
      ))}
      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: 16, background: '#3aa278', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 5px rgba(58,162,120,0.15)' }}>
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/>
          </svg>
        </div>
        <div style={{ display: 'flex', gap: 2, height: 18 }}>
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} style={{ width: 2.5, background: '#3aa278', borderRadius: 2, height: `${5 + Math.abs(Math.sin(i * 0.7)) * 12}px`, opacity: 0.5 + i / 25 }}/>
          ))}
        </div>
      </div>
    </div>
  )
}

function PreviewVocab() {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10 }}>
        <div className="card" style={{ padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.08em' }}>BAND 7.5+</div>
          <h2 className="font-serif" style={{ fontSize: 36, lineHeight: 1, margin: '6px 0 4px', color: 'var(--text)', fontWeight: 500 }}>ubiquitous</h2>
          <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>/juːˈbɪkwɪtəs/</div>
          <p style={{ fontSize: 12, margin: '10px 0 4px', lineHeight: 1.5 }}>Present, appearing, or found everywhere.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, marginTop: 12 }}>
            {[
              { l: 'Again', c: 'var(--danger)' },
              { l: 'Hard', c: 'var(--warn)' },
              { l: 'Good', c: 'var(--accent)' },
              { l: 'Easy', c: 'var(--info)' },
            ].map((b, i) => (
              <div key={i} style={{ padding: '5px 4px', borderRadius: 6, background: 'var(--bg-soft)', border: '1px solid var(--border)', fontSize: 10, fontWeight: 600, color: 'var(--text-2)' }}>{b.l}</div>
            ))}
          </div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.08em', marginBottom: 8 }}>RECENTLY LEARNED</div>
          {[
            { w: 'exacerbate', pos: 'v', got: 4 },
            { w: 'discernible', pos: 'adj', got: 3 },
            { w: 'preclude', pos: 'v', got: 2 },
          ].map((v, i) => (
            <div key={i} style={{ padding: '7px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 12 }}>{v.w}</span>
                <span className="chip" style={{ fontSize: 9, fontStyle: 'italic' }}>{v.pos}</span>
              </div>
              <div style={{ display: 'flex', gap: 2, marginTop: 4 }}>
                {[1,2,3,4,5].map(n => <span key={n} style={{ flex: 1, height: 2, borderRadius: 2, background: n <= v.got ? 'var(--accent)' : 'var(--border)' }}/>)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function DashboardShowcase() {
  const [tab, setTab] = useState('overview')

  return (
    <section style={{ maxWidth: 1180, margin: '0 auto', padding: '80px 32px' }}>
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{ fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)' }}>Inside the app</div>
        <h2 style={{ fontSize: 38, letterSpacing: '-0.025em', margin: '12px 0 0', fontWeight: 700 }}>
          Built for the way you <span className="font-serif" style={{ color: 'var(--accent)' }}>actually</span> study.
        </h2>
      </div>

      {/* Pill tabs */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 24, flexWrap: 'wrap' }}>
        {TABS.map(t => {
          const active = tab === t.id
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '8px 15px', borderRadius: 999,
              background: active ? 'var(--accent)' : 'var(--bg-soft)',
              color: active ? 'var(--accent-fg)' : 'var(--text-2)',
              fontSize: 13, fontWeight: 600,
              border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
              transition: 'all 0.2s',
            }}>
              <TabIcon name={t.icon} />{t.label}
            </button>
          )
        })}
      </div>

      {/* Browser-chrome window */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', boxShadow: 'var(--shadow-lg)', maxWidth: 1080, margin: '0 auto' }}>
        {/* Chrome bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--bg-soft)', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#e8584c' }}/>
            <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#e9aa3b' }}/>
            <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#3eb650' }}/>
          </div>
          <div style={{ flex: 1, maxWidth: 360, margin: '0 auto', padding: '4px 12px', background: 'var(--bg-elev)', borderRadius: 6, fontSize: 11, color: 'var(--text-3)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
            ielts.camp/dashboard
          </div>
          <div style={{ width: 60 }}/>
        </div>

        {/* App body */}
        <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr', minHeight: 460, background: 'var(--bg)' }}>
          {/* Sidebar rail */}
          <div style={{ borderRight: '1px solid var(--border)', padding: '14px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <path d="M4 19L10 5l3 7 2.5-4L20 19" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="20" cy="6" r="2" fill="var(--accent)"/>
            </svg>
            <div style={{ width: 22, height: 1, background: 'var(--border)', margin: '6px 0' }}/>
            {TABS.map(t => {
              const active = tab === t.id
              return (
                <button key={t.id} onClick={() => setTab(t.id)} style={{
                  width: 34, height: 34, borderRadius: 7,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: active ? 'var(--accent-soft)' : 'transparent',
                  color: active ? 'var(--accent)' : 'var(--text-3)',
                  position: 'relative',
                }}>
                  <TabIcon name={t.icon} />
                  {active && <span style={{ position: 'absolute', left: -6, top: 8, bottom: 8, width: 2, background: 'var(--accent)', borderRadius: '0 2px 2px 0' }}/>}
                </button>
              )
            })}
          </div>

          {/* Content */}
          <div style={{ padding: 22 }} key={tab}>
            <div className="animate-fade-in">
              {tab === 'overview'  && <PreviewOverview />}
              {tab === 'listening' && <PreviewListening />}
              {tab === 'reading'   && <PreviewReading />}
              {tab === 'writing'   && <PreviewWriting />}
              {tab === 'speaking'  && <PreviewSpeaking />}
              {tab === 'vocab'     && <PreviewVocab />}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
