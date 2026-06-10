'use client'

import { useEffect, useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { getListeningTests } from '@/lib/services/tests'
import { SkillHubHeader, TestCard, HubSpinner } from '@/components/dashboard/SkillHub'
import { FocusPractice } from '@/components/practice/FocusPractice'
import type { IeltsTest } from '@/lib/types/database'

export default function ListeningIndexPage() {
  const { t } = useLanguage()
  const [tests, setTests] = useState<IeltsTest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setTests(await getListeningTests())
      setLoading(false)
    }
    load()
  }, [])

  const firstTest = tests[0]
  const startHref = firstTest ? `/listening/${firstTest.id}` : '#'

  return (
    <div className="hub-page">
      <SkillHubHeader
        name={t('dashboard.listening')}
        icon="headphones"
        nextTest={firstTest?.title ?? t('listeningHub.nextFallback')}
        startHref={startHref}
      />

      {/* Weak-spot practice — front and centre, each type starts a drill on tap. */}
      <FocusPractice skill="listening" />

      {/* Full tests */}
      <div className="card hub-card" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>{t('listeningHub.library')}</h3>
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
                questionsLabel={t('hub.questions40')}
                timeLabel={`30 ${t('listening.minutes')}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
