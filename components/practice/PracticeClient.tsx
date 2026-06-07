'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getUser } from '@/lib/services/auth'
import { logStudySession } from '@/lib/services/attempts'
import { isAnswerCorrect } from '@/lib/utils/answerChecking'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { questionTypeLabel, type PracticeGroup } from '@/lib/services/tests'
import { QuestionRenderer } from './QuestionRenderer'
import { MultiSelectQuestion } from './MultiSelectQuestion'
import { groupQuestions } from '@/lib/utils/multiSelect'

// Each focused drill is a fixed, fast 10-question set of one type. The type is
// chosen on the Reading/Listening hub (weak-spot list) and passed as ?type=…;
// there is no separate config screen.
const DRILL_SIZE = 10

function PassageBlock({ text }: { text: string }) {
  const lines = text.replace(/\\n/g, '\n').split('\n').map(l => l.trim()).filter(Boolean)
  return (
    <div style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-2)', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {lines.map((l, i) => <p key={i} style={{ margin: 0, fontWeight: i === 0 ? 700 : 400, color: i === 0 ? 'var(--text)' : 'var(--text-2)' }}>{l}</p>)}
    </div>
  )
}

export function PracticeClient({ skill }: { skill: 'reading' | 'listening' }) {
  const router = useRouter()
  const { t } = useLanguage()

  const [type, setType] = useState<string | null>(null)
  const [groups, setGroups] = useState<PracticeGroup[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [done, setDone] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const allQuestions = useMemo(() => groups.flatMap(g => g.questions), [groups])
  const score = useMemo(
    () => allQuestions.filter(q => isAnswerCorrect(answers[q.id] ?? '', q.correct_answer ?? '')).length,
    [allQuestions, answers],
  )

  // On load: read the type from the URL, fetch the drill, and start. With no
  // type we send the user back to the hub (where types are chosen).
  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    const wanted = new URLSearchParams(window.location.search).get('type')
    if (!wanted) { router.replace(`/${skill}`); return }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time drill init
    setType(wanted)
    getUser().then(({ user }) => setUserId(user?.id ?? null))

    ;(async () => {
      let set: PracticeGroup[] = []
      try {
        const res = await fetch('/api/practice/set', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ skill, questionType: wanted, difficulty: 'any', limit: DRILL_SIZE }),
        })
        if (res.ok) set = (await res.json()).groups ?? []
      } catch { /* leave empty → "no match" view */ }
      setGroups(set)
      setLoading(false)
      window.scrollTo({ top: 0 })
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function finish() {
    setDone(true)
    if (userId) {
      const minutes = Math.max(1, Math.round(allQuestions.length * 0.75))
      logStudySession(userId, skill, minutes, 'drill').catch(() => {})
    }
    window.scrollTo({ top: 0 })
  }

  const skillLabel = t(skill === 'reading' ? 'dashboard.reading' : 'dashboard.listening')

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, height: '60vh', color: 'var(--text-3)' }}>
        <div style={{ width: 26, height: 26, borderRadius: '50%', border: '2.5px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin .8s linear infinite' }} />
        <span style={{ fontSize: 13 }}>{t('practice.building')}</span>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  if (groups.length === 0) {
    return (
      <div style={{ padding: 32 }}>
        <p style={{ color: 'var(--text-3)', fontSize: 14 }}>{t('practice.noMatch')}</p>
        <Link href={`/${skill}`} style={{ display: 'inline-block', marginTop: 12, padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-soft)', color: 'var(--text)', textDecoration: 'none', fontSize: 13 }}>{t('practice.back')}</Link>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px 32px 80px', maxWidth: 860, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <Link href={`/${skill}`} style={{ fontSize: 13, color: 'var(--text-3)', textDecoration: 'none' }}>← {skillLabel}</Link>
          <h1 style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>
            {type && questionTypeLabel(type)} · {done ? `${t('practice.score')}: ${score} / ${allQuestions.length}` : `${allQuestions.length} ${t('practice.questionsWord')}`}
          </h1>
        </div>
        {done
          ? <Link href={`/${skill}`} style={{ padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700, background: 'var(--accent)', color: 'var(--accent-fg)', textDecoration: 'none' }}>{t('practice.newDrill')}</Link>
          : <button onClick={finish} style={{ padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700, background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', cursor: 'pointer' }}>{t('practice.checkAnswers')}</button>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {groups.map(g => (
          <div key={g.sectionId} className="card" style={{ padding: 20 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{g.title}</h3>

            {skill === 'listening' && g.audioUrl && (
              <audio controls src={g.audioUrl} style={{ width: '100%', marginBottom: 14 }} />
            )}
            {skill === 'reading' && g.passage && (
              <div style={{ marginBottom: 14, padding: 14, background: 'var(--bg-soft)', borderRadius: 8, maxHeight: 260, overflow: 'auto' }}>
                <PassageBlock text={g.passage} />
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {groupQuestions(g.questions).map(item => item.kind === 'multi' ? (
                <MultiSelectQuestion
                  key={item.questions[0].id}
                  questions={item.questions}
                  answers={answers}
                  onChange={(id, v) => setAnswers(a => ({ ...a, [id]: v }))}
                  revealed={done}
                />
              ) : (
                <QuestionRenderer
                  key={item.question.id}
                  question={item.question}
                  value={answers[item.question.id] ?? ''}
                  onChange={v => setAnswers(a => ({ ...a, [item.question.id]: v }))}
                  revealed={done}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
