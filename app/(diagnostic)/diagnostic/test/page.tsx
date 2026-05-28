'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft, ChevronRight, Clock, BookOpen, Headphones, Mic,
  AlignLeft, CheckCircle2,
} from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

type QuestionType = 'mc' | 'tfng' | 'speaking'
type SpeakingState = 'idle' | 'requesting' | 'recording' | 'stopped' | 'analyzing' | 'done' | 'error'

interface SpeakingResult {
  transcript: string
  band: number
  fluency: number
  vocabulary: number
  grammar: number
  coherence: number
  overview: string
  strengths: string[]
  improvements: string[]
}

interface Question {
  id: number
  section: 'vocab' | 'grammar' | 'reading' | 'listening' | 'speaking'
  type: QuestionType
  sectionLabel: string
  icon: React.ElementType
  context?: string
  contextLabel?: string
  question: string
  options?: string[]
  correctAnswer?: string
}

// ── SpeakingQuestion component ──────────────────────────────────────────────

function SpeakingQuestion({
  question,
  onAnswer,
}: {
  question: string
  onAnswer: (v: string) => void
}) {
  const { t } = useLanguage()
  const [state, setState] = useState<SpeakingState>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [result, setResult] = useState<SpeakingResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const blobRef = useRef<Blob | null>(null)

  const MAX_DURATION = 90

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
  }

  useEffect(() => {
    if (state !== 'recording') return
    const id = setInterval(() => {
      setElapsed(e => {
        if (e + 1 >= MAX_DURATION) {
          stopRecording()
          return MAX_DURATION
        }
        return e + 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [state])

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(tr => tr.stop())
    }
  }, [])

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMsg(t('diagnostic.speakingErrorMic' as Parameters<typeof t>[0]))
      setState('error')
      return
    }
    setState('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/webm'

      const mr = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mr
      chunksRef.current = []

      mr.ondataavailable = ev => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data)
      }
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        blobRef.current = blob
        setAudioUrl(URL.createObjectURL(blob))
        streamRef.current?.getTracks().forEach(tr => tr.stop())
        setState('stopped')
        onAnswer('recorded')
      }
      mr.start()
      setElapsed(0)
      setState('recording')
    } catch {
      setErrorMsg(t('diagnostic.speakingErrorMic' as Parameters<typeof t>[0]))
      setState('error')
    }
  }

  function reRecord() {
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioUrl(null)
    blobRef.current = null
    setResult(null)
    setElapsed(0)
    setErrorMsg('')
    setState('idle')
    onAnswer('')
  }

  async function analyze() {
    if (!blobRef.current) return
    setState('analyzing')
    try {
      const ext = blobRef.current.type.includes('mp4') ? 'mp4' : 'webm'
      const file = new File([blobRef.current], `recording.${ext}`, { type: blobRef.current.type })
      const fd = new FormData()
      fd.append('audio', file)
      fd.append('question', question)

      const res = await fetch('/api/diagnostic/speaking', { method: 'POST', body: fd })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        setErrorMsg(data.error || t('diagnostic.speakingErrorAnalysis' as Parameters<typeof t>[0]))
        setState('stopped')
        return
      }
      const data = await res.json() as SpeakingResult
      setResult(data)
      localStorage.setItem('ielts-diagnostic-speaking', JSON.stringify(data))
      onAnswer(JSON.stringify(data))
      setState('done')
    } catch {
      setErrorMsg(t('diagnostic.speakingErrorAnalysis' as Parameters<typeof t>[0]))
      setState('stopped')
    }
  }

  function skipSpeaking() {
    onAnswer('skipped')
  }

  const pct = (elapsed / MAX_DURATION) * 100

  // ── idle / requesting ───────────────────────────────────────────────────
  if (state === 'idle' || state === 'requesting') {
    return (
      <div className="text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed max-w-xs mx-auto">
          {t('diagnostic.speakingPromptHint' as Parameters<typeof t>[0])}
        </p>

        {state === 'requesting' ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-full border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-sm text-gray-400 dark:text-gray-500">Requesting microphone…</p>
          </div>
        ) : (
          <>
            <button
              onClick={startRecording}
              className="mx-auto flex flex-col items-center gap-3 group"
            >
              <div className="w-20 h-20 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border-2 border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center group-hover:border-indigo-400 dark:group-hover:border-indigo-400/60 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/20 transition-all duration-200">
                <Mic size={28} strokeWidth={1.5} className="text-indigo-500" />
              </div>
              <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                {t('diagnostic.speakingStart' as Parameters<typeof t>[0])}
              </span>
            </button>
            <p className="mt-4 text-xs text-gray-400 dark:text-gray-600">
              {t('diagnostic.speakingMaxDuration' as Parameters<typeof t>[0])}
            </p>
            <button
              onClick={skipSpeaking}
              className="mt-6 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline underline-offset-2 transition-colors"
            >
              {t('diagnostic.speakingSkip' as Parameters<typeof t>[0])}
            </button>
          </>
        )}
      </div>
    )
  }

  // ── recording ───────────────────────────────────────────────────────────
  if (state === 'recording') {
    return (
      <div className="text-center">
        <div className="relative mx-auto w-20 h-20 mb-6">
          <span className="absolute inset-0 rounded-full bg-red-400/20 animate-ping" />
          <span className="absolute inset-3 rounded-full bg-red-400/20 animate-ping [animation-delay:300ms]" />
          <div className="relative w-20 h-20 rounded-full bg-red-50 dark:bg-red-500/10 border-2 border-red-300 dark:border-red-500/40 flex items-center justify-center">
            <Mic size={28} strokeWidth={1.5} className="text-red-500" />
          </div>
        </div>

        <p className="text-sm font-semibold text-red-500 mb-1">
          {t('diagnostic.speakingRecording' as Parameters<typeof t>[0])}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-5">
          {elapsed}s / {MAX_DURATION}s
        </p>

        <div className="w-48 mx-auto h-1 bg-gray-100 dark:bg-gray-800 rounded-full mb-6 overflow-hidden">
          <div
            className="h-1 bg-red-400 rounded-full transition-all duration-1000"
            style={{ width: `${pct}%` }}
          />
        </div>

        <button
          onClick={stopRecording}
          className="btn-primary px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
        >
          {t('diagnostic.speakingStop' as Parameters<typeof t>[0])}
        </button>
      </div>
    )
  }

  // ── stopped ─────────────────────────────────────────────────────────────
  if (state === 'stopped') {
    return (
      <div className="space-y-4">
        <div className="bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/60 rounded-2xl p-4">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-2">
            {t('diagnostic.speakingPlayback' as Parameters<typeof t>[0])}
          </p>
          {audioUrl && <audio controls src={audioUrl} className="w-full" />}
        </div>

        {errorMsg && (
          <p className="text-xs text-red-500 text-center">{errorMsg}</p>
        )}

        <p className="text-xs text-center text-gray-400 dark:text-gray-600">
          {t('diagnostic.speakingProceedTip' as Parameters<typeof t>[0])}
        </p>

        <div className="flex gap-3">
          <button
            onClick={reRecord}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
          >
            {t('diagnostic.speakingReRecord' as Parameters<typeof t>[0])}
          </button>
          <button
            onClick={analyze}
            className="flex-1 btn-primary py-2.5 rounded-xl text-sm font-semibold text-white"
          >
            {t('diagnostic.speakingAnalyze' as Parameters<typeof t>[0])}
          </button>
        </div>
      </div>
    )
  }

  // ── analyzing ───────────────────────────────────────────────────────────
  if (state === 'analyzing') {
    return (
      <div className="text-center py-8">
        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t('diagnostic.speakingAnalyzing' as Parameters<typeof t>[0])}
        </p>
      </div>
    )
  }

  // ── error ────────────────────────────────────────────────────────────────
  if (state === 'error') {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-red-500 mb-4">{errorMsg}</p>
        <button
          onClick={() => { setErrorMsg(''); setState('idle') }}
          className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          Try again
        </button>
        <div className="mt-4">
          <button
            onClick={skipSpeaking}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline underline-offset-2 transition-colors"
          >
            {t('diagnostic.speakingSkip' as Parameters<typeof t>[0])}
          </button>
        </div>
      </div>
    )
  }

  // ── done ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-2xl p-5 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <CheckCircle2 size={13} strokeWidth={2} className="text-indigo-500" />
          <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide">
            {t('diagnostic.speakingDone' as Parameters<typeof t>[0])}
          </p>
        </div>
        <p className="text-xs text-indigo-400/70 mb-3">
          {t('diagnostic.speakingBandLabel' as Parameters<typeof t>[0])}
        </p>
        <div className="text-5xl font-bold text-indigo-600 dark:text-indigo-400">
          {result!.band.toFixed(1)}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          { label: t('diagnostic.speakingScoreFluency' as Parameters<typeof t>[0]), val: result!.fluency },
          { label: t('diagnostic.speakingScoreVocab' as Parameters<typeof t>[0]), val: result!.vocabulary },
          { label: t('diagnostic.speakingScoreGrammar' as Parameters<typeof t>[0]), val: result!.grammar },
          { label: t('diagnostic.speakingScoreCoherence' as Parameters<typeof t>[0]), val: result!.coherence },
        ].map(({ label, val }) => (
          <div key={label} className="bg-gray-50 dark:bg-gray-800/40 rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-gray-800 dark:text-gray-200">{val.toFixed(1)}</div>
            <div className="text-[11px] text-gray-400 dark:text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      {result!.transcript && (
        <div className="bg-gray-50 dark:bg-gray-800/40 border border-gray-200/60 dark:border-gray-700/60 rounded-2xl p-4">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-2">
            {t('diagnostic.speakingTranscript' as Parameters<typeof t>[0])}
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed italic">
            &ldquo;{result!.transcript}&rdquo;
          </p>
        </div>
      )}

      {result!.overview && (
        <div className="card rounded-2xl p-4">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-2">
            {t('diagnostic.speakingFeedbackOverview' as Parameters<typeof t>[0])}
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{result!.overview}</p>
        </div>
      )}

      {(result!.strengths.length > 0 || result!.improvements.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {result!.strengths.length > 0 && (
            <div className="bg-emerald-50/80 dark:bg-emerald-500/8 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl p-4">
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2">
                {t('diagnostic.speakingStrengths' as Parameters<typeof t>[0])}
              </p>
              <ul className="space-y-1.5">
                {result!.strengths.map((s, i) => (
                  <li key={i} className="flex gap-2 text-xs text-emerald-700 dark:text-emerald-300">
                    <span className="shrink-0">✓</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {result!.improvements.length > 0 && (
            <div className="bg-amber-50/80 dark:bg-amber-500/8 border border-amber-100 dark:border-amber-500/20 rounded-2xl p-4">
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-2">
                {t('diagnostic.speakingImprovements' as Parameters<typeof t>[0])}
              </p>
              <ul className="space-y-1.5">
                {result!.improvements.map((s, i) => (
                  <li key={i} className="flex gap-2 text-xs text-amber-700 dark:text-amber-300">
                    <span className="shrink-0">→</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <button
        onClick={reRecord}
        className="w-full text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-center py-2 transition-colors"
      >
        {t('diagnostic.speakingReRecord' as Parameters<typeof t>[0])}
      </button>
    </div>
  )
}

// ── Questions ────────────────────────────────────────────────────────────────

const QUESTIONS: Question[] = [
  {
    id: 1,
    section: 'vocab',
    type: 'mc',
    sectionLabel: 'diagnostic.testSectionVocab',
    icon: BookOpen,
    question: 'The scientist\'s findings were ___ by independent researchers who conducted similar experiments.',
    options: ['corroborated', 'undermined', 'fabricated', 'disputed'],
    correctAnswer: 'corroborated',
  },
  {
    id: 2,
    section: 'grammar',
    type: 'mc',
    sectionLabel: 'diagnostic.testSectionGrammar',
    icon: AlignLeft,
    question: 'Each of the students ___ required to submit their assignment by Friday.',
    options: ['are', 'is', 'were', 'have been'],
    correctAnswer: 'is',
  },
  {
    id: 3,
    section: 'vocab',
    type: 'mc',
    sectionLabel: 'diagnostic.testSectionVocab',
    icon: BookOpen,
    question: 'In the sentence "The committee was inundated with complaints after the policy change," the word "inundated" means:',
    options: [
      'Overwhelmed with a large amount',
      'Satisfied with the outcome',
      'Confused by the decision',
      'Critical of the proposals',
    ],
    correctAnswer: 'Overwhelmed with a large amount',
  },
  {
    id: 4,
    section: 'reading',
    type: 'tfng',
    sectionLabel: 'diagnostic.testSectionReading',
    icon: BookOpen,
    contextLabel: 'diagnostic.testPassageLabel',
    context: 'Remote work, once considered a privilege for a select few, has transformed into a mainstream working arrangement following the global pandemic. Studies indicate that approximately 16% of companies now operate fully remotely, while 62% of workers report working remotely at least occasionally. Advocates argue that remote work enhances productivity, reduces commuting time, and improves work-life balance. Critics, however, contend that the lack of face-to-face interaction can hinder collaboration and creative problem-solving. Despite these concerns, surveys consistently show that the majority of remote workers prefer this arrangement to traditional office work.',
    question: 'Remote work was a common working arrangement before the global pandemic.',
    options: ['True', 'False', 'Not Given'],
    correctAnswer: 'False',
  },
  {
    id: 5,
    section: 'reading',
    type: 'mc',
    sectionLabel: 'diagnostic.testSectionReading',
    icon: BookOpen,
    contextLabel: 'diagnostic.testPassageLabel',
    context: 'Remote work, once considered a privilege for a select few, has transformed into a mainstream working arrangement following the global pandemic. Studies indicate that approximately 16% of companies now operate fully remotely, while 62% of workers report working remotely at least occasionally. Advocates argue that remote work enhances productivity, reduces commuting time, and improves work-life balance. Critics, however, contend that the lack of face-to-face interaction can hinder collaboration and creative problem-solving. Despite these concerns, surveys consistently show that the majority of remote workers prefer this arrangement to traditional office work.',
    question: 'According to the passage, what percentage of companies operate fully remotely?',
    options: ['62%', '16%', '38%', '50%'],
    correctAnswer: '16%',
  },
  {
    id: 6,
    section: 'reading',
    type: 'tfng',
    sectionLabel: 'diagnostic.testSectionReading',
    icon: BookOpen,
    contextLabel: 'diagnostic.testPassageLabel',
    context: 'Remote work, once considered a privilege for a select few, has transformed into a mainstream working arrangement following the global pandemic. Studies indicate that approximately 16% of companies now operate fully remotely, while 62% of workers report working remotely at least occasionally. Advocates argue that remote work enhances productivity, reduces commuting time, and improves work-life balance. Critics, however, contend that the lack of face-to-face interaction can hinder collaboration and creative problem-solving. Despite these concerns, surveys consistently show that the majority of remote workers prefer this arrangement to traditional office work.',
    question: 'The majority of remote workers prefer remote work to working in a traditional office.',
    options: ['True', 'False', 'Not Given'],
    correctAnswer: 'True',
  },
  {
    id: 7,
    section: 'listening',
    type: 'mc',
    sectionLabel: 'diagnostic.testSectionListening',
    icon: Headphones,
    contextLabel: 'diagnostic.testTranscriptLabel',
    context: 'Professor: Good morning everyone. Today we\'re discussing urban planning. One key principle that has gained significant traction in recent years is the concept of a "15-minute city" — the idea that residents should be able to access all their daily needs within a 15-minute walk or cycle from their homes. This model was popularised by Paris mayor Anne Hidalgo, who implemented it in Paris starting in 2020. The goal is to reduce car dependency, improve air quality, and create stronger local communities.',
    question: 'What does the "15-minute city" concept primarily refer to?',
    options: [
      'Cities that can be crossed in 15 minutes by car',
      'Access to daily needs within 15 minutes on foot or by bicycle',
      'A 15-minute public transport commute to work',
      'Completing all errands in under 15 minutes',
    ],
    correctAnswer: 'Access to daily needs within 15 minutes on foot or by bicycle',
  },
  {
    id: 8,
    section: 'speaking',
    type: 'speaking',
    sectionLabel: 'diagnostic.speakingLabel',
    icon: Mic,
    question: 'Tell me about a place you enjoy visiting or spending time in. Where is it, and why do you like going there?',
  },
]

type Answers = Record<number, string>

function computeScore(answers: Answers): number {
  let correct = 0
  for (const q of QUESTIONS) {
    if (q.type === 'speaking') {
      const ans = answers[q.id] || ''
      if (ans && ans !== 'skipped') correct += 1
    } else {
      if (answers[q.id] === q.correctAnswer) correct += 1
    }
  }
  return correct
}

function scoreToBand(score: number): number {
  if (score <= 1) return 4.0
  if (score <= 2) return 4.5
  if (score <= 3) return 5.0
  if (score <= 4) return 5.5
  if (score <= 5) return 6.0
  if (score <= 6) return 6.5
  if (score === 7) return 7.0
  return 7.5
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DiagnosticTestPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<Answers>({})
  const [timeLeft, setTimeLeft] = useState(10 * 60)
  const [submitted, setSubmitted] = useState(false)

  const question = QUESTIONS[currentQ]
  const isLast = currentQ === QUESTIONS.length - 1

  const submitTest = useCallback(() => {
    if (submitted) return
    setSubmitted(true)

    const rawScore = computeScore(answers)
    const band = scoreToBand(rawScore)

    const sectionScores = {
      vocab_grammar: 0,
      reading: 0,
      listening: 0,
      speaking: 0,
    }
    if (answers[1] === 'corroborated') sectionScores.vocab_grammar++
    if (answers[2] === 'is') sectionScores.vocab_grammar++
    if (answers[3] === 'Overwhelmed with a large amount') sectionScores.vocab_grammar++
    if (answers[4] === 'False') sectionScores.reading++
    if (answers[5] === '16%') sectionScores.reading++
    if (answers[6] === 'True') sectionScores.reading++
    if (answers[7] === 'Access to daily needs within 15 minutes on foot or by bicycle') sectionScores.listening++
    const speakAns = answers[8] || ''
    if (speakAns && speakAns !== 'skipped') sectionScores.speaking++

    // Extract speaking band from AI analysis if available
    let speakingBand: number | null = null
    if (speakAns && speakAns !== 'recorded' && speakAns !== 'skipped') {
      try {
        speakingBand = (JSON.parse(speakAns) as SpeakingResult).band ?? null
      } catch {
        // not JSON — was 'recorded' marker
      }
    }

    const testResult = {
      answers,
      rawScore,
      band,
      sectionScores,
      speakingBand,
      completedAt: new Date().toISOString(),
    }
    localStorage.setItem('ielts-diagnostic-test', JSON.stringify(testResult))
    router.push('/diagnostic/result')
  }, [answers, submitted, router])

  // Timer
  useEffect(() => {
    if (submitted) return
    const id = setInterval(() => {
      setTimeLeft(tl => {
        if (tl <= 1) {
          clearInterval(id)
          submitTest()
          return 0
        }
        return tl - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [submitted, submitTest])

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const timerWarning = timeLeft < 120

  function handleAnswer(value: string) {
    setAnswers(a => ({ ...a, [question.id]: value }))
  }

  function handleNext() {
    if (isLast) {
      submitTest()
    } else {
      setCurrentQ(i => i + 1)
    }
  }

  function canProceed(): boolean {
    return !!answers[question.id]
  }

  const SectionIcon = question.icon
  const sectionLabel = t(question.sectionLabel as Parameters<typeof t>[0])

  return (
    <div className="flex-1 flex flex-col">
      {/* Progress bar */}
      <div className="h-0.5 bg-gray-100 dark:bg-gray-800">
        <div
          className="h-0.5 bg-indigo-500 transition-all duration-500 ease-out"
          style={{ width: `${((currentQ + 1) / QUESTIONS.length) * 100}%` }}
        />
      </div>

      {/* Header info row */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-100 dark:border-gray-800/60">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
            <SectionIcon size={13} strokeWidth={2} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <span className="font-medium text-gray-700 dark:text-gray-300">{sectionLabel}</span>
          <span className="text-gray-400 dark:text-gray-600">·</span>
          <span className="text-gray-400 dark:text-gray-500 text-xs">
            {t('diagnostic.testProgress', { current: String(currentQ + 1), total: String(QUESTIONS.length) })}
          </span>
        </div>

        <div className={`flex items-center gap-1.5 text-sm font-mono font-semibold ${
          timerWarning ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
        }`}>
          <Clock size={13} strokeWidth={2} />
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>
      </div>

      {/* Question dots */}
      <div className="flex items-center justify-center gap-1 py-4 px-4">
        {QUESTIONS.map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-300 ${
              i === currentQ
                ? 'w-6 h-1.5 bg-indigo-600'
                : answers[QUESTIONS[i].id]
                ? 'w-1.5 h-1.5 bg-indigo-400'
                : 'w-1.5 h-1.5 bg-gray-200 dark:bg-gray-700'
            }`}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center px-4 pb-8 overflow-auto">
        <div key={question.id} className="w-full max-w-2xl animate-step-in">

          {/* Context (passage / transcript) */}
          {question.context && (
            <div className="mb-6">
              <p className="text-xs font-semibold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider mb-3">
                {t(question.contextLabel as Parameters<typeof t>[0])}
              </p>
              <div className="bg-gray-50 dark:bg-gray-900/60 border border-gray-200/60 dark:border-gray-700/60 rounded-2xl p-5">
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {question.context}
                </p>
              </div>
            </div>
          )}

          {/* Question text */}
          <div className="mb-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white leading-snug">
              {question.question}
            </h2>
          </div>

          {/* MC options */}
          {question.type === 'mc' && (
            <div className="flex flex-col gap-2.5">
              {question.options!.map(opt => (
                <button
                  key={opt}
                  onClick={() => handleAnswer(opt)}
                  className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl border text-sm font-medium text-left transition-all duration-150 ${
                    answers[question.id] === opt
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                      : 'border-gray-200 dark:border-gray-700/80 bg-gray-50/50 dark:bg-gray-800/40 text-gray-700 dark:text-gray-300 hover:border-indigo-300 dark:hover:border-indigo-500/40 hover:bg-white dark:hover:bg-gray-800/60'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                    answers[question.id] === opt
                      ? 'border-indigo-500 bg-indigo-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {answers[question.id] === opt && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                  {opt}
                </button>
              ))}
            </div>
          )}

          {/* TFNG options */}
          {question.type === 'tfng' && (
            <div className="flex gap-2.5">
              {(['True', 'False', 'Not Given'] as const).map(opt => (
                <button
                  key={opt}
                  onClick={() => handleAnswer(opt)}
                  className={`flex-1 py-4 rounded-2xl border text-sm font-semibold transition-all duration-150 ${
                    answers[question.id] === opt
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                      : 'border-gray-200 dark:border-gray-700/80 bg-gray-50/50 dark:bg-gray-800/40 text-gray-700 dark:text-gray-300 hover:border-indigo-300 dark:hover:border-indigo-500/40'
                  }`}
                >
                  {opt === 'True' && t('diagnostic.testTrue')}
                  {opt === 'False' && t('diagnostic.testFalse')}
                  {opt === 'Not Given' && t('diagnostic.testNotGiven')}
                </button>
              ))}
            </div>
          )}

          {/* Speaking */}
          {question.type === 'speaking' && (
            <SpeakingQuestion
              question={question.question}
              onAnswer={handleAnswer}
            />
          )}
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="border-t border-gray-100 dark:border-gray-800/60 px-4 sm:px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={() => currentQ > 0 && setCurrentQ(i => i - 1)}
            disabled={currentQ === 0}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-400 dark:text-gray-500 disabled:opacity-0 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <ChevronLeft size={15} strokeWidth={2} />
            {t('diagnostic.back')}
          </button>

          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold btn-primary text-white disabled:opacity-40 disabled:pointer-events-none"
          >
            {isLast ? t('diagnostic.testSubmit') : t('diagnostic.testNext')}
            {!isLast && <ChevronRight size={15} strokeWidth={2.5} />}
          </button>
        </div>
      </div>
    </div>
  )
}
