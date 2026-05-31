'use client'

import Link from 'next/link'
import { Building2, Users, BarChart3, ShieldCheck } from 'lucide-react'

const BENEFITS = [
  { icon: Users,      title: 'Unlimited student seats', desc: 'Onboard whole cohorts with one dashboard — no per-seat surprises.' },
  { icon: BarChart3,  title: 'Class analytics',         desc: 'Track band trajectories, weak skills and study time across every student.' },
  { icon: ShieldCheck,title: 'Teacher tools',           desc: 'Assign mock tests, review AI feedback, and export results to CSV.' },
]

export function ForSchools() {
  return (
    <section id="schools" style={{ background: 'var(--bg-soft)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '96px 32px' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: 56, alignItems: 'center' }}>
        {/* Left — pitch */}
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 12px', borderRadius: 999, background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 18 }}>
            <Building2 size={13} /> For schools & teachers
          </div>
          <h2 style={{ fontSize: 38, fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text)', margin: '0 0 16px', lineHeight: 1.1 }}>
            Bring ielts<span style={{ color: 'var(--accent)' }}>.</span>camp to your{' '}
            <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--accent)' }}>classroom</span>.
          </h2>
          <p style={{ fontSize: 16, color: 'var(--text-2)', lineHeight: 1.65, margin: '0 0 28px', maxWidth: 460 }}>
            Schools, language centres and tutors use ielts.camp to run diagnostic tests, assign practice,
            and watch every student&apos;s band climb — all from one teacher dashboard.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link href="mailto:schools@ielts.camp?subject=ielts.camp%20for%20schools" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 22px', borderRadius: 'var(--radius-lg)',
              fontSize: 14, fontWeight: 600, background: 'var(--accent)', color: 'var(--accent-fg)', textDecoration: 'none',
            }}>
              Talk to our team
            </Link>
            <Link href="/diagnostic/start" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 22px', borderRadius: 'var(--radius-lg)',
              fontSize: 14, fontWeight: 600, background: 'transparent', color: 'var(--text)', border: '1px solid var(--border-strong)', textDecoration: 'none',
            }}>
              Try it yourself
            </Link>
          </div>
        </div>

        {/* Right — benefit cards */}
        <div style={{ display: 'grid', gap: 12 }}>
          {BENEFITS.map(b => (
            <div key={b.title} className="card" style={{ padding: 22, display: 'flex', gap: 16, alignItems: 'flex-start', background: 'var(--bg-elev)' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <b.icon size={18} style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{b.title}</div>
                <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.55 }}>{b.desc}</div>
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 24, padding: '8px 4px 0' }}>
            {[['500+', 'schools'], ['40k+', 'students'], ['+1.2', 'avg band gain']].map(([v, l]) => (
              <div key={l}>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>{v}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
