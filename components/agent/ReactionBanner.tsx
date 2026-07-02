'use client'

import { useEffect, useMemo, useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { renderReaction, type ReactionContext } from '@/lib/agent/reactions'

export const REACTION_STORAGE_KEY = 'agent_instant_reaction'

// Shows the coach's instant reaction once on the results page. The exam page
// stashes the server-built ReactionContext in sessionStorage right before
// navigating here; we consume (and clear) it so a page refresh doesn't replay
// the reaction as if the coach said it twice.
export function ReactionBanner() {
  const { language } = useLanguage()
  const [ctx, setCtx] = useState<ReactionContext | null>(null)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(REACTION_STORAGE_KEY)
      if (!raw) return
      sessionStorage.removeItem(REACTION_STORAGE_KEY)
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage is client-only
      setCtx(JSON.parse(raw) as ReactionContext)
    } catch { /* malformed — skip the banner */ }
  }, [])

  // Freeze the wording per mount: re-renders must not reshuffle the pieces.
  const text = useMemo(
    () => (ctx ? renderReaction(language, ctx) : null),
    [ctx, language],
  )

  if (!text) return null
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '12px 16px', marginBottom: 16,
      borderRadius: 12, border: '1px solid var(--border-strong)',
      borderLeft: '3px solid var(--accent)',
      background: 'var(--bg-elevated, var(--card-bg, transparent))',
      fontSize: 14, lineHeight: 1.5,
    }}>
      <span aria-hidden style={{ fontSize: 16 }}>💬</span>
      <span style={{ flex: 1 }}>{text}</span>
      <button
        onClick={() => setCtx(null)}
        aria-label="Dismiss"
        style={{
          border: 'none', background: 'none', cursor: 'pointer',
          color: 'inherit', opacity: 0.5, fontSize: 16, lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  )
}
