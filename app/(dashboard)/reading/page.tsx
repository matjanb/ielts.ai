'use client'

import { useEffect, useState, useMemo } from 'react'
import { getReadingTests, getSubskillAccuracy, type SubskillStat } from '@/lib/services/tests'
import { getUser } from '@/lib/services/auth'
import { SkillHubHeader, SubskillCard, TestCard, HubSpinner } from '@/components/dashboard/SkillHub'
import { PracticeBanner } from '@/components/practice/PracticeBanner'
import type { IeltsTest } from '@/lib/types/database'

export default function ReadingIndexPage() {
  const [tests, setTests] = useState<IeltsTest[]>([])
  const [subskills, setSubskills] = useState<SubskillStat[]>([])
  const [loading, setLoading] = useState(true)
  const [activeBook, setActiveBook] = useState<number | null>(null)

  useEffect(() => {
    async function load() {
      const data = await getReadingTests()
      setTests(data)
      if (data.length > 0 && data[0].book_number != null) setActiveBook(data[0].book_number)
      const { user } = await getUser()
      if (user) setSubskills(await getSubskillAccuracy(user.id, 'reading'))
      setLoading(false)
    }
    load()
  }, [])

  // Unique book numbers in the order they first appear
  const books = useMemo(() => {
    const seen = new Set<number>()
    const out: number[] = []
    for (const t of tests) {
      if (t.book_number != null && !seen.has(t.book_number)) {
        seen.add(t.book_number)
        out.push(t.book_number)
      }
    }
    return out.sort((a, b) => b - a) // newest book first
  }, [tests])

  const visibleTests = useMemo(
    () => activeBook != null ? tests.filter(t => t.book_number === activeBook) : tests,
    [tests, activeBook],
  )

  const firstTest = tests[0]
  const startHref = firstTest ? `/reading/${firstTest.id}` : '#'

  return (
    <div style={{ padding: '32px 32px 80px' }}>
      <SkillHubHeader
        name="Reading"
        icon="book"
        nextTest={firstTest?.title ?? 'Passage 1 · TFNG drill'}
        startHref={startHref}
      />

      <PracticeBanner skill="reading" />

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginTop: 24 }}>
        {/* Passage library */}
        <div className="card" style={{ padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>Reading passages</h3>
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
              No reading tests available yet.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {visibleTests.map((test) => (
                <TestCard
                  key={test.id}
                  test={test}
                  href={`/reading/${test.id}`}
                  icon="book"
                  questionsLabel="40 questions"
                  timeLabel="60 min"
                />
              ))}
            </div>
          )}
        </div>

        {/* Question type accuracy — real data from completed attempts */}
        {subskills.length > 0 ? (
          <SubskillCard
            title="Question type accuracy"
            rows={subskills.map(s => ({ label: s.label, value: s.accuracy }))}
          />
        ) : (
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Question type accuracy</h3>
            <p style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.5, margin: 0 }}>
              Complete a reading test to see your accuracy broken down by question type (True/False/NG, matching, etc.).
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
