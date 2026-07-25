'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { useIsMobile } from '@/lib/hooks/useIsMobile'
import { getUser } from '@/lib/services/auth'
import {
  getDecksWithStats, getStats, getRecentlyLearned, getStudyQueue, getDueQueue, reviewWord,
  type DeckWithStats, type VocabStats, type VocabWord, type SrsResult,
} from '@/lib/services/vocabulary'

const SRS_BUTTONS: { key: SrsResult; sub: string; color: string }[] = [
  { key: 'again', sub: '<1min', color: 'var(--danger)' },
  { key: 'hard',  sub: '~1 day', color: 'var(--warn)'  },
  { key: 'good',  sub: '~3 days', color: 'var(--accent)' },
  { key: 'easy',  sub: '~4 days', color: 'var(--info)'  },
]

// ── Flashcard SRS session ─────────────────────────────────────────────────────
function FlashcardSession({
  words, title, userId, onClose,
}: {
  words: VocabWord[]
  title: string
  userId: string | null
  onClose: () => void
}) {
  const { t } = useLanguage()
  const isMobile = useIsMobile()
  const [started, setStarted] = useState(false)
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [reviewed, setReviewed] = useState(0)
  const [done, setDone] = useState(false)
  const card = words[idx]

  function grade(result: SrsResult) {
    if (userId && card) reviewWord(userId, card.id, result).catch(() => {})
    setReviewed(n => n + 1)
    if (idx < words.length - 1) { setIdx(idx + 1); setFlipped(false) }
    else setDone(true)
  }

  // ── Rules / intro screen (shown before the cards) ──
  if (!started && !done) {
    return (
      <div style={{ minHeight: 'var(--full-h)', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
        <header style={{ padding: isMobile ? '14px 16px' : '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
          <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-2)', background: 'transparent', border: '1px solid var(--border-strong)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}>
            ✕ {t('vocab.exit')}
          </button>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220 }}>{title}</span>
          <span style={{ width: 60 }}/>
        </header>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div className="card animate-fade-up" style={{ padding: isMobile ? 22 : 36, maxWidth: 520, width: '100%' }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', margin: '0 0 6px', letterSpacing: '-0.02em' }}>{t('vocab.rulesTitle')}</h1>
            <p style={{ fontSize: 14.5, lineHeight: 1.55, color: 'var(--text-2)', margin: '0 0 22px' }}>{t('vocab.rulesIntro')}</p>

            <div style={{ display: 'grid', gap: 10, marginBottom: 26 }}>
              {SRS_BUTTONS.map(b => (
                <div key={b.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', background: 'var(--bg-soft)', borderRadius: 12, border: '1px solid var(--border)' }}>
                  <span style={{ flexShrink: 0, marginTop: 1, fontSize: 12, fontWeight: 700, color: b.color, background: `color-mix(in srgb, ${b.color} 14%, transparent)`, padding: '3px 10px', borderRadius: 999, minWidth: 58, textAlign: 'center' }}>
                    {t('vocab.' + b.key)}
                  </span>
                  <span style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--text)' }}>{t('vocab.rule' + b.key.charAt(0).toUpperCase() + b.key.slice(1))}</span>
                </div>
              ))}
            </div>

            <button onClick={() => setStarted(true)} style={{
              width: '100%', padding: '14px', borderRadius: 'var(--radius-lg)', fontSize: 15, fontWeight: 700,
              background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', cursor: 'pointer',
            }}>
              {t('vocab.startSession')} · {t('vocab.rulesCount', { n: String(words.length) })}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (done || !card) {
    return (
      <div style={{ minHeight: 'var(--full-h)', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="card animate-fade-up" style={{ padding: 48, textAlign: 'center', maxWidth: 420 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
            <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: '0 0 6px' }}>{t('vocab.sessionDone')}</h2>
          <p style={{ fontSize: 14, color: 'var(--text-2)', margin: '0 0 24px' }}>{t('vocab.sessionDoneSub', { n: String(reviewed) })}</p>
          <button onClick={onClose} style={{ padding: '12px 24px', borderRadius: 'var(--radius-lg)', fontSize: 14, fontWeight: 600, background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', cursor: 'pointer' }}>
            {t('vocab.backToVocab')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: 'var(--full-h)', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ padding: isMobile ? '14px 16px' : '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', gap: 16, flexWrap: 'wrap' }}>
        <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-2)', background: 'transparent', border: '1px solid var(--border-strong)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}>
          ✕ {t('vocab.exit')}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220 }}>{title}</span>
          <span style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{idx + 1} / {words.length}</span>
          <div style={{ width: 200, height: 4, background: 'var(--bg-soft)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${((idx + 1) / words.length) * 100}%`, background: 'var(--accent)', transition: 'width .3s' }}/>
          </div>
        </div>
      </header>

      {/* Card area */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 560 }} key={card.id}>
          {!flipped ? (
            <div className="card" style={{ padding: isMobile ? 28 : 64, textAlign: 'center', minHeight: isMobile ? 280 : 360, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 24 }}>
                <span className="chip" style={{ fontStyle: 'italic' }}>{card.part_of_speech}</span>
                <span className="chip chip-accent">{t('vocab.band')} {card.band_level}</span>
              </div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: isMobile ? 40 : 56, fontWeight: 500, margin: '0 0 8px', letterSpacing: '-0.02em', color: 'var(--text)', wordBreak: 'break-word' }}>
                {card.word}
              </h1>
              {card.ipa && <div style={{ fontSize: 14, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 20 }}>{card.ipa}</div>}
              <button onClick={() => setFlipped(true)} style={{
                padding: '12px 24px', borderRadius: 'var(--radius-lg)', fontSize: 14, fontWeight: 600,
                background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', cursor: 'pointer', alignSelf: 'center',
              }}>
                {t('vocab.showDef')}
              </button>
            </div>
          ) : (
            <div className="card animate-fade-in" style={{ padding: isMobile ? 22 : 36, minHeight: 360 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 30, fontWeight: 500, margin: 0, color: 'var(--accent)' }}>{card.word}</h2>
                <span className="chip" style={{ fontStyle: 'italic' }}>{card.part_of_speech}</span>
                {card.ipa && <span style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{card.ipa}</span>}
              </div>
              <p style={{ fontSize: 17, lineHeight: 1.5, marginTop: 0, marginBottom: 16, fontWeight: 500, color: 'var(--text)' }}>{card.definition}</p>
              {card.example && (
                <div style={{ padding: 14, background: 'var(--bg-soft)', borderRadius: 10, fontStyle: 'italic', fontSize: 14, lineHeight: 1.55, marginBottom: 20, color: 'var(--text-2)' }}>
                  &ldquo;{card.example}&rdquo;
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: 16, marginBottom: 28 }}>
                {[{ label: 'vocab.synonyms', words: card.synonyms }, { label: 'vocab.antonyms', words: card.antonyms }].map(g => (
                  g.words?.length ? (
                    <div key={g.label}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 8 }}>{t(g.label)}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {g.words.map(w => <span key={w} className="chip" style={{ fontSize: 11 }}>{w}</span>)}
                      </div>
                    </div>
                  ) : null
                ))}
              </div>

              <div style={{ paddingTop: 20, borderTop: '1px dashed var(--border)' }}>
                <div style={{ fontSize: 11, textAlign: 'center', color: 'var(--text-3)', marginBottom: 14 }}>{t('vocab.howWell')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(50%, 120px), 1fr))', gap: 8 }}>
                  {SRS_BUTTONS.map(b => (
                    <button key={b.key} onClick={() => grade(b.key)} style={{
                      padding: '12px 8px', borderRadius: 10, textAlign: 'center',
                      background: 'var(--bg-soft)', border: '1px solid var(--border)', cursor: 'pointer', transition: 'all .15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = `color-mix(in srgb, ${b.color} 12%, var(--bg-soft))`; e.currentTarget.style.borderColor = b.color }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-soft)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{t('vocab.' + b.key)}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{b.sub}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function VocabularyPage() {
  const { t } = useLanguage()
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [decks, setDecks] = useState<DeckWithStats[]>([])
  const [stats, setStats] = useState<VocabStats | null>(null)
  const [recent, setRecent] = useState<(VocabWord & { repetitions: number })[]>([])
  const [session, setSession] = useState<{ words: VocabWord[]; title: string } | null>(null)
  const [starting, setStarting] = useState(false)
  const [noDue, setNoDue] = useState(false)

  const load = useCallback(async (uid: string | null) => {
    const [d, s, r] = await Promise.all([
      getDecksWithStats(uid),
      getStats(uid),
      getRecentlyLearned(uid),
    ])
    setDecks(d); setStats(s); setRecent(r); setLoading(false)
  }, [])

  useEffect(() => {
    let active = true
    getUser().then(({ user }) => {
      if (!active) return
      const uid = user?.id ?? null
      setUserId(uid)
      load(uid)
    })
    return () => { active = false }
  }, [load])

  async function studyDeck(deck: DeckWithStats) {
    setStarting(true); setNoDue(false)
    const words = await getStudyQueue(userId, deck.id)
    setStarting(false)
    if (words.length) setSession({ words, title: deck.title })
    else setNoDue(true)
  }

  async function startReview() {
    setStarting(true); setNoDue(false)
    const words = await getDueQueue(userId)
    setStarting(false)
    if (words.length) setSession({ words, title: t('vocab.startReview') })
    else setNoDue(true)
  }

  function endSession() {
    setSession(null)
    setLoading(true)
    load(userId)
  }

  if (session) return <FlashcardSession words={session.words} title={session.title} userId={userId} onClose={endSession} />

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 260 }}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin .8s linear infinite' }}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  const due = stats?.dueToday ?? 0
  const statCards = [
    { big: String(stats?.learned ?? 0), label: 'vocab.learned', color: 'var(--accent)', sub: t('vocab.ofTotal', { total: String(stats?.total ?? 0) }) },
    { big: String(due), label: 'vocab.dueToday', color: 'var(--warn)', sub: t('vocab.minEst', { min: String(Math.max(1, Math.round(due * 0.4))) }) },
    { big: String(stats?.learning ?? 0), label: 'vocab.inLearning', color: 'var(--info)', sub: t('vocab.inProgress') },
    { big: `${stats?.retention ?? 0}%`, label: 'vocab.retention', color: 'var(--accent)', sub: t('vocab.ofSeen') },
  ]

  return (
    <div className="hub-page">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.025em', margin: 0, color: 'var(--text)' }}>{t('vocab.title')}</h1>
          <p style={{ color: 'var(--text-2)', fontSize: 15, margin: '6px 0 0' }}>
            {stats?.learned ?? 0} {t('vocab.wordsLearned')} · {due} {t('vocab.toReview')} · {t('vocab.srsTuned')}
          </p>
        </div>
        <button onClick={startReview} disabled={starting} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 20px', borderRadius: 'var(--radius-lg)', fontWeight: 600, fontSize: 14,
          background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none',
          cursor: starting ? 'default' : 'pointer', flexShrink: 0, opacity: starting ? 0.7 : 1,
        }}>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>
          {t('vocab.startReview')} · {due} {t('vocab.due')}
        </button>
      </div>

      {noDue && (
        <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 10, fontSize: 14, color: 'var(--text-2)', background: 'var(--accent-soft)', border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)' }}>
          {t('vocab.noDue')}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(50%, 150px), 1fr))', gap: 14, marginTop: 28 }}>
        {statCards.map(s => (
          <div key={s.label} className="card" style={{ padding: 22 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.08em', color: 'var(--text-3)' }}>{t(s.label)}</div>
            <div style={{ fontSize: 38, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1, marginTop: 6, color: s.color, fontVariantNumeric: 'tabular-nums' }}>{s.big}</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Deck grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 14, marginTop: 16 }}>
        {decks.map(d => {
          const pct = d.total ? (d.learned / d.total) * 100 : 0
          return (
            <div key={d.id} className="card" style={{ padding: 22, position: 'relative', overflow: 'hidden' }}>
              <div style={{ width: 28, height: 4, background: d.color, borderRadius: 2, marginBottom: 16 }}/>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: 8 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, letterSpacing: '-0.01em', color: 'var(--text)' }}>{d.title}</h3>
                <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>{d.learned}/{d.total}</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '0 0 16px', lineHeight: 1.45 }}>{d.description}</p>
              <div style={{ height: 5, background: 'var(--bg-soft)', borderRadius: 999, overflow: 'hidden', marginBottom: 12 }}>
                <div style={{ height: '100%', width: `${pct}%`, background: d.color, borderRadius: 999 }}/>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{Math.round(pct)}% {t('vocab.complete')}</span>
                <button onClick={() => studyDeck(d)} disabled={starting} style={{
                  padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  background: 'var(--bg-soft)', color: 'var(--text)', border: '1px solid var(--border)',
                  cursor: starting ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  {t('vocab.study')}
                  <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Recently learned */}
      {recent.length > 0 && (
        <div className="card hub-card" style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>{t('vocab.recentlyLearned')}</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(50%, 130px), 1fr))', gap: 10 }}>
            {recent.map(v => (
              <div key={v.id} style={{ padding: 14, background: 'var(--bg-soft)', borderRadius: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{v.word}</span>
                  <span className="chip" style={{ fontSize: 9, fontStyle: 'italic' }}>{v.part_of_speech}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 6, lineHeight: 1.4 }}>{v.definition}</div>
                <div style={{ display: 'flex', gap: 2, marginTop: 10 }}>
                  {[1,2,3,4,5].map(n => (
                    <span key={n} style={{ flex: 1, height: 3, borderRadius: 2, background: n <= Math.min(5, v.repetitions) ? 'var(--accent)' : 'var(--border)' }}/>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
