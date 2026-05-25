'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BookOpen, Clock, HelpCircle, ChevronRight } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { createClient } from '@/lib/supabase/client'

interface ReadingTest {
  id: string
  title: string
  book_number: number | null
  test_number: number | null
  difficulty: string | null
}

export default function ReadingIndexPage() {
  const { t } = useLanguage()
  const [tests, setTests] = useState<ReadingTest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient() as any
      const { data } = await supabase
        .from('tests')
        .select('id, title, book_number, test_number, difficulty')
        .eq('type', 'reading')
        .order('created_at', { ascending: true })
      setTests(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
          <BookOpen size={18} strokeWidth={1.8} className="text-blue-500" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            Reading Tests
          </h1>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Practice with full Cambridge-style reading tests
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        </div>
      ) : tests.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900/50 p-8 text-center">
          <p className="text-sm text-gray-400 dark:text-gray-500">No reading tests available.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tests.map((test) => (
            <Link
              key={test.id}
              href={`/reading/${test.id}`}
              className="flex items-center gap-4 p-5 rounded-2xl bg-white dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 hover:shadow-md hover:shadow-black/4 transition-all duration-200 group"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                <BookOpen size={16} strokeWidth={1.8} className="text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {test.title}
                </p>
                {(test.book_number != null || test.test_number != null) && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                    {test.book_number != null ? `Book ${test.book_number}` : ''}
                    {test.book_number != null && test.test_number != null ? ' · ' : ''}
                    {test.test_number != null ? `Test ${test.test_number}` : ''}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                    <HelpCircle size={11} strokeWidth={2} />
                    40 Questions
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                    <Clock size={11} strokeWidth={2} />
                    60 min
                  </span>
                </div>
              </div>
              <ChevronRight size={15} strokeWidth={2} className="text-gray-300 dark:text-gray-700 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
