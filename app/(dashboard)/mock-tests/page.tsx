'use client'

import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { SAMPLE_TEST_META } from '@/lib/data/sampleTest'

// Keep existing test data unchanged
const TESTS = [
  { ...SAMPLE_TEST_META, id: 'sample-test-1', free: true },
  { ...SAMPLE_TEST_META, id: 'sample-test-2', title: 'IELTS Academic Practice Test 2', free: false },
  { ...SAMPLE_TEST_META, id: 'sample-test-3', title: 'IELTS Academic Practice Test 3', free: false },
  { ...SAMPLE_TEST_META, id: 'sample-test-4', title: 'IELTS General Training Test 1', test_type: 'general' as const, free: false },
]

const PREVIOUS_MOCKS = [
  { date: 'May 17', id: 'Mock #03', overall: 7.0, l: 7.5, r: 6.5, w: 6.5, s: 7.0 },
  { date: 'May 03', id: 'Mock #02', overall: 6.5, l: 7.0, r: 6.0, w: 6.0, s: 6.5 },
  { date: 'Apr 19', id: 'Mock #01', overall: 6.0, l: 6.5, r: 5.5, w: 6.0, s: 6.0 },
]

function BandPill({ v }: { v: number }) {
  return (
    <div style={{ padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700, background: 'var(--bg-soft)', textAlign: 'center', letterSpacing: '-0.01em', color: 'var(--text)', fontVariantNumeric: 'tabular-nums', minWidth: 36 }}>
      {v.toFixed(1)}
    </div>
  )
}

function LockIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>
    </svg>
  )
}

export default function MockTestsPage() {
  const { t } = useLanguage()

  return (
    <div style={{ padding: '32px 32px 80px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Hub header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8 }}>Full IELTS Academic mock</div>
          <h1 style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.025em', margin: '0 0 6px', color: 'var(--text)' }}>
            2 hours 45 minutes.{' '}
            <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--accent)' }}>The real thing.</span>
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text-2)', margin: 0, maxWidth: 600 }}>
            Listening (30m), Reading (60m), Writing (60m), Speaking (14m) — same interface, timing and layout as the official computer-based test.
          </p>
        </div>
        <Link href={`/mock-tests/${TESTS[0].id}`} style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '12px 20px', borderRadius: 'var(--radius-lg)',
          fontWeight: 600, fontSize: 14,
          background: 'var(--accent)', color: 'var(--accent-fg)',
          textDecoration: 'none', flexShrink: 0, transition: 'background .15s',
        }}>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 4l14 8-14 8z"/>
          </svg>
          Start mock
        </Link>
      </div>

      {/* Section time overview */}
      <div className="card" style={{ marginTop: 28, padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {[
            { name: 'Listening', time: '30 min', q: 40, icon: 'headphones' },
            { name: 'Reading', time: '60 min', q: 40, icon: 'book' },
            { name: 'Writing', time: '60 min', q: 2, icon: 'pencil' },
            { name: 'Speaking', time: '14 min', q: 3, icon: 'mic' },
          ].map((s, i) => (
            <div key={s.name} style={{ padding: 24, borderRight: i < 3 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-2)', marginBottom: 12 }}>{s.name.toUpperCase()}</div>
              <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', color: 'var(--text)' }}>{s.time}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{s.q} {s.q === 2 ? 'tasks' : 'questions'}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginTop: 16 }}>
        {/* Test list */}
        <div className="card" style={{ padding: 28 }}>
          <h3 style={{ margin: '0 0 18px', fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>Available tests</h3>
          <div style={{ display: 'grid', gap: 10 }}>
            {TESTS.map((test, i) => (
              <div key={test.id} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '16px 18px', borderRadius: 12,
                background: test.free ? 'var(--bg-soft)' : 'var(--bg)',
                border: `1px solid ${test.free ? 'var(--border)' : 'var(--border)'}`,
                opacity: test.free ? 1 : 0.65,
              }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: test.free ? 'var(--accent-soft)' : 'var(--bg-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {test.free ? (
                    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="6" y="4" width="12" height="17" rx="2"/><rect x="9" y="2" width="6" height="4" rx="1"/>
                    </svg>
                  ) : (
                    <LockIcon />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{test.title}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: test.free ? 'var(--accent-soft)' : 'var(--bg-soft)', color: test.free ? 'var(--accent)' : 'var(--text-3)' }}>
                      {test.free ? 'Free' : 'Pro'}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
                    {test.time_limit_minutes} min · {test.sections.join(', ')} · {test.test_type}
                  </div>
                </div>
                {test.free ? (
                  <Link href={`/mock-tests/${test.id}`} style={{
                    padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                    background: 'var(--accent)', color: 'var(--accent-fg)', textDecoration: 'none',
                  }}>
                    {t('mockTest.startTest')}
                  </Link>
                ) : (
                  <Link href="/subscription" style={{
                    padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                    border: '1px solid var(--border-strong)', color: 'var(--text-2)', textDecoration: 'none',
                  }}>
                    Upgrade
                  </Link>
                )}
              </div>
            ))}
          </div>

          {/* Previous mocks */}
          <div style={{ marginTop: 28, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>Previous mocks</h3>
            <div style={{ display: 'grid', gap: 4 }}>
              {PREVIOUS_MOCKS.map((m, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', width: 56 }}>{m.date}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', flex: 1 }}>{m.id}</div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[m.l, m.r, m.w, m.s].map((v, j) => <BandPill key={j} v={v} />)}
                  </div>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 16, fontWeight: 700 }}>
                    {m.overall.toFixed(1)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Readiness card */}
        <div className="card" style={{ padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="var(--warn)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l1.7 4.8L18 9.5l-4.3 1.7L12 16l-1.7-4.8L6 9.5l4.3-1.7z"/>
            </svg>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--warn)' }}>EXAM-DAY READINESS</span>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 60, lineHeight: 0.9, color: 'var(--accent)', fontWeight: 500 }}>78%</div>
          <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 8 }}>
            Based on last 3 mocks · target 90%+ before exam day
          </div>
          <div style={{ marginTop: 18, height: 8, borderRadius: 999, background: 'var(--bg-soft)', overflow: 'hidden' }}>
            <div style={{ width: '78%', height: '100%', background: 'linear-gradient(90deg, var(--accent), var(--warn))' }}/>
          </div>

          <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px dashed var(--border)' }}>
            <div style={{ fontSize: 11, letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 12 }}>WHAT TO IMPROVE</div>
            {[
              { icon: 'pencil', text: 'Writing Task 2 — Grammatical range' },
              { icon: 'mic', text: 'Speaking — Less common vocabulary in Part 3' },
              { icon: 'book', text: 'Reading — True/False/Not Given drill' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, fontSize: 13, color: 'var(--text)' }}>
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="var(--warn)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  {item.icon === 'pencil' && <path d="M14 4l6 6L9 21H3v-6z"/>}
                  {item.icon === 'mic' && <><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></>}
                  {item.icon === 'book' && <><path d="M4 4h7a3 3 0 0 1 3 3v13"/><path d="M20 4h-7a3 3 0 0 0-3 3"/><path d="M4 4v15a1 1 0 0 0 1 1h15"/></>}
                </svg>
                {item.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
