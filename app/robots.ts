import type { MetadataRoute } from 'next'

const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ielts.camp'

// Allow public pages; keep the app, admin and APIs out of the index.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/dashboard', '/admin', '/api/', '/onboarding', '/subscription'] },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}
