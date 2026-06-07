'use client'

import { useEffect, useState } from 'react'
import { getReadingTests } from '@/lib/services/tests'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { SkillHubHeader, TestCard, HubSpinner } from '@/components/dashboard/SkillHub'
import { FocusPractice } from '@/components/practice/FocusPractice'
import type { IeltsTest } from '@/lib/types/database'

export default function ReadingIndexPage() {
  const { t } = useLanguage()
  const [tests, setTests] = useState<IeltsTest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setTests(await getReadingTests())
      setLoading(false)
    }
    load()
  }, [])

  const firstTest = tests[0]
  const startHref = firstTest ? `/reading/${firstTest.id}` : '#'

  return (
    <div style={{ padding: '32px 32px 80px' }}>
      <SkillHubHeader
        name={t('dashboard.reading')}
        icon="book"
        nextTest={firstTest?.title ?? t('readingHub.nextFallback')}
        startHref={startHref}
      />

      {/* Weak-spot practice — front and centre, each type starts a drill on tap. */}
      <FocusPractice skill="reading" />

      {/* Full tests */}
      <div className="card" style={{ padding: 28, marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>{t('readingHub.passages')}</h3>
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
            {t('readingHub.empty')}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {tests.map(test => (
              <TestCard
                key={test.id}
                test={test}
                href={`/reading/${test.id}`}
                icon="book"
                questionsLabel={t('hub.questions40')}
                timeLabel={`60 ${t('hub.min')}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
