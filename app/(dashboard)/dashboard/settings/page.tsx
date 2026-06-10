'use client'

import { useEffect, useState } from 'react'
import { Loader2, Save, CreditCard, ExternalLink, Lock, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { useIsMobile } from '@/lib/hooks/useIsMobile'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { getProfile, updateProfile } from '@/lib/services/user'
import { getUser, updatePassword, signOut } from '@/lib/services/auth'

const BANDS = [4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9]

const primaryBtn = {
  display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px',
  borderRadius: 10, fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer',
} as const

const inputCls =
  'w-full px-3.5 py-2.5 rounded-lg text-sm border border-[var(--border-strong)] bg-[var(--bg-elev)] text-[var(--text)] outline-none transition-colors focus:border-[var(--accent)]'
const labelCls = 'block text-xs font-medium text-[var(--text-2)] mb-1.5'

function SectionHeader({ title, desc }: { title: string; desc?: string }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{title}</h2>
      {desc && <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '3px 0 0' }}>{desc}</p>}
    </div>
  )
}

export default function SettingsPage() {
  const { t } = useLanguage()
  const isMobile = useIsMobile()

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
      if (updateError) setError(updateError.message)
      else { setSaved(true); setTimeout(() => setSaved(false), 3000) }
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 320 }}>
        <div style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin .8s linear infinite' }}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  return (
    <div style={{ padding: isMobile ? '20px 16px 72px' : '32px 24px 80px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }} className="space-y-5">

        {/* Page header */}
        <div style={{ marginBottom: 4 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)', margin: 0 }}>
            {t('dashboard.settings')}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-2)', margin: '4px 0 0' }}>{t('settings.subtitle')}</p>
        </div>

        {/* Profile */}
        <section className="card" style={{ padding: 24 }}>
          <SectionHeader title={t('settings.profile')} desc="Your name and target score." />
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className={labelCls}>{t('settings.fullName')}</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className={inputCls} placeholder={t('settings.fullNamePh')} />
            </div>

            <div style={{ maxWidth: 220 }}>
              <label className={labelCls}>Target band</label>
              <select value={targetBand} onChange={e => setTargetBand(parseFloat(e.target.value))} className={inputCls} style={{ cursor: 'pointer' }}>
                {BANDS.map(b => <option key={b} value={b}>{b.toFixed(1)}</option>)}
              </select>
            </div>

            <div>
              <label className={labelCls}>{t('settings.email')}</label>
              <input type="email" value={email} disabled className="w-full px-3.5 py-2.5 rounded-lg text-sm border border-[var(--border)] bg-[var(--bg-soft)] text-[var(--text-3)] cursor-not-allowed" />
              <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '6px 0 0' }}>Email can&apos;t be changed.</p>
            </div>

            {error && <p style={{ fontSize: 13, color: 'var(--danger)' }}>{error}</p>}

            <div style={{ paddingTop: 4 }}>
              <button type="submit" disabled={saving} className="btn-primary text-white disabled:opacity-60" style={primaryBtn}>
                {saving ? <><Loader2 size={14} className="animate-spin" /> {t('settings.saving')}</>
                  : saved ? t('settings.saved')
                  : <><Save size={14} /> {t('common.save')}</>}
              </button>
            </div>
          </form>
        </section>

        {/* Security */}
        <section className="card" style={{ padding: 24 }}>
          <SectionHeader title="Security" desc="Change your password." />
          <form onSubmit={handlePassword} className="space-y-4">
            <div>
              <label className={labelCls}>New password</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={inputCls} placeholder="Min. 8 characters" autoComplete="new-password" />
            </div>
            <div>
              <label className={labelCls}>Confirm new password</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputCls} placeholder="Repeat password" autoComplete="new-password" />
            </div>

            {pwError && <p style={{ fontSize: 13, color: 'var(--danger)' }}>{pwError}</p>}

            <div style={{ paddingTop: 4 }}>
              <button type="submit" disabled={pwSaving || !newPassword} className="btn-primary text-white disabled:opacity-60" style={primaryBtn}>
                {pwSaving ? <><Loader2 size={14} className="animate-spin" /> Updating…</>
                  : pwSaved ? 'Password updated'
                  : <><Lock size={14} /> Update password</>}
              </button>
            </div>
          </form>
        </section>

        {/* Subscription */}
        <section className="card" style={{ padding: 24 }}>
          <SectionHeader title={t('dashboard.subscription')} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <CreditCard size={15} style={{ color: 'var(--text-3)' }} />
                <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{t('settings.currentPlan')}</span>
              </div>
              <span className="capitalize" style={{
                display: 'inline-block', padding: '3px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                background: subscription === 'free' ? 'var(--bg-soft)' : 'var(--accent-soft)',
                color: subscription === 'free' ? 'var(--text-2)' : 'var(--accent)',
              }}>
                {subscription}
              </span>
            </div>
            <Link href="/subscription" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10,
              fontSize: 14, fontWeight: 600, textDecoration: 'none',
              border: '1px solid var(--border-strong)', color: 'var(--text)',
            }}>
              {subscription === 'free' ? t('settings.upgrade') : t('settings.manage')}
              <ExternalLink size={13} />
            </Link>
          </div>
        </section>

        {/* Appearance & Language */}
        <section className="card" style={{ padding: 24 }}>
          <SectionHeader title={t('settings.appearance')} />
          <div className="space-y-1">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
              <div>
                <div style={{ fontSize: 14, color: 'var(--text)' }}>{t('settings.theme')}</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 2 }}>{t('settings.themeDesc')}</div>
              </div>
              <ThemeToggle />
            </div>
            <div style={{ height: 1, background: 'var(--border)' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
              <div>
                <div style={{ fontSize: 14, color: 'var(--text)' }}>{t('settings.language')}</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 2 }}>{t('settings.languageDesc')}</div>
              </div>
              <LanguageSwitcher />
            </div>
          </div>
        </section>

        {/* Danger zone */}
        <section className="card" style={{ padding: 24 }}>
          <SectionHeader title="Danger zone" desc="Permanently delete your account and all your data. This can't be undone." />

          {deleteError && <p style={{ fontSize: 13, color: 'var(--danger)', marginBottom: 12 }}>{deleteError}</p>}

          {!confirmingDelete ? (
            <button
              onClick={() => setConfirmingDelete(true)}
              style={{ ...primaryBtn, background: 'transparent', color: 'var(--danger)', border: '1px solid var(--danger)' }}
            >
              <Trash2 size={14} /> Delete account
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14, color: 'var(--text)' }}>Are you sure? This is permanent.</span>
              <button onClick={handleDelete} disabled={deleting} style={{ ...primaryBtn, background: 'var(--danger)', color: 'white', opacity: deleting ? 0.6 : 1 }}>
                {deleting ? <><Loader2 size={14} className="animate-spin" /> Deleting…</> : 'Yes, delete forever'}
              </button>
              <button onClick={() => setConfirmingDelete(false)} disabled={deleting} style={{ ...primaryBtn, background: 'var(--bg-soft)', color: 'var(--text)', border: '1px solid var(--border-strong)' }}>
                Cancel
              </button>
            </div>
          )}
        </section>

      </div>
    </div>
  )
}
