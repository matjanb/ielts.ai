'use client'

import { useEffect, useState } from 'react'
import { getReadingTests, getSubskillAccuracy, type SubskillStat } from '@/lib/services/tests'
import { getUser } from '@/lib/services/auth'
import { SkillHubHeader, SubskillCard, TestCard, HubSpinner } from '@/components/dashboard/SkillHub'
import type { IeltsTest } from '@/lib/types/database'

export default function ReadingIndexPage() {
  const [tests, setTests] = useState<IeltsTest[]>([])
  const [subskills, setSubskills] = useState<SubskillStat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const data = await getReadingTests()
      setTests(data)
      const { user } = await getUser()
      if (user) setSubskills(await getSubskillAccuracy(user.id, 'reading'))
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
