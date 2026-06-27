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

        {/* Keyword-rich FAQ — helps ranking for "ielts essay checker / band score" */}
        <section style={{ marginTop: 56 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 18px' }}>
            About the IELTS essay band checker
          </h2>
          <div style={{ display: 'grid', gap: 16 }}>
            {FAQ.map(f => (
              <div key={f.q}>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px', color: 'var(--text)' }}>{f.q}</h3>
                <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, margin: 0 }}>{f.a}</p>
              </div>
            ))}
          </div>
        </section>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
    </main>
  )
}

const FAQ = [
  { q: 'How does the free IELTS essay checker work?', a: 'Paste your IELTS Writing Task 1 or Task 2 essay and our AI examiner instantly estimates your band score across the four official criteria — Task Achievement/Response, Coherence & Cohesion, Lexical Resource and Grammatical Range & Accuracy.' },
  { q: 'Is the IELTS band score checker free?', a: 'Yes. You get an instant overall band score and a sample of issues for free, no login required. Sign up free to unlock the full per-criterion feedback and corrections.' },
  { q: 'How accurate is the AI IELTS writing score?', a: 'The checker is trained on the official IELTS band descriptors and gives a close estimate of your writing band. For exam-grade accuracy and detailed feedback on every mistake, create a free account.' },
  { q: 'Can I check both Writing Task 1 and Task 2?', a: 'Yes — choose Task 1 (report/letter) or Task 2 (opinion/discussion essay) and the checker grades it against the right criteria.' },
]

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      name: 'AI IELTS Essay & Band Score Checker',
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Web',
      url: `${SITE_URL}/essay-checker`,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
    {
      '@type': 'FAQPage',
      mainEntity: FAQ.map(f => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  ],
}
