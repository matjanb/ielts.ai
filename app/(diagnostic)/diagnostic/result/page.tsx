'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  TrendingUp, Users, CheckCircle2, AlertCircle, ArrowRight,
  BookOpen, Mic, FileText, Headphones, Calendar, Zap, Star,
} from 'lucide-react'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'

interface BgAnswers {
  takenBefore: boolean | null
  ieltsType: string | null
  targetBand: number
  estimatedBand: number | null
  examDate: string | null
  dailyStudyTime: string | null
  weakestSkills: string[]
  biggestStruggle: string | null
}

interface TestResult {
  rawScore: number
  band: number
  sectionScores: {
    vocab_grammar: number
    reading: number
    listening: number
    speaking: number
  }
  speakingBand: number | null
  completedAt: string
}

interface SpeakingData {
  band: number
  fluency: number
  vocabulary: number
  grammar: number
  coherence: number
  overview: string
  transcript: string
  strengths: string[]
  improvements: string[]
}

const SKILL_ICONS: Record<string, React.ElementType> = {
  writing: BookOpen,
  speaking: Mic,
  reading: FileText,
  listening: Headphones,
}

const SKILL_COLORS: Record<string, string> = {
  writing: 'text-violet-500 bg-violet-50 dark:bg-violet-500/10',
  speaking: 'text-blue-500 bg-blue-50 dark:bg-blue-500/10',
  reading: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10',
  listening: 'text-rose-500 bg-rose-50 dark:bg-rose-500/10',
  vocab_grammar: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10',
}

function bandColor(band: number): string {
  if (band >= 7) return 'text-emerald-600 dark:text-emerald-400'
  if (band >= 6) return 'text-indigo-600 dark:text-indigo-400'
  if (band >= 5) return 'text-amber-600 dark:text-amber-400'
  return 'text-rose-600 dark:text-rose-400'
}

function bandRingColor(band: number): string {
  if (band >= 7) return 'border-emerald-400/60 dark:border-emerald-500/40'
  if (band >= 6) return 'border-indigo-400/60 dark:border-indigo-500/40'
  if (band >= 5) return 'border-amber-400/60 dark:border-amber-500/40'
  return 'border-rose-400/60 dark:border-rose-500/40'
}

function generatePlan(bg: BgAnswers | null, test: TestResult | null) {
  const band = test?.band ?? 5.0
  const target = bg?.targetBand ?? 7.0
  const gap = Math.max(0, target - band)
  const weakSkills = bg?.weakestSkills ?? []

  const weeks = bg?.examDate === 'within_1_month' ? 4
    : bg?.examDate === '1_3_months' ? 10
    : bg?.examDate === '3_6_months' ? 20
    : 12

  const dailyMins = bg?.dailyStudyTime === '30_min' ? 30
    : bg?.dailyStudyTime === '1_hour' ? 60
    : bg?.dailyStudyTime === '2_hours' ? 120
    : 180

  // Determine strengths and weaknesses from test section scores
  const sectionScores = test?.sectionScores
  const strengths: string[] = []
  const weaknesses: string[] = [...weakSkills]

  if (sectionScores) {
    if (sectionScores.reading >= 2) strengths.push('reading')
    else if (!weaknesses.includes('reading')) weaknesses.push('reading')

    if (sectionScores.listening >= 1) strengths.push('listening')
    else if (!weaknesses.includes('listening')) weaknesses.push('listening')

    if (sectionScores.vocab_grammar >= 2) strengths.push('writing')
    else if (!weaknesses.includes('writing')) weaknesses.push('writing')

    if (sectionScores.speaking >= 1) strengths.push('speaking')
    else if (!weaknesses.includes('speaking')) weaknesses.push('speaking')
  }

  // Deduplicate
  const uniqueWeaknesses = [...new Set(weaknesses)].slice(0, 3)
  const uniqueStrengths = [...new Set(strengths.filter(s => !uniqueWeaknesses.includes(s)))].slice(0, 2)

  return { band, target, gap, weeks, dailyMins, strengths: uniqueStrengths, weaknesses: uniqueWeaknesses }
}

