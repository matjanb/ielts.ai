'use client'

import { useEffect, useState } from 'react'
import { Loader2, Save, CreditCard, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { getProfile, updateProfile } from '@/lib/services/user'
import { getUser } from '@/lib/services/auth'

export default function SettingsPage() {
  const { t } = useLanguage()
  const [fullName, setFullName]   = useState('')
  const [email, setEmail]         = useState('')
  const [subscription, setSubscription] = useState('free')
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [error, setError]         = useState('')

  useEffect(() => {
    async function load() {
      const { user } = await getUser()
      if (!user) return
      setEmail(user.email ?? '')
      const profile = await getProfile(user.id)
      if (profile) {
        setFullName(profile.full_name ?? '')
        setSubscription(profile.subscription_status ?? 'free')
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    setSaved(false)
    try {
      const { user } = await getUser()
      if (!user) return
      const { error: updateError } = await updateProfile(user.id, { full_name: fullName })
      if (updateError) {
        setError(updateError.message)
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 260 }}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin .8s linear infinite' }}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text)] mb-1">{t('dashboard.settings')}</h1>
        <p className="text-sm text-[var(--text-2)]">Manage your profile, preferences, and subscription.</p>
      </div>

      {/* Profile */}
      <section className="p-6 card">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Profile</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-2)] mb-1.5">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-sm border border-[var(--border)] bg-[var(--bg-elev)] text-[var(--text)]  transition-all"
              placeholder="Your full name"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-2)] mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full px-4 py-2.5 rounded-xl text-sm border border-[var(--border)] bg-[var(--bg-soft)] text-[var(--text-3)] cursor-not-allowed"
            />
          </div>
          {error && (
            <p className="text-sm text-[var(--danger)]">{error}</p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold btn-primary text-white disabled:opacity-60"
          >
            {saving
              ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
              : saved
              ? 'Saved!'
              : <><Save size={14} /> {t('common.save')}</>
            }
          </button>
        </form>
      </section>

      {/* Subscription */}
      <section className="p-6 card">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-4">{t('dashboard.subscription')}</h2>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <CreditCard size={14} style={{ color: "var(--text-3)" }} />
              <span className="text-sm text-[var(--text-2)]">Current plan</span>
            </div>
            <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
              subscription === 'free'
                ? 'bg-[var(--bg-soft)] text-[var(--text-2)]'
                : 'bg-[var(--accent-soft)] text-[var(--accent)]'
            }`}>
              {subscription}
            </span>
          </div>
          <Link
            href="/subscription"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border border-[var(--border)] text-[var(--text-2)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all"
          >
            {subscription === 'free' ? 'Upgrade' : 'Manage'}
            <ExternalLink size={12} />
          </Link>
        </div>
      </section>

      {/* Appearance */}
      <section className="p-6 card">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Appearance & Language</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-[var(--text-2)]">Theme</div>
              <div className="text-xs text-[var(--text-3)]">Light or dark mode</div>
            </div>
            <ThemeToggle />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-[var(--text-2)]">Language</div>
              <div className="text-xs text-[var(--text-3)]">Interface language</div>
            </div>
            <LanguageSwitcher />
          </div>
        </div>
      </section>
    </div>
  )
}
