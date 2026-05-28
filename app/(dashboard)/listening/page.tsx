'use client'

import { useEffect, useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { getListeningTests } from '@/lib/services/tests'
import { SkillHubHeader, SubskillCard, TestCard, HubSpinner } from '@/components/dashboard/SkillHub'
import type { IeltsTest } from '@/lib/types/database'

const SUBSKILLS = [
  { label: 'Multiple choice', value: 0.82 },
  { label: 'Form / note completion', value: 0.74 },
  { label: 'Matching', value: 0.65 },
  { label: 'Plan / map / diagram', value: 0.48 },
  { label: 'Sentence completion', value: 0.78 },
]

export default function ListeningIndexPage() {
  const { t } = useLanguage()
  const [tests, setTests] = useState<IeltsTest[]>([])
  const [loading, setLoading] = useState(true)

  // Keep existing data fetching unchanged
  useEffect(() => {
    async function load() {
      const data = await getListeningTests()
      setTests(data)
      setLoading(false)
    }
    load()
  }, [])

  const firstTest = tests[0]
  const startHref = firstTest ? `/listening/${firstTest.id}` : '#'

  return (
    <div style={{ padding: '32px 32px 80px', maxWidth: 1400, margin: '0 auto' }}>
      <SkillHubHeader
        name="Listening"
        icon="headphones"
        nextTest={firstTest?.title ?? 'Section 1'}
        startHref={startHref}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginTop: 24 }}>
        {/* Practice library */}
        <div className="card" style={{ padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>Practice library</h3>
            <div style={{ display: 'flex', gap: 4 }}>
              {['All', 'Cambridge 18', 'Cambridge 19'].map(f => (
                <button key={f} style={{
                  padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  background: f === 'All' ? 'var(--bg-soft)' : 'transparent',
                  color: f === 'All' ? 'var(--text)' : 'var(--text-2)',
                  border: f === 'All' ? '1px solid var(--border)' : '1px solid transparent',
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
              {t('listening.noTests')}
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {tests.map(test => (
                <TestCard
                  key={test.id}
                  test={test}
                  href={`/listening/${test.id}`}
                  icon="headphones"
                  questionsLabel="40 questions"
                  timeLabel={`30 ${t('listening.minutes')}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Subskill performance */}
        <SubskillCard title="Subskill performance" rows={SUBSKILLS} />
      </div>
    </div>
  )
}
