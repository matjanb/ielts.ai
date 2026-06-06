'use client'

import { useEffect, useState } from 'react'
import { Loader2, Save, CreditCard, ExternalLink, Lock, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { getProfile, updateProfile } from '@/lib/services/user'
import { getUser, updatePassword, signOut } from '@/lib/services/auth'

const BANDS = [4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9]

const primaryBtn = {
  display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px',
  borderRadius: 12, fontSize: 14, fontWeight: 600,
} as const

export default function SettingsPage() {
  const { t } = useLanguage()

  // Profile
  const [fullName, setFullName]     = useState('')
  const [targetBand, setTargetBand] = useState<number>(7)
  const [email, setEmail]           = useState('')
  const [subscription, setSubscription] = useState('free')
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [saved, setSaved]           = useState(false)
  const [error, setError]           = useState('')

  // Password
  const [newPassword, setNewPassword]         = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwSaved, setPwSaved]   = useState(false)
  const [pwError, setPwError]   = useState('')

  // Delete account
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting]       = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    async function load() {
      const { user } = await getUser()
      if (!user) return
      setEmail(user.email ?? '')
      const profile = await getProfile(user.id)
      if (profile) {
        setFullName(profile.full_name ?? '')
        setSubscription(profile.subscription_status ?? 'free')
        if (typeof profile.target_band_score === 'number') setTargetBand(profile.target_band_score)
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
      const { error: updateError } = await updateProfile(user.id, {
        full_name: fullName,
        target_band_score: targetBand,
      })
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

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwError('')
    setPwSaved(false)
    if (newPassword.length < 8) { setPwError('Password must be at least 8 characters.'); return }
    if (newPassword !== confirmPassword) { setPwError('Passwords do not match.'); return }
    setPwSaving(true)
    const { error: pwErr } = await updatePassword(newPassword)
    setPwSaving(false)
    if (pwErr) { setPwError(pwErr.message); return }
    setNewPassword('')
    setConfirmPassword('')
    setPwSaved(true)
    setTimeout(() => setPwSaved(false), 3000)
  }

  async function handleDelete() {
    setDeleteError('')
    setDeleting(true)
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setDeleteError(d.error ?? 'Failed to delete account.')
        setDeleting(false)
        return
      }
      await signOut()
      window.location.href = '/'
    } catch {
      setDeleteError('Network error. Please try again.')
      setDeleting(false)
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

  const inputCls = 'w-full px-4 py-2.5 rounded-xl text-sm border border-[var(--border)] bg-[var(--bg-elev)] text-[var(--text)] transition-all'

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
              className={inputCls}
              placeholder={t('settings.fullNamePh')}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-2)] mb-1.5">Target band</label>
            <select
              value={targetBand}
              onChange={e => setTargetBand(parseFloat(e.target.value))}
              className={inputCls}
              style={{ cursor: 'pointer' }}
            >
              {BANDS.map(b => <option key={b} value={b}>{b.toFixed(1)}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-2)] mb-1.5">{t('settings.email')}</label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full px-4 py-2.5 rounded-xl text-sm border border-[var(--border)] bg-[var(--bg-soft)] text-[var(--text-3)] cursor-not-allowed"
            />
            <p className="text-xs text-[var(--text-3)] mt-1.5">Email can&apos;t be changed.</p>
          </div>

          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

          <button type="submit" disabled={saving} className="btn-primary text-white disabled:opacity-60" style={primaryBtn}>
            {saving
              ? <><Loader2 size={14} className="animate-spin" /> {t('settings.saving')}</>
              : saved
              ? t('settings.saved')
              : <><Save size={14} /> {t('common.save')}</>
            }
          </button>
        </form>
      </section>

      {/* Security */}
      <section className="p-6 card">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Security</h2>
        <form onSubmit={handlePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-2)] mb-1.5">New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className={inputCls}
              placeholder="Min. 8 characters"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-2)] mb-1.5">Confirm new password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className={inputCls}
              placeholder="Repeat password"
              autoComplete="new-password"
            />
          </div>

          {pwError && <p className="text-sm text-[var(--danger)]">{pwError}</p>}

          <button type="submit" disabled={pwSaving || !newPassword} className="btn-primary text-white disabled:opacity-60" style={primaryBtn}>
            {pwSaving
              ? <><Loader2 size={14} className="animate-spin" /> Updating…</>
              : pwSaved
              ? 'Password updated'
              : <><Lock size={14} /> Update password</>
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
              <CreditCard size={14} style={{ color: 'var(--text-3)' }} />
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

      {/* Danger zone */}
      <section className="p-6 card" style={{ borderColor: 'var(--danger)' }}>
        <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--danger)' }}>Danger zone</h2>
        <p className="text-sm text-[var(--text-2)] mb-4">Permanently delete your account and all your data. This can&apos;t be undone.</p>

        {deleteError && <p className="text-sm mb-3" style={{ color: 'var(--danger)' }}>{deleteError}</p>}

        {!confirmingDelete ? (
          <button
            onClick={() => setConfirmingDelete(true)}
            style={{ ...primaryBtn, background: 'transparent', color: 'var(--danger)', border: '1px solid var(--danger)', cursor: 'pointer' }}
          >
            <Trash2 size={14} /> Delete account
          </button>
        ) : (
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-[var(--text)]">Are you sure? This is permanent.</span>
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{ ...primaryBtn, background: 'var(--danger)', color: 'white', border: 'none', cursor: 'pointer', opacity: deleting ? 0.6 : 1 }}
            >
              {deleting ? <><Loader2 size={14} className="animate-spin" /> Deleting…</> : 'Yes, delete forever'}
            </button>
            <button
              onClick={() => setConfirmingDelete(false)}
              disabled={deleting}
              style={{ ...primaryBtn, background: 'var(--bg-soft)', color: 'var(--text)', border: '1px solid var(--border-strong)', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
