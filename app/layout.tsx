import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { LanguageProvider } from '@/lib/i18n/LanguageContext'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'IELTS Camp — AI-Powered IELTS Preparation',
  description: 'Achieve your target IELTS band score with personalised AI feedback, adaptive mock tests, and intelligent study plans.',
  keywords: ['IELTS', 'AI', 'preparation', 'band score', 'mock test', 'writing', 'speaking'],
  openGraph: {
    title: 'IELTS Camp — Master IELTS with AI',
    description: 'Personalised AI feedback, adaptive mock tests, and smart study plans for IELTS success.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen bg-white dark:bg-[#06060f] text-gray-900 dark:text-white antialiased transition-colors duration-200">
        <ThemeProvider>
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
