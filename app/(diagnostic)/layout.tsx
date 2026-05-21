import Link from 'next/link'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { LanguageProvider } from '@/lib/i18n/LanguageContext'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import type { ReactNode } from 'react'

export default function DiagnosticLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <div className="min-h-screen bg-white dark:bg-[#06060f] flex flex-col">
          {/* Top bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800/60">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">i</span>
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">ielts.ai</span>
            </Link>
            <div className="flex items-center gap-1">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col">
            {children}
          </div>
        </div>
      </LanguageProvider>
    </ThemeProvider>
  )
}
