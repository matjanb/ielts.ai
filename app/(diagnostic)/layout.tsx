import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { LanguageProvider } from '@/lib/i18n/LanguageContext'
import type { ReactNode } from 'react'

// The diagnostic questionnaire renders its own full-screen chrome (header,
// progress bar, footer), so the layout only provides the theme/language context.
export default function DiagnosticLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        {children}
      </LanguageProvider>
    </ThemeProvider>
  )
}
