'use client'

import { useState, useEffect } from 'react'
import { Home, Sparkles, PlayCircle, CreditCard, HelpCircle } from 'lucide-react'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import Link from 'next/link'

const NAV_ITEMS = [
  { id: 'home',     icon: Home,       key: 'home'       },
  { id: 'features', icon: Sparkles,   key: 'features'   },
  { id: 'how',      icon: PlayCircle, key: 'howItWorks' },
  { id: 'pricing',  icon: CreditCard, key: 'pricing'    },
  { id: 'faq',      icon: HelpCircle, key: 'faq'        },
]

export function FloatingNav() {
  const [active, setActive] = useState('home')
  const [visible, setVisible] = useState(true)
  const [lastY, setLastY] = useState(0)
  const { t } = useLanguage()

  useEffect(() => {
    function onScroll() {
      const y = window.scrollY
      setVisible(y < lastY || y < 80)
      setLastY(y)

      const sections = ['home', 'features', 'how', 'pricing', 'faq']
      for (const id of [...sections].reverse()) {
        const el = document.getElementById(id)
        if (el && window.scrollY + 200 >= el.offsetTop) {
          setActive(id)
          break
        }
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [lastY])

  function scrollTo(id: string) {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
    setActive(id)
  }

  return (
    <>
      {/* Top-right controls */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <div className="flex items-center bg-white/85 dark:bg-gray-900/85 backdrop-blur-xl border border-gray-200/60 dark:border-white/8 rounded-xl px-1 py-1 shadow-sm shadow-black/5 dark:shadow-black/30">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
        <Link
          href="/login"
          className="px-4 py-2 rounded-xl text-sm font-medium border border-gray-200/80 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:border-indigo-400/60 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-150 hidden sm:block bg-white/85 dark:bg-gray-900/85 backdrop-blur-xl shadow-sm shadow-black/5"
        >
          {t('nav.login')}
        </Link>
        <Link
          href="/diagnostic/start"
          className="px-4 py-2 rounded-xl text-sm font-semibold btn-primary text-white hidden sm:block"
        >
          {t('nav.getStarted')}
        </Link>
      </div>

      {/* Bottom floating nav */}
      <nav
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ease-out ${
          visible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-0.5 p-1.5 rounded-2xl bg-white/88 dark:bg-[#0c0c1d]/92 backdrop-blur-2xl border border-gray-200/50 dark:border-white/8 shadow-2xl shadow-black/10 dark:shadow-black/60">
          {NAV_ITEMS.map(({ id, icon: Icon, key }) => {
            const isActive = active === id
            return (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/25'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/8'
                }`}
              >
                <Icon size={15} strokeWidth={isActive ? 2.5 : 1.8} />
                <span className="hidden sm:inline">{t(`nav.${key}`)}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}
