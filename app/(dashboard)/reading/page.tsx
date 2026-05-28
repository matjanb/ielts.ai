'use client'

import { useEffect, useState } from 'react'
import { getReadingTests } from '@/lib/services/tests'
import { SkillHubHeader, SubskillCard, TestCard, HubSpinner } from '@/components/dashboard/SkillHub'
import type { IeltsTest } from '@/lib/types/database'

const SUBSKILLS = [
  { label: 'True / False / Not Given', value: 0.52 },
  { label: 'Matching headings', value: 0.61 },
  { label: 'Multiple choice', value: 0.84 },
  { label: 'Sentence completion', value: 0.78 },
  { label: 'Matching info to paragraphs', value: 0.58 },
]

export default function ReadingIndexPage() {
  const [tests, setTests] = useState<IeltsTest[]>([])
  const [loading, setLoading] = useState(true)

  // Keep existing data fetching unchanged
  useEffect(() => {
    async function load() {
      const data = await getReadingTests()
      setTests(data)
      setLoading(false)
    }
    load()
  }, [])

  const firstTest = tests[0]
  const startHref = firstTest ? `/reading/${firstTest.id}` : '#'

  return (
    <div style={{ padding: '32px 32px 80px', maxWidth: 1400, margin: '0 auto' }}>
      <SkillHubHeader
        name="Reading"
        icon="book"
        nextTest={firstTest?.title ?? 'Passage 1 · TFNG drill'}
        startHref={startHref}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginTop: 24 }}>
        {/* Passage library */}
        <div className="card" style={{ padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>Reading passages</h3>
            <div style={{ display: 'flex', gap: 4 }}>
              {['Academic', 'General'].map(f => (
                <button key={f} style={{
                  padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  background: f === 'Academic' ? 'var(--bg-soft)' : 'transparent',
                  color: f === 'Academic' ? 'var(--text)' : 'var(--text-2)',
                  border: f === 'Academic' ? '1px solid var(--border)' : '1px solid transparent',
                  cursor: 'pointer',
                }}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <HubSpinner />
          ) : tests.length === 0 ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>
              No reading tests available yet.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {tests.map(test => (
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

        {/* Question type accuracy */}
        <SubskillCard title="Question type accuracy" rows={SUBSKILLS} />
      </div>
    </div>
  )
}
