'use client'

import { useState } from 'react'
import { Mic, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

const SAMPLE_TOPICS: Record<1 | 2 | 3, string[]> = {
  1: [
    'Tell me about your hometown.',
    'Do you enjoy cooking? Why or why not?',
    'What kind of music do you like?',
  ],
  2: [
    'Describe a book you have read recently. You should say: what the book was about, why you chose to read it, what you liked or disliked about it, and explain what effect it had on you.',
    'Describe a journey that you remember well. You should say: where you went, how you travelled, who you were with, and explain why you remember it so well.',
  ],
  3: [
    'How has technology changed the way people communicate in your country?',
    'Do you think environmental problems are best solved by governments or individuals?',
  ],
}

interface FeedbackResult {
  band_score: number
  fluency_score: number
  lexical_score: number
  grammar_score: number
  pronunciation_notes: string
  feedback: {
    overview: string
    strengths: string[]
    improvements: string[]
  }
}

export default function SpeakingPage() {
  const { t } = useLanguage()
  const [part, setPart]       = useState<1 | 2 | 3>(2)
  const [topic, setTopic]     = useState(SAMPLE_TOPICS[2][0])
  const [transcript, setTranscript] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState<FeedbackResult | null>(null)
  const [error, setError]     = useState('')

  const wordCount = transcript.trim() ? transcript.trim().split(/\s+/).filter(Boolean).length : 0

  function handlePartChange(p: 1 | 2 | 3) {
    setPart(p)
    setTopic(SAMPLE_TOPICS[p][0])
    setResult(null)
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setResult(null)
    setLoading(true)
    try {
      const res = await fetch('/api/ai/speaking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, part, topic }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to get feedback.')
      } else {
        setResult(data)
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{t('dashboard.speaking')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Paste your spoken response transcript and receive AI feedback on fluency, vocabulary, grammar, and pronunciation.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Part selector */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Speaking Part</label>
          <div className="flex gap-2">
            {([1, 2, 3] as const).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => handlePartChange(p)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  part === p
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-indigo-300 dark:hover:border-indigo-500/50'
                }`}
              >
                Part {p}
              </button>
            ))}
          </div>
        </div>

        {/* Topic */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Topic / Question</label>
          <select
            value={topic}
            onChange={e => { setTopic(e.target.value); setResult(null) }}
            className="w-full px-4 py-3 rounded-xl text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
          >
            {SAMPLE_TOPICS[part].map((tp, i) => (
              <option key={i} value={tp}>{tp.length > 70 ? tp.slice(0, 70) + '…' : tp}</option>
            ))}
          </select>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-500 leading-relaxed">{topic}</p>
        </div>

        {/* Transcript */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Your Response (transcript)</label>
            <span className={`text-xs tabular-nums ${wordCount >= 20 ? 'text-emerald-500' : 'text-gray-400'}`}>
              {wordCount} words
            </span>
          </div>
          <textarea
            value={transcript}
            onChange={e => setTranscript(e.target.value)}
            rows={10}
            required
            placeholder="Type or paste your spoken response here. Minimum 20 words…"
            className="w-full px-4 py-3 rounded-xl text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all resize-none leading-7"
          />
        </div>

        {error && (
          <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-sm text-red-600 dark:text-red-400">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || wordCount < 20}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold btn-primary text-white disabled:opacity-60 transition-all"
        >
          {loading ? <><Loader2 size={15} className="animate-spin" /> Analysing…</> : <><Mic size={15} /> Get AI Feedback</>}
        </button>
      </form>

      {/* Results */}
      {result && (
        <div className="space-y-5 pt-2">
          <div className="flex items-center gap-4 p-6 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20">
            <div className="text-center shrink-0">
              <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 tabular-nums">{result.band_score.toFixed(1)}</div>
              <div className="text-xs text-blue-500/70 dark:text-blue-400/60 mt-0.5">Band Score</div>
            </div>
            <div className="flex-1 grid grid-cols-1 gap-2.5">
              {[
                { label: 'Fluency & Coherence', score: result.fluency_score },
                { label: 'Lexical Resource', score: result.lexical_score },
                { label: 'Grammatical Range', score: result.grammar_score },
              ].map(({ label, score }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">{score.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 space-y-4">
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{result.feedback.overview}</p>

            {result.pronunciation_notes && (
              <div className="px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-500/8 border border-blue-100 dark:border-blue-500/20">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1 uppercase tracking-wider">Pronunciation Notes</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{result.pronunciation_notes}</p>
              </div>
            )}

            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <CheckCircle size={13} className="text-emerald-500" />
                <h3 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Strengths</h3>
              </div>
              <ul className="space-y-1.5">
                {result.feedback.strengths.map((s, i) => (
                  <li key={i} className="text-sm text-gray-600 dark:text-gray-400 pl-4 border-l-2 border-emerald-200 dark:border-emerald-500/30">{s}</li>
                ))}
              </ul>
            </div>

            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <AlertCircle size={13} className="text-amber-500" />
                <h3 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Improvements</h3>
              </div>
              <ul className="space-y-1.5">
                {result.feedback.improvements.map((imp, i) => (
                  <li key={i} className="text-sm text-gray-600 dark:text-gray-400 pl-4 border-l-2 border-amber-200 dark:border-amber-500/30">{imp}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
