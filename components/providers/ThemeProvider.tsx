'use client'

import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes'
import { useEffect } from 'react'
import type { ReactNode } from 'react'

// Tints the mobile browser status bar (the strip with the clock/battery) to match
// the app background instead of the browser's default grey/brown. Updates live
// when the theme toggles.
function ThemeColorMeta() {
  const { resolvedTheme } = useTheme()
  useEffect(() => {
    const color = resolvedTheme === 'dark' ? '#0e0f10' : '#fafaf7'
    let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'theme-color'
      document.head.appendChild(meta)
    }
    meta.content = color
  }, [resolvedTheme])
  return null
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange={false}
    >
      <ThemeColorMeta />
      {children}
    </NextThemesProvider>
  )
}
