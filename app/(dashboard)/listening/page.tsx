'use client'

import { useEffect, useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { getListeningTests, getSubskillAccuracy, type SubskillStat } from '@/lib/services/tests'
import { getUser } from '@/lib/services/auth'
import { SkillHubHeader, SubskillCard, TestCard, HubSpinner } from '@/components/dashboard/SkillHub'
import type { IeltsTest } from '@/lib/types/database'

export default function ListeningIndexPage() {
  const { t } = useLanguage()
  const [tests, setTests] = useState<IeltsTest[]>([])
  const [subskills, setSubskills] = useState<SubskillStat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const data = await getListeningTests()
      setTests(data)
      const { user } = await getUser()
      if (user) setSubskills(await getSubskillAccuracy(user.id, 'listening'))
      setLoading(false)
    }
    load()
  }, [])

  const firstTest = tests[0]
  const startHref = firstTest ? `/listening/${firstTest.id}` : '#'

  return (
    <div style={{ padding: '32px 32px 80px' }}>
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

        {/* Subskill performance — real data from completed attempts */}
        {subskills.length > 0 ? (
          <SubskillCard
            title="Question type accuracy"
            rows={subskills.map(s => ({ label: s.label, value: s.accuracy }))}
          />
        ) : (
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Question type accuracy</h3>
            <p style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.5, margin: 0 }}>
              Complete a listening test to see your accuracy broken down by question type.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
