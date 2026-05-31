'use client'

import { useEffect, useState } from 'react'
import { getWritingTests } from '@/lib/services/tests'
import { SkillHubHeader, TestCard, HubSpinner } from '@/components/dashboard/SkillHub'
import type { IeltsTest } from '@/lib/types/database'

export default function WritingIndexPage() {
  const [tests, setTests] = useState<IeltsTest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getWritingTests()
      .then(setTests)
      .catch(() => setTests([]))
      .finally(() => setLoading(false))
  }, [])

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
        <div className="card" style={{ padding: 28 }}>
          <div style={{ marginBottom: 18 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>Writing tests</h3>
          </div>

          {loading ? (
            <HubSpinner />
          ) : tests.length === 0 ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>
              No writing tests available yet.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {tests.map(test => (
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

        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>About Writing</h3>
          <div style={{ display: 'grid', gap: 12 }}>
            {[
              { label: 'Task 1', desc: '150 words · 20 min · Describe a chart, map or process' },
              { label: 'Task 2', desc: '250 words · 40 min · Opinion, discussion or problem-solution essay' },
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
