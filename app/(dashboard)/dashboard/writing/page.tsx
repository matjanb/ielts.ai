'use client'

import { useState } from 'react'
import { BookOpen, ChevronDown, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

const SAMPLE_PROMPTS: Record<'1' | '2', string[]> = {
  '1': [
    'The chart below shows the percentage of households in owned and rented accommodation in England and Wales between 1918 and 2011. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    'The diagram below shows how solar panels convert sunlight into electricity for household use. Summarise the information by selecting and reporting the main features.',
  ],
  '2': [
    'Some people think that the best way to reduce crime is to give longer prison sentences. Others, however, believe there are better alternative ways of reducing crime. Discuss both views and give your own opinion.',
    'In many countries, the number of people choosing to live alone is increasing. Do you think this is a positive or negative development? Give reasons for your answer and include any relevant examples from your own knowledge or experience.',
  ],
}

interface FeedbackResult {
  band_score: number
  task_achievement: number
  coherence_cohesion: number
  lexical_resource: number
  grammatical_accuracy: number
  feedback: {
    overview: string
    strengths: string[]
    improvements: string[]
    rewritten_paragraph: string
  }
}

export default function WritingPage() {
  const { t } = useLanguage()
  const [taskType, setTaskType]   = useState<'1' | '2'>('2')
  const [prompt, setPrompt]       = useState(SAMPLE_PROMPTS['2'][0])
  const [content, setContent]     = useState('')
  const [loading, setLoading]     = useState(false)
  const [result, setResult]       = useState<FeedbackResult | null>(null)
  const [error, setError]         = useState('')

  const wordCount = content.trim() ? content.trim().split(/\s+/).filter(Boolean).length : 0
  const minWords  = taskType === '1' ? 150 : 250

  function handleTaskTypeChange(type: '1' | '2') {
    setTaskType(type)
    setPrompt(SAMPLE_PROMPTS[type][0])
    setResult(null)
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setResult(null)
    setLoading(true)
    try {
      const res = await fetch('/api/ai/writing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, task_type: taskType, prompt }),
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{t('dashboard.writing')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Submit your response and get AI feedback on all four IELTS writing criteria.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Task type */}
        <div className="flex gap-2">
          {(['1', '2'] as const).map(type => (
            <button
              key={type}
              type="button"
              onClick={() => handleTaskTypeChange(type)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                taskType === type
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-indigo-300 dark:hover:border-indigo-500/50'
              }`}
            >
              Task {type}
            </button>
          ))}
        </div>

        {/* Prompt selector */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Task Prompt</label>
          <div className="relative">
            <select
              value={prompt}
              onChange={e => { setPrompt(e.target.value); setResult(null) }}
              className="w-full appearance-none px-4 py-3 pr-10 rounded-xl text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
            >
              {SAMPLE_PROMPTS[taskType].map((p, i) => (
                <option key={i} value={p}>Sample prompt {i + 1}</option>
              ))}
              <option value={prompt} disabled={SAMPLE_PROMPTS[taskType].includes(prompt)}>Custom prompt</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-500 leading-relaxed">{prompt}</p>
        </div>

        {/* Response textarea */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Your Response</label>
            <span className={`text-xs tabular-nums ${wordCount >= minWords ? 'text-emerald-500' : 'text-gray-400'}`}>
              {wordCount} / {minWords} words
            </span>
          </div>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={14}
            required
            placeholder={`Write your Task ${taskType} response here…`}
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
          disabled={loading || wordCount < 50}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold btn-primary text-white disabled:opacity-60 transition-all"
        >
          {loading ? <><Loader2 size={15} className="animate-spin" /> Analysing…</> : <><BookOpen size={15} /> Get AI Feedback</>}
        </button>
      </form>

      {/* Results */}
      {result && (
        <div className="space-y-5 pt-2">
          {/* Band score overview */}
          <div className="flex items-center gap-4 p-6 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20">
            <div className="text-center shrink-0">
              <div className="text-4xl font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">{result.band_score.toFixed(1)}</div>
              <div className="text-xs text-indigo-500/70 dark:text-indigo-400/60 mt-0.5">Band Score</div>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-3">
              {[
                { label: 'Task Achievement', score: result.task_achievement },
                { label: 'Coherence & Cohesion', score: result.coherence_cohesion },
                { label: 'Lexical Resource', score: result.lexical_resource },
                { label: 'Grammatical Accuracy', score: result.grammatical_accuracy },
              ].map(({ label, score }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">{score.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Feedback */}
          <div className="p-5 rounded-2xl bg-white dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 space-y-4">
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{result.feedback.overview}</p>

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

            {result.feedback.rewritten_paragraph && (
              <div>
                <h3 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-2">Improved Opening</h3>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-800/60 rounded-xl px-4 py-3 italic">
                  {result.feedback.rewritten_paragraph}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
