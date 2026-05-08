'use client'

import Link from 'next/link'
import { FileText, Clock, ChevronRight, Lock } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { SAMPLE_TEST_META } from '@/lib/data/sampleTest'

const TESTS = [
  { ...SAMPLE_TEST_META, id: 'sample-test-1', free: true },
  { ...SAMPLE_TEST_META, id: 'sample-test-2', title: 'IELTS Academic Practice Test 2', free: false },
  { ...SAMPLE_TEST_META, id: 'sample-test-3', title: 'IELTS Academic Practice Test 3', free: false },
  { ...SAMPLE_TEST_META, id: 'sample-test-4', title: 'IELTS General Training Test 1', test_type: 'general' as const, free: false },
]

export default function MockTestsPage() {
  const { t } = useLanguage()

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('dashboard.mockTests')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Realistic, timed IELTS practice tests with instant scoring.
        </p>
      </div>

      <div className="space-y-4">
        {TESTS.map((test, i) => (
          <div
            key={test.id}
            className={`flex items-center gap-5 p-5 rounded-2xl border transition-all duration-200 ${
              test.free
                ? 'bg-white dark:bg-gray-900/60 border-gray-100 dark:border-gray-800 hover:border-indigo-200 dark:hover:border-indigo-500/30 hover:shadow-md'
                : 'bg-gray-50 dark:bg-gray-900/30 border-gray-100 dark:border-gray-800 opacity-75'
            }`}
          >
            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
              {test.free ? (
                <FileText size={20} className="text-indigo-500" />
              ) : (
                <Lock size={20} className="text-gray-400" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {test.title}
                </h3>
                {test.free ? (
                  <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">Free</span>
                ) : (
                  <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">Pro</span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-500">
                <span className="flex items-center gap-1"><Clock size={11} /> {test.time_limit_minutes} min</span>
                <span>{test.sections.join(', ')}</span>
                <span className="capitalize">{test.test_type}</span>
              </div>
            </div>

            {test.free ? (
              <Link
                href={`/mock-tests/${test.id}`}
                className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold btn-primary text-white"
              >
                {t('mockTest.startTest')}
                <ChevronRight size={14} />
              </Link>
            ) : (
              <Link
                href="/subscription"
                className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all"
              >
                Upgrade
                <ChevronRight size={14} />
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
