'use client'

import Link from 'next/link'
import { Share2, Rss, Globe } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

export function Footer() {
  const { t } = useLanguage()

  const columns = [
    {
      titleKey: 'footer.product',
      links: [
        { key: 'footer.features',       href: '#features'   },
        { key: 'footer.pricing',        href: '#pricing'    },
        { key: 'footer.mockTests',      href: '/mock-tests' },
        { key: 'footer.writingPractice',href: '/writing'    },
      ],
    },
    {
      titleKey: 'footer.resources',
      links: [
        { key: 'footer.studyGuides', href: '/guides' },
        { key: 'footer.blog',        href: '/blog'   },
      ],
    },
    {
      titleKey: 'footer.company',
      links: [
        { key: 'footer.about',   href: '/about'   },
        { key: 'footer.contact', href: '/contact' },
        { key: 'footer.privacy', href: '/privacy' },
        { key: 'footer.terms',   href: '/terms'   },
      ],
    },
  ]

  return (
    <footer className="border-t border-gray-100 dark:border-gray-800/80 bg-white dark:bg-[#080812] py-20 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-10 mb-14">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-5">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                <span className="text-white text-[10px] font-bold">i</span>
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">IELTS Camp</span>
            </Link>
            <p className="text-sm text-gray-400 dark:text-gray-500 max-w-xs leading-relaxed mb-6">
              {t('footer.tagline')}
            </p>
            <div className="flex gap-2">
              {[Share2, Rss, Globe].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-8 h-8 rounded-xl border border-gray-200 dark:border-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 hover:border-gray-300 dark:hover:border-gray-700 transition-all duration-150"
                >
                  <Icon size={13} strokeWidth={1.8} />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {columns.map(({ titleKey, links }) => (
            <div key={titleKey}>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-5">
                {t(titleKey)}
              </h4>
              <ul className="space-y-3">
                {links.map(({ key, href }) => (
                  <li key={key}>
                    <Link
                      href={href}
                      className="text-sm text-gray-500 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 transition-colors duration-150"
                    >
                      {t(key)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-gray-100 dark:border-gray-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-400 dark:text-gray-600">{t('footer.copyright')}</p>
          <div className="flex gap-5">
            <Link href="/privacy" className="text-xs text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 transition-colors">
              {t('footer.privacy')}
            </Link>
            <Link href="/terms" className="text-xs text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 transition-colors">
              {t('footer.terms')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
