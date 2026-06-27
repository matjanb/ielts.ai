import type { MetadataRoute } from 'next'

const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ielts.camp'

// Public, indexable pages. The essay checker is high priority — it's the
// SEO lead-magnet we want ranking for "ielts essay checker" queries.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return [
    { url: base, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/essay-checker`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/signup`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/login`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
  ]
}
