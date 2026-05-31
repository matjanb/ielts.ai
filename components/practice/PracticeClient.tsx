'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { getUser } from '@/lib/services/auth'
import { logStudySession } from '@/lib/services/attempts'
import { isAnswerCorrect } from '@/lib/utils/answerChecking'
import {
  getPracticeFilters, getPracticeSet, questionTypeLabel,
  type PracticeFilters, type PracticeGroup, type Difficulty,
} from '@/lib/services/tests'
import { QuestionRenderer } from './QuestionRenderer'

const DIFFS: Difficulty[] = ['easy', 'medium', 'hard']
const COUNTS = [10, 20, 9999] as const
const COUNT_LABELS: Record<number, string> = { 10: '10', 20: '20', 9999: 'All' }

type Step = 'config' | 'run' | 'done'

function PassageBlock({ text }: { text: string }) {
  const lines = text.replace(/\\n/g, '\n').split('\n').map(l => l.trim()).filter(Boolean)
  return (
    <div style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-2)', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {lines.map((l, i) => <p key={i} style={{ margin: 0, fontWeight: i === 0 ? 700 : 400, color: i === 0 ? 'var(--text)' : 'var(--text-2)' }}>{l}</p>)}
    </div>
  )
}

export function PracticeClient({ skill }: { skill: 'reading' | 'listening' }) {
  const [filters, setFilters] = useState<PracticeFilters | null>(null)
  const [type, setType] = useState<string | null>(null)
  const [difficulty, setDifficulty] = useState<Difficulty | 'any'>('any')
  const [limit, setLimit] = useState<number>(10)

  const [step, setStep] = useState<Step>('config')
  const [groups, setGroups] = useState<PracticeGroup[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    getPracticeFilters(skill).then(setFilters)
    getUser().then(({ user }) => setUserId(user?.id ?? null))
  }, [skill])

  // difficulty levels that actually exist for the chosen type
  const availDiffs = useMemo<Difficulty[]>(() => {
    if (!filters || !type) return []
    const m = filters.countByTypeDifficulty[type] ?? {}
    return DIFFS.filter(d => (m[d] ?? 0) > 0)
  }, [filters, type])

  const allQuestions = useMemo(() => groups.flatMap(g => g.questions), [groups])
  const score = useMemo(
    () => allQuestions.filter(q => isAnswerCorrect(answers[q.id] ?? '', q.correct_answer ?? '')).length,
    [allQuestions, answers],
  )

  async function start() {
    if (!type) return
    setLoading(true)
    const set = await getPracticeSet({ skill, questionType: type, difficulty, limit })
    setGroups(set)
    setAnswers({})
    setStep('run')
    setLoading(false)
    window.scrollTo({ top: 0 })
  }

  function finish() {
    setStep('done')
    if (userId) {
      const minutes = Math.max(1, Math.round(allQuestions.length * 0.75))
      logStudySession(userId, skill, minutes, 'drill').catch(() => {})
    }
    window.scrollTo({ top: 0 })
  }

  function reset() {
    setStep('config'); setGroups([]); setAnswers({})
  }

  const skillLabel = skill === 'reading' ? 'Reading' : 'Listening'
  const revealed = step === 'done'

  /* ── Config ─────────────────────────────────────────────────── */
  if (step === 'config') {
    return (
      <div style={{ padding: '32px 32px 80px', maxWidth: 760 }}>
        <Link href={`/${skill}`} style={{ fontSize: 13, color: 'var(--text-3)', textDecoration: 'none' }}>← {skillLabel}</Link>
        <h1 style={{ margin: '10px 0 4px', fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>Targeted practice</h1>
        <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--text-3)' }}>
          Drill a single {skillLabel.toLowerCase()} question type at the difficulty you choose.
        </p>

        <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 22 }}>
          {/* Question type */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 10 }}>Question type</div>
            {!filters ? (
              <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Loading…</div>
            ) : filters.types.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text-3)' }}>No questions available yet.</div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {filters.types.map(t => {
                  const active = type === t.type
                  return (
                    <button key={t.type} onClick={() => { setType(t.type); setDifficulty('any') }} style={{
                      padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      background: active ? 'var(--accent-soft)' : 'var(--bg-soft)',
                      color: active ? 'var(--accent)' : 'var(--text-2)',
                      border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                    }}>
                      {t.label} <span style={{ opacity: 0.6, fontWeight: 500 }}>· {t.count}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Difficulty */}
          {type && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 10 }}>Difficulty</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['any', ...availDiffs] as const).map(d => {
                  const active = difficulty === d
                  const count = d === 'any' ? null : filters?.countByTypeDifficulty[type]?.[d as Difficulty]
                  return (
                    <button key={d} onClick={() => setDifficulty(d as Difficulty | 'any')} style={{
                      padding: '7px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
                      background: active ? 'var(--accent-soft)' : 'var(--bg-soft)',
                      color: active ? 'var(--accent)' : 'var(--text-2)',
                      border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                    }}>
                      {d}{count != null && <span style={{ opacity: 0.6, fontWeight: 500 }}> · {count}</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Count */}
          {type && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 10 }}>Questions</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {COUNTS.map(c => {
                  const active = limit === c
                  return (
                    <button key={c} onClick={() => setLimit(c)} style={{
                      padding: '7px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      background: active ? 'var(--accent-soft)' : 'var(--bg-soft)',
                      color: active ? 'var(--accent)' : 'var(--text-2)',
                      border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                    }}>{COUNT_LABELS[c]}</button>
                  )
                })}
              </div>
            </div>
          )}

          <button onClick={start} disabled={!type || loading} style={{
            alignSelf: 'flex-start', padding: '10px 22px', borderRadius: 10, fontSize: 14, fontWeight: 700,
            background: !type ? 'var(--bg-soft)' : 'var(--accent)', color: !type ? 'var(--text-3)' : 'var(--accent-fg)',
            border: 'none', cursor: !type || loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1,
          }}>
            {loading ? 'Building…' : 'Start practice'}
          </button>
        </div>
      </div>
    )
  }

  /* ── Run / Done ─────────────────────────────────────────────── */
  if (groups.length === 0) {
    return (
      <div style={{ padding: 32 }}>
        <p style={{ color: 'var(--text-3)', fontSize: 14 }}>No questions matched that combination.</p>
        <button onClick={reset} style={{ marginTop: 12, padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-soft)', color: 'var(--text)', cursor: 'pointer' }}>Back</button>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px 32px 80px', maxWidth: 860, margin: '0 auto' }}>
      {/* Sticky header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-3)' }}>{skillLabel} · {type && questionTypeLabel(type)}{difficulty !== 'any' && <span style={{ textTransform: 'capitalize' }}> · {difficulty}</span>}</div>
          <h1 style={{ margin: '2px 0 0', fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>
            {revealed ? `Score: ${score} / ${allQuestions.length}` : `${allQuestions.length} questions`}
          </h1>
        </div>
        {revealed
          ? <button onClick={reset} style={{ padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700, background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', cursor: 'pointer' }}>New drill</button>
          : <button onClick={finish} style={{ padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700, background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', cursor: 'pointer' }}>Check answers</button>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {groups.map(g => (
          <div key={g.sectionId} className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 10 }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{g.title}</h3>
              {g.difficulty && <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'capitalize', padding: '2px 8px', borderRadius: 999, background: 'var(--bg-soft)', color: 'var(--text-3)' }}>{g.difficulty}</span>}
            </div>

            {skill === 'listening' && g.audioUrl && (
              <audio controls src={g.audioUrl} style={{ width: '100%', marginBottom: 14 }} />
            )}
            {skill === 'reading' && g.passage && (
              <div style={{ marginBottom: 14, padding: 14, background: 'var(--bg-soft)', borderRadius: 8, maxHeight: 260, overflow: 'auto' }}>
                <PassageBlock text={g.passage} />
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {g.questions.map(q => (
                <QuestionRenderer
                  key={q.id}
                  question={q}
                  value={answers[q.id] ?? ''}
                  onChange={v => setAnswers(a => ({ ...a, [q.id]: v }))}
                  revealed={revealed}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
