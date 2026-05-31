'use client'

import { useEffect, useState, useMemo } from 'react'
import { getWritingTests } from '@/lib/services/tests'
import { SkillHubHeader, TestCard, HubSpinner } from '@/components/dashboard/SkillHub'
import type { IeltsTest } from '@/lib/types/database'

export default function WritingIndexPage() {
  const [tests, setTests] = useState<IeltsTest[]>([])
  const [loading, setLoading] = useState(true)
  const [activeBook, setActiveBook] = useState<number | null>(null)

  useEffect(() => {
    getWritingTests()
      .then(data => {
        setTests(data)
        if (data.length > 0 && data[0].book_number != null) setActiveBook(data[0].book_number)
      })
      .catch(() => setTests([]))
      .finally(() => setLoading(false))
  }, [])

  const books = useMemo(() => {
    const seen = new Set<number>()
    const out: number[] = []
    for (const t of tests) {
      if (t.book_number != null && !seen.has(t.book_number)) {
        seen.add(t.book_number)
        out.push(t.book_number)
      }
    }
    return out.sort((a, b) => b - a)
  }, [tests])

  const visibleTests = useMemo(
    () => activeBook != null ? tests.filter(t => t.book_number === activeBook) : tests,
    [tests, activeBook],
  )

  const firstTest = tests[0]
  const startHref = firstTest ? `/writing/${firstTest.id}` : '#'

  return (
    <div style={{ padding: '32px 32px 80px' }}>
      <SkillHubHeader
        name="Writing"
        icon="pencil"
        nextTest={firstTest?.title ?? 'Writing Test 1'}
        startHref={startHref}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginTop: 24 }}>
        {/* Test library */}
        <div className="card" style={{ padding: 28 }}>
          <div style={{ marginBottom: 18 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>Writing tests</h3>
          </div>

          {/* Book tabs */}
          {!loading && books.length > 1 && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
              {books.map(b => (
                <button key={b} onClick={() => setActiveBook(b)} style={{
                  padding: '5px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  background: activeBook === b ? 'var(--accent)' : 'var(--bg-soft)',
                  color: activeBook === b ? 'var(--accent-fg)' : 'var(--text-2)',
                  border: `1px solid ${activeBook === b ? 'var(--accent)' : 'var(--border)'}`,
                  cursor: 'pointer', transition: 'background .15s, color .15s',
                }}>
                  IELTS {b}
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <HubSpinner />
          ) : visibleTests.length === 0 ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>
              No writing tests available yet.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {visibleTests.map(test => (
                <TestCard
                  key={test.id}
                  test={test}
                  href={`/writing/${test.id}`}
                  icon="pencil"
                  questionsLabel="2 tasks"
                  timeLabel="60 min"
                />
              ))}
            </div>
          )}
        </div>

        {/* Info card */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>About Writing</h3>
          <div style={{ display: 'grid', gap: 12 }}>
            {[
              { label: 'Task 1', desc: '150 words minimum · 20 minutes · Describe a chart, map, or process' },
              { label: 'Task 2', desc: '250 words minimum · 40 minutes · Essay: opinion, discussion, or problem-solution' },
            ].map(item => (
              <div key={item.label} style={{ padding: 14, background: 'var(--bg-soft)', borderRadius: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>{item.desc}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, padding: 14, background: 'color-mix(in srgb, var(--warn) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--warn) 25%, transparent)', borderRadius: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--warn)', marginBottom: 4 }}>AI GRADING</div>
            <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5, margin: 0 }}>
              Submit your essay for instant AI feedback on band score, task achievement, coherence, lexical resource and grammar.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
