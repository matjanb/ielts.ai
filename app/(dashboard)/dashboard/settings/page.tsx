'use client'

import { useEffect, useState } from 'react'
import { Loader2, Save, CreditCard, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { createClient } from '@/lib/supabase/client'

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
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setEmail(user.email ?? '')
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('full_name, subscription_status')
        .eq('id', user.id)
        .single()
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
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { error: updateError } = await (supabase as any)
        .from('profiles')
        .update({ full_name: fullName, updated_at: new Date().toISOString() })
        .eq('id', user.id)
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
      <div className="flex items-center justify-center h-64">
        <div className="w-5 h-5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{t('dashboard.settings')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Manage your profile, preferences, and subscription.</p>
      </div>

      {/* Profile */}
      <section className="p-6 rounded-2xl bg-white dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Profile</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
              placeholder="Your full name"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full px-4 py-2.5 rounded-xl text-sm border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-500 cursor-not-allowed"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
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
      <section className="p-6 rounded-2xl bg-white dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">{t('dashboard.subscription')}</h2>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <CreditCard size={14} className="text-gray-400" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Current plan</span>
            </div>
            <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
              subscription === 'free'
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                : 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
            }`}>
              {subscription}
            </span>
          </div>
          <Link
            href="/subscription"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all"
          >
            {subscription === 'free' ? 'Upgrade' : 'Manage'}
            <ExternalLink size={12} />
          </Link>
        </div>
      </section>

      {/* Appearance */}
      <section className="p-6 rounded-2xl bg-white dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Appearance & Language</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-700 dark:text-gray-300">Theme</div>
              <div className="text-xs text-gray-400 dark:text-gray-500">Light or dark mode</div>
            </div>
            <ThemeToggle />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-700 dark:text-gray-300">Language</div>
              <div className="text-xs text-gray-400 dark:text-gray-500">Interface language</div>
            </div>
            <LanguageSwitcher />
          </div>
        </div>
      </section>
    </div>
  )
}
