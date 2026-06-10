'use client'

import { useEffect, useState } from 'react'
import { getWritingTests } from '@/lib/services/tests'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { SkillHubHeader, TestCard, HubSpinner } from '@/components/dashboard/SkillHub'
import { WritingFocus } from '@/components/writing/WritingFocus'
import { WritingCoach } from '@/components/writing/WritingCoach'
import { WritingHistory } from '@/components/writing/WritingHistory'
import type { IeltsTest } from '@/lib/types/database'

export default function WritingIndexPage() {
  const { t } = useLanguage()
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
    <div className="hub-page">
      <SkillHubHeader
        name={t('dashboard.writing')}
        icon="pencil"
        nextTest={firstTest?.title ?? t('writingHub.nextFallback')}
        startHref={startHref}
      />

      {/* Weak spots + AI coach */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: 16, marginTop: 24 }}>
        <WritingFocus startHref={startHref} />
        <WritingCoach />
      </div>

      {/* Past essays with full breakdown */}
      <WritingHistory />

      {/* Tests */}
      <div className="card hub-card" style={{ marginTop: 16 }}>
        <div style={{ marginBottom: 18 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>{t('writingHub.listTitle')}</h3>
        </div>

        {loading ? (
          <HubSpinner />
        ) : tests.length === 0 ? (
          <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>
            {t('writingHub.empty')}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {tests.map(test => (
              <TestCard
                key={test.id}
                test={test}
                href={`/writing/${test.id}`}
                icon="pencil"
                questionsLabel={t('hub.tasks2')}
                timeLabel={`60 ${t('hub.min')}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
