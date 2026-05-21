import { getRequestConfig } from 'next-intl/server'

const locales = ['en', 'ru', 'kz', 'uz'] as const
type Locale = (typeof locales)[number]

function isLocale(value: string | undefined): value is Locale {
  return locales.includes(value as Locale)
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = isLocale(requested) ? requested : 'en'

  return {
    locale,
    messages: (await import(`../locales/${locale}.json`)).default,
  }
})
