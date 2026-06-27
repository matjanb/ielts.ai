import type { Metadata } from 'next'
import { EssayCheckerForm } from '@/components/checker/EssayCheckerForm'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ielts.camp'

export const metadata: Metadata = {
  title: 'Free AI IELTS Essay Checker — Instant Band Score',
  description:
    'Paste your IELTS Writing Task 1 or Task 2 essay and get an instant AI band score with a breakdown across Task, Coherence, Lexical Resource and Grammar. Free, no login.',
  keywords: ['IELTS essay checker', 'IELTS band score', 'IELTS writing checker', 'AI IELTS', 'IELTS writing feedback'],
  alternates: { canonical: `${SITE_URL}/essay-checker` },
  openGraph: {
    title: 'Free AI IELTS Essay Checker — Instant Band Score',
    description: 'Instant AI band score for your IELTS essay. Free, no login.',
    url: `${SITE_URL}/essay-checker`,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free AI IELTS Essay Checker — Instant Band Score',
    description: 'Instant AI band score for your IELTS essay. Free, no login.',
  },
}

// Public, no-login lead magnet. Server-rendered hero (indexable) + client form.
export default function EssayCheckerPage() {
  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <section style={{ maxWidth: 760, margin: '0 auto', padding: 'clamp(32px, 7vw, 64px) 20px 80px' }}>
        <header style={{ textAlign: 'center', marginBottom: 32 }}>
          <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', background: 'var(--accent-soft)', padding: '4px 12px', borderRadius: 999, marginBottom: 16 }}>
            Free · No login
          </span>
          <h1 style={{ fontSize: 'clamp(28px, 6vw, 44px)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.08, margin: '0 0 14px' }}>
            Check your IELTS essay — get your band score in seconds
          </h1>
          <p style={{ fontSize: 17, color: 'var(--text-2)', lineHeight: 1.55, margin: '0 auto', maxWidth: 560 }}>
            Paste your Writing Task 1 or Task 2 response. Our AI examiner scores it on the four official
            criteria and shows you exactly where you&apos;re losing marks.
          </p>
        </header>

        <EssayCheckerForm />
      </section>
    </main>
  )
}
