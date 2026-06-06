'use client'

import { useEffect } from 'react'
import { getUser } from '@/lib/services/auth'
import { saveDiagnosticData } from '@/lib/services/diagnostic'

/* When email confirmation is on, there's no session at sign-up, so the diagnostic
 * answers (kept in localStorage) aren't saved yet. Once the confirmed user lands
 * back in the app, flush them to their profile. saveDiagnosticData clears
 * localStorage afterwards, so this runs at most once. */
export function DiagnosticSync() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!localStorage.getItem('ielts-diagnostic-background')) return
    getUser().then(({ user }) => {
      if (user) saveDiagnosticData(user.id).catch(() => { /* best effort */ })
    })
  }, [])
  return null
}
