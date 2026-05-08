'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, BookOpen, Mic, FileText, BrainCircuit,
  TrendingUp, Settings, LogOut, Menu, X, CreditCard
} from 'lucide-react'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { LanguageProvider, useLanguage } from '@/lib/i18n/LanguageContext'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { signOut } from '@/lib/services/auth'
import type { ReactNode } from 'react'

const NAV_ITEMS = [
  { href: '/dashboard',             icon: LayoutDashboard, key: 'overview'  },
  { href: '/dashboard/writing',     icon: BookOpen,        key: 'writing'   },
  { href: '/dashboard/speaking',    icon: Mic,             key: 'speaking'  },
  { href: '/mock-tests',             icon: FileText,        key: 'mockTests' },
  { href: '/dashboard/study-plan',  icon: BrainCircuit,    key: 'studyPlan' },
  { href: '/dashboard/progress',    icon: TrendingUp,      key: 'progress'  },
]

function DashboardNav({ onClose }: { onClose?: () => void }) {
  const { t } = useLanguage()
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await signOut()
    router.push('/')
  }

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 mb-1">
        <Link href="/" className="flex items-center gap-2" onClick={onClose}>
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <span className="text-white text-[10px] font-bold">i</span>
          </div>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">ielts.ai</span>
        </Link>
        {onClose && (
          <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 space-y-px">
        {NAV_ITEMS.map(({ href, icon: Icon, key }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 ${
                active
                  ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-white/5'
              }`}
            >
              <Icon size={15} strokeWidth={active ? 2.2 : 1.8} />
              {t(`dashboard.${key}`)}
            </Link>
          )
        })}
      </nav>

      {/* Bottom actions */}
      <div className="px-3 pb-5 space-y-px border-t border-gray-100 dark:border-gray-800/80 pt-3 mt-3">
        <Link
          href="/subscription"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-white/5 transition-all duration-150"
        >
          <CreditCard size={15} strokeWidth={1.8} />
          {t('dashboard.subscription')}
        </Link>
        <Link
          href="/dashboard/settings"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-white/5 transition-all duration-150"
        >
          <Settings size={15} strokeWidth={1.8} />
          {t('dashboard.settings')}
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/8 transition-all duration-150"
        >
          <LogOut size={15} strokeWidth={1.8} />
          {t('dashboard.logout')}
        </button>
      </div>
    </div>
  )
}

function DashboardLayoutInner({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50/60 dark:bg-[#06060f] flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-54 border-r border-gray-100 dark:border-gray-800/80 bg-white dark:bg-[#08080f] shrink-0" style={{ width: '216px' }}>
        <DashboardNav />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-60 bg-white dark:bg-[#08080f] border-r border-gray-100 dark:border-gray-800/80 z-50">
            <DashboardNav onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 dark:border-gray-800/80 bg-white dark:bg-[#08080f]">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
          >
            <Menu size={18} />
          </button>
          <span className="text-sm font-semibold text-gray-900 dark:text-white lg:hidden">ielts.ai</span>
          <div className="ml-auto flex items-center gap-1">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <DashboardLayoutInner>{children}</DashboardLayoutInner>
      </LanguageProvider>
    </ThemeProvider>
  )
}
