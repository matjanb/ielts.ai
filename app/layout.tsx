import type { Metadata, Viewport } from 'next'
import { Manrope, Newsreader, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { LanguageProvider } from '@/lib/i18n/LanguageContext'

const manrope = Manrope({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
})

const newsreader = Newsreader({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['400', '500'],
  style: ['normal', 'italic'],
})

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
})

// Tints the mobile status bar. iOS Safari reads theme-color once at first paint
// and ignores later JS edits, so the value must be in the initial HTML. The app
// defaults to dark (theme is class-toggled, not OS-driven), so we ship the dark
// bg here; ThemeProvider updates it live when the user toggles to light.
export const viewport: Viewport = {
  themeColor: '#0e0f10',
}

export const metadata: Metadata = {
  title: 'ielts.camp',
  description: 'Mock tests, daily drills and a personal AI coach across Listening, Reading, Writing, Speaking. Built around the real computer-based IELTS Academic format.',
  keywords: ['IELTS', 'AI', 'preparation', 'band score', 'mock test', 'writing', 'speaking'],
  openGraph: {
    title: 'ielts.camp — AI-powered IELTS prep',
    description: 'Your shortest path to Band 8+',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${manrope.variable} ${newsreader.variable} ${jetbrainsMono.variable}`}>
      {/* min-height comes from globals.css (var(--full-h)) — min-h-screen would
          overshoot under the large-monitor body zoom */}
      <body className="antialiased">
        <ThemeProvider>
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
