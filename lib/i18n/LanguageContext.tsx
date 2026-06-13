'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import enBase from '../../locales/en.json'

export type Language = 'en' | 'ru' | 'kz' | 'uz' | 'kg'

type Translations = Record<string, unknown>

// English is bundled synchronously so the very first paint already has real
// strings (never raw keys) and acts as the fallback for any missing key.
const EN = enBase as Translations

interface LanguageContextValue {
  language: Language
  setLanguage: (lang: Language) => void
  translations: Translations
  t: (key: string, params?: Record<string, string>) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

const STORAGE_KEY = 'ielts-ai-lang'
const DEFAULT_LANG: Language = 'en'

async function loadTranslations(lang: Language): Promise<Translations> {
  try {
    const mod = await import(`../../locales/${lang}.json`)
    return mod.default as Translations
  } catch {
    const mod = await import('../../locales/en.json')
    return mod.default as Translations
  }
}

function resolve(obj: Translations, key: string): string {
  const parts = key.split('.')
  let cur: unknown = obj
  for (const part of parts) {
    if (cur == null || typeof cur !== 'object') return key
    cur = (cur as Record<string, unknown>)[part]
  }
  return typeof cur === 'string' ? cur : key
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANG)
  const [translations, setTranslations] = useState<Translations>(EN)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Language | null
    const initial = saved && ['en', 'ru', 'kz', 'uz', 'kg'].includes(saved) ? saved : DEFAULT_LANG
    // syncing the persisted language choice on mount (localStorage is client-only)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLanguageState(initial)
    if (initial !== 'en') loadTranslations(initial).then(setTranslations)
  }, [])

  function setLanguage(lang: Language) {
    setLanguageState(lang)
    localStorage.setItem(STORAGE_KEY, lang)
    if (lang === 'en') setTranslations(EN)
    else loadTranslations(lang).then(setTranslations)
  }

  function t(key: string, params?: Record<string, string>): string {
    let value = resolve(translations, key)
    // Fall back to English for any key missing in the active locale, so a
    // missing translation never leaks the raw key (e.g. "dashboard.vocabulary").
    if (value === key) value = resolve(EN, key)
    if (params) {
      value = Object.entries(params).reduce(
        (str, [k, v]) => str.replace(`{{${k}}}`, v),
        value
      )
    }
    return value
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, translations, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider')
  return ctx
}