function weeklyPlanItems(plan: ReturnType<typeof generatePlan>, t: (key: string) => string) {
  const { weaknesses, dailyMins } = plan
  const primary = weaknesses[0] ?? 'writing'
  const secondary = weaknesses[1] ?? 'reading'

  return [
    {
      day: 'Mon & Thu',
      activity: `${primary.charAt(0).toUpperCase() + primary.slice(1)} deep-dive (AI feedback)`,
      duration: `${Math.min(dailyMins, 60)} min`,
      icon: SKILL_ICONS[primary] ?? BookOpen,
      color: SKILL_COLORS[primary] ?? 'text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10',
    },
    {
      day: 'Tue & Fri',
      activity: `${secondary.charAt(0).toUpperCase() + secondary.slice(1)} practice + vocabulary`,
      duration: `${Math.min(dailyMins, 45)} min`,
      icon: SKILL_ICONS[secondary] ?? FileText,
      color: SKILL_COLORS[secondary] ?? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10',
    },
    {
      day: 'Wed',
      activity: 'Full mock test section + review',
      duration: `${Math.min(dailyMins, 90)} min`,
      icon: TrendingUp,
      color: 'text-violet-500 bg-violet-50 dark:bg-violet-500/10',
    },
    {
      day: 'Sat',
      activity: 'Speaking practice + pronunciation drills',
      duration: `${Math.min(dailyMins, 45)} min`,
      icon: Mic,
      color: 'text-blue-500 bg-blue-50 dark:bg-blue-500/10',
    },
    {
      day: 'Sun',
      activity: 'Progress review + weak areas focus',
      duration: `${Math.min(dailyMins, 30)} min`,
      icon: Star,
      color: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10',
    },
  ]
}

