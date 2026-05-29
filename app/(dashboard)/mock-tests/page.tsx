'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { SAMPLE_TEST_META } from '@/lib/data/sampleTest'
import { getDashboardData } from '@/lib/services/progress'
import { getUser } from '@/lib/services/auth'

// Keep existing test data unchanged
const TESTS = [
  { ...SAMPLE_TEST_META, id: 'sample-test-1', free: true },
  { ...SAMPLE_TEST_META, id: 'sample-test-2', title: 'IELTS Academic Practice Test 2', free: false },
  { ...SAMPLE_TEST_META, id: 'sample-test-3', title: 'IELTS Academic Practice Test 3', free: false },
  { ...SAMPLE_TEST_META, id: 'sample-test-4', title: 'IELTS General Training Test 1', test_type: 'general' as const, free: false },
]

const SKILL_LABELS: Record<string, string> = {
  listening: 'Listening', reading: 'Reading', writing: 'Writing', speaking: 'Speaking',
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
  const [previousMocks, setPreviousMocks] = useState<Array<{ date: string; band: number }>>([])
  const [readiness, setReadiness] = useState<number | null>(null)
  const [weakSkills, setWeakSkills] = useState<Array<{ skill: string; band: number }>>([])

  useEffect(() => {
    async function load() {
      const { user } = await getUser()
      if (!user) return
      const d = await getDashboardData(user.id)

      // Previous mocks — real completed attempts with a band score
      const mocks = (d.attempts ?? [])
        .filter((a: any) => a.band_score != null && a.completed_at)
        .slice(0, 5)
        .map((a: any) => ({
          date: new Date(a.completed_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          band: a.band_score as number,
        }))
      setPreviousMocks(mocks)

      // Latest band per skill (bandHistory is recorded_at DESC)
      const latest: Record<string, number> = {}
      for (const row of (d.bandHistory ?? [])) {
        if (latest[row.skill] == null && row.skill !== 'overall') latest[row.skill] = row.score
      }
      const skillEntries = Object.entries(latest)
      if (skillEntries.length > 0) {
        const avg = skillEntries.reduce((s, [, v]) => s + v, 0) / skillEntries.length
        const target = d.profile?.target_band_score ?? 7.5
        setReadiness(Math.min(100, Math.round((avg / target) * 100)))
        setWeakSkills(
          skillEntries
            .map(([skill, band]) => ({ skill, band }))
            .sort((a, b) => a.band - b.band)
            .slice(0, 3)
        )
      }
    }
    load()
  }, [])

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

          {/* Previous mocks — real completed attempts */}
          <div style={{ marginTop: 28, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>Previous attempts</h3>
            {previousMocks.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.5, margin: 0 }}>
                No completed tests yet. Finish a test to track your band history here.
              </p>
            ) : (
              <div style={{ display: 'grid', gap: 4 }}>
                {previousMocks.map((m, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', width: 56 }}>{m.date}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', flex: 1 }}>Test attempt</div>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 16, fontWeight: 700 }}>
                      {m.band.toFixed(1)}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
          <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 60, lineHeight: 0.9, color: 'var(--accent)', fontWeight: 500 }}>
            {readiness != null ? `${readiness}%` : '—'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 8 }}>
            {readiness != null
              ? 'Latest band average vs your target band'
              : 'Complete a test to estimate exam readiness'}
          </div>
          <div style={{ marginTop: 18, height: 8, borderRadius: 999, background: 'var(--bg-soft)', overflow: 'hidden' }}>
            <div style={{ width: `${readiness ?? 0}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent), var(--warn))', transition: 'width .6s' }}/>
          </div>

          {weakSkills.length > 0 && (
            <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px dashed var(--border)' }}>
              <div style={{ fontSize: 11, letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 12 }}>WEAKEST SKILLS</div>
              {weakSkills.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10, fontSize: 13, color: 'var(--text)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="var(--warn)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      {s.skill === 'writing' && <path d="M14 4l6 6L9 21H3v-6z"/>}
                      {s.skill === 'speaking' && <><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></>}
                      {s.skill === 'reading' && <><path d="M4 4h7a3 3 0 0 1 3 3v13"/><path d="M20 4h-7a3 3 0 0 0-3 3"/><path d="M4 4v15a1 1 0 0 0 1 1h15"/></>}
                      {s.skill === 'listening' && <><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1v-6h3z"/><path d="M3 19a2 2 0 0 0 2 2h1v-6H3z"/></>}
                    </svg>
                    {SKILL_LABELS[s.skill] ?? s.skill}
                  </div>
                  <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--text-2)' }}>{s.band.toFixed(1)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
