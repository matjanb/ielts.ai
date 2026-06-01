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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text)] mb-1">{t('dashboard.settings')}</h1>
        <p className="text-sm text-[var(--text-2)]">{t('settings.subtitle')}</p>
      </div>

      {/* Profile */}
      <section className="p-6 card">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-4">{t('settings.profile')}</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-2)] mb-1.5">{t('settings.fullName')}</label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-sm border border-[var(--border)] bg-[var(--bg-elev)] text-[var(--text)]  transition-all"
              placeholder={t('settings.fullNamePh')}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-2)] mb-1.5">{t('settings.email')}</label>
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
              ? <><Loader2 size={14} className="animate-spin" /> {t('settings.saving')}</>
              : saved
              ? t('settings.saved')
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
              <span className="text-sm text-[var(--text-2)]">{t('settings.currentPlan')}</span>
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
            {subscription === 'free' ? t('settings.upgrade') : t('settings.manage')}
            <ExternalLink size={12} />
          </Link>
        </div>
      </section>

      {/* Appearance */}
      <section className="p-6 card">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-4">{t('settings.appearance')}</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-[var(--text-2)]">{t('settings.theme')}</div>
              <div className="text-xs text-[var(--text-3)]">{t('settings.themeDesc')}</div>
            </div>
            <ThemeToggle />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-[var(--text-2)]">{t('settings.language')}</div>
              <div className="text-xs text-[var(--text-3)]">{t('settings.languageDesc')}</div>
            </div>
            <LanguageSwitcher />
          </div>
        </div>
      </section>
    </div>
  )
}