export default function DiagnosticResultPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const [bg, setBg] = useState<BgAnswers | null>(null)
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [speakingData, setSpeakingData] = useState<SpeakingData | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const bgRaw = localStorage.getItem('ielts-diagnostic-background')
      const testRaw = localStorage.getItem('ielts-diagnostic-test')
      const speakRaw = localStorage.getItem('ielts-diagnostic-speaking')
      if (bgRaw) setBg(JSON.parse(bgRaw))
      if (testRaw) setTestResult(JSON.parse(testRaw))
      if (speakRaw) setSpeakingData(JSON.parse(speakRaw))
    } catch {
      // ignore
    }
  }, [])

  // Redirect if no test data (e.g. direct navigation)
  useEffect(() => {
    if (mounted && !testResult) {
      router.replace('/diagnostic/start')
    }
  }, [mounted, testResult, router])

  if (!mounted || !testResult) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  const plan = generatePlan(bg, testResult)
  const { band, target, gap, weeks, strengths, weaknesses } = plan
  const weeklyItems = weeklyPlanItems(plan, t)

  const stats = [
    {
      value: t('diagnostic.stat1Value'),
      label: t('diagnostic.stat1Label'),
      subtext: t('diagnostic.stat1Subtext'),
      icon: Users,
      color: 'text-indigo-500',
      bg: 'bg-indigo-50 dark:bg-indigo-500/10',
    },
    {
      value: t('diagnostic.stat2Value'),
      label: t('diagnostic.stat2Label'),
      subtext: t('diagnostic.stat2Subtext'),
      icon: TrendingUp,
      color: 'text-emerald-500',
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    },
    {
      value: t('diagnostic.stat3Value'),
      label: t('diagnostic.stat3Label'),
      subtext: t('diagnostic.stat3Subtext'),
      icon: CheckCircle2,
      color: 'text-violet-500',
      bg: 'bg-violet-50 dark:bg-violet-500/10',
    },
  ]

  const allSkills = ['writing', 'speaking', 'reading', 'listening']
  const displayStrengths = strengths.length > 0 ? strengths : allSkills.filter(s => !weaknesses.includes(s)).slice(0, 2)
  const displayWeaknesses = weaknesses.length > 0 ? weaknesses : allSkills.slice(0, 2)

  return (
    <div className="flex-1 px-4 py-10">
      <div className="max-w-2xl mx-auto space-y-10">

        {/* Page title */}
        <div className="text-center animate-fade-in-up">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
            {t('diagnostic.resultTitle')}
          </h1>
        </div>

        {/* ── Social proof stats ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in-up delay-100">
          {stats.map(({ value, label, subtext, icon: Icon, color, bg: bgColor }, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 text-center hover:shadow-md hover:shadow-black/4 transition-all duration-200"
            >
              <div className={`w-10 h-10 rounded-xl ${bgColor} flex items-center justify-center mx-auto mb-3`}>
                <Icon size={18} strokeWidth={2} className={color} />
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mb-0.5">{value}</div>
              <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">{label}</div>
              <div className="text-xs text-gray-400 dark:text-gray-500 leading-snug">{subtext}</div>
            </div>
          ))}
        </div>

        {/* ── Estimated band ── */}
        <div className="animate-fade-in-up delay-200">
          <div className={`bg-white dark:bg-gray-900/50 border-2 ${bandRingColor(band)} rounded-3xl p-8 text-center`}>
            <p className="text-xs font-semibold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest mb-4">
              {t('diagnostic.resultBandLabel')}
            </p>
            <div className={`text-7xl sm:text-8xl font-bold mb-2 ${bandColor(band)}`}>
              {band.toFixed(1)}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {gap > 0
                ? `${gap.toFixed(1)} bands below your target of ${target}`
                : `You're at or above your target band of ${target}!`}
            </p>

            {/* Section breakdown */}
            <div className="grid grid-cols-4 gap-3 max-w-sm mx-auto">
              {[
                { label: 'Vocab', score: testResult.sectionScores.vocab_grammar, max: 3, color: 'bg-amber-400' },
                { label: 'Reading', score: testResult.sectionScores.reading, max: 3, color: 'bg-emerald-500' },
                { label: 'Listening', score: testResult.sectionScores.listening, max: 1, color: 'bg-blue-500' },
                { label: 'Speaking', score: testResult.sectionScores.speaking, max: 1, color: 'bg-violet-500' },
              ].map(({ label, score, max, color }) => (
                <div key={label} className="text-center">
                  <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 mb-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full ${color} transition-all duration-700`}
                      style={{ width: `${(score / max) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Speaking Analysis (if completed) ── */}
        {speakingData && (
          <div className="bg-white dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 animate-fade-in-up delay-250">
            <div className="flex items-center gap-2 mb-4">
              <Mic size={15} strokeWidth={2} className="text-blue-500" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Speaking Assessment</h3>
              <span className="ml-auto text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-full">
                Band {speakingData.band.toFixed(1)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                { label: 'Fluency', val: speakingData.fluency },
                { label: 'Vocabulary', val: speakingData.vocabulary },
                { label: 'Grammar', val: speakingData.grammar },
                { label: 'Coherence', val: speakingData.coherence },
              ].map(({ label, val }) => (
                <div key={label} className="bg-gray-50 dark:bg-gray-800/40 rounded-xl p-3 text-center">
                  <div className="text-base font-bold text-gray-800 dark:text-gray-200">{val.toFixed(1)}</div>
                  <div className="text-[11px] text-gray-400 dark:text-gray-500">{label}</div>
                </div>
              ))}
            </div>

            {speakingData.overview && (
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{speakingData.overview}</p>
            )}
          </div>
        )}

        {/* ── Strengths & Weaknesses ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in-up delay-300">
          {/* Strengths */}
          <div className="bg-white dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 size={15} strokeWidth={2} className="text-emerald-500" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t('diagnostic.resultStrengths')}</h3>
            </div>
            <div className="space-y-2">
              {displayStrengths.length > 0 ? displayStrengths.map(skill => {
                const Icon = SKILL_ICONS[skill] ?? BookOpen
                const color = SKILL_COLORS[skill] ?? 'text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10'
                return (
                  <div key={skill} className="flex items-center gap-3 py-2">
                    <div className={`w-7 h-7 rounded-lg ${color} flex items-center justify-center`}>
                      <Icon size={13} strokeWidth={2} />
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{skill}</span>
                  </div>
                )
              }) : (
                <p className="text-sm text-gray-400 dark:text-gray-500">Keep practising to discover your strengths!</p>
              )}
            </div>
          </div>

          {/* Weaknesses */}
          <div className="bg-white dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle size={15} strokeWidth={2} className="text-amber-500" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t('diagnostic.resultWeaknesses')}</h3>
            </div>
            <div className="space-y-2">
              {displayWeaknesses.map(skill => {
                const Icon = SKILL_ICONS[skill] ?? BookOpen
                const color = SKILL_COLORS[skill] ?? 'text-amber-500 bg-amber-50 dark:bg-amber-500/10'
                return (
                  <div key={skill} className="flex items-center gap-3 py-2">
                    <div className={`w-7 h-7 rounded-lg ${color} flex items-center justify-center`}>
                      <Icon size={13} strokeWidth={2} />
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{skill}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── AI Study Plan ── */}
        <div className="bg-white dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 animate-fade-in-up delay-400">
          <div className="flex items-center gap-2 mb-1">
            <Zap size={15} strokeWidth={2} className="text-indigo-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t('diagnostic.resultPlanTitle')}</h3>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-5">{t('diagnostic.resultPlanSubtitle')}</p>

          {/* Key metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            <div className="bg-indigo-50 dark:bg-indigo-500/8 rounded-xl p-3.5 text-center">
              <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{weeks}</div>
              <div className="text-[11px] text-indigo-500/80 dark:text-indigo-400/60 mt-0.5">week plan</div>
            </div>
            <div className="bg-violet-50 dark:bg-violet-500/8 rounded-xl p-3.5 text-center">
              <div className="text-lg font-bold text-violet-600 dark:text-violet-400">{plan.dailyMins} min</div>
              <div className="text-[11px] text-violet-500/80 dark:text-violet-400/60 mt-0.5">daily practice</div>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-500/8 rounded-xl p-3.5 text-center col-span-2 sm:col-span-1">
              <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">+{gap > 0 ? gap.toFixed(1) : '0'}</div>
              <div className="text-[11px] text-emerald-500/80 dark:text-emerald-400/60 mt-0.5">bands target</div>
            </div>
          </div>

          {/* Focus areas */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Priority Focus Areas
            </p>
            {displayWeaknesses.map((skill, i) => (
              <div key={skill} className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                <div className="text-xs font-bold text-indigo-500 w-5 text-center">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200 capitalize">{skill}</span>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {i === 0 ? 'Primary focus — 40% of your study time' : i === 1 ? 'Secondary focus — 30% of your study time' : 'Supporting practice — 30% of your study time'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Weekly structure ── */}
        <div className="bg-white dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 animate-fade-in-up delay-500">
          <div className="flex items-center gap-2 mb-5">
            <Calendar size={15} strokeWidth={2} className="text-indigo-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t('diagnostic.resultWeeklyTitle')}</h3>
          </div>
          <div className="space-y-2">
            {weeklyItems.map(({ day, activity, duration, icon: Icon, color }) => (
              <div key={day} className="flex items-center gap-3 py-2.5 border-b border-gray-50 dark:border-gray-800/80 last:border-0">
                <div className={`w-8 h-8 rounded-xl ${color} flex items-center justify-center shrink-0`}>
                  <Icon size={14} strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold text-gray-400 dark:text-gray-600 block mb-0.5">{day}</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{activity}</span>
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{duration}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Account creation CTA ── */}
        <div className="animate-fade-in-up delay-600">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 p-8 text-center">
            {/* Decorative circles */}
            <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
            <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full bg-white/5" />

            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center mx-auto mb-4">
                <Zap size={22} strokeWidth={2} className="text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                {t('diagnostic.resultCreateAccount')}
              </h2>
              <p className="text-sm text-indigo-200 mb-8 max-w-sm mx-auto leading-relaxed">
                {t('diagnostic.resultCreateAccountSub')}
              </p>

              <Link
                href="/signup"
                className="inline-flex items-center gap-2.5 bg-white hover:bg-gray-50 text-indigo-700 font-semibold px-8 py-3.5 rounded-2xl text-sm transition-all duration-200 hover:shadow-lg hover:shadow-white/20 mb-4"
              >
                {t('diagnostic.resultSignup')}
                <ArrowRight size={16} strokeWidth={2.5} />
              </Link>

              <p className="text-sm text-indigo-200">
                {t('diagnostic.resultLogin')}{' '}
                <Link href="/login" className="text-white font-medium hover:underline">
                  {t('diagnostic.resultLoginLink')}
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Bottom spacing */}
        <div className="h-4" />
      </div>
    </div>
  )
}
