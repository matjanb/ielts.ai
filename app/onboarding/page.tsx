'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, ChevronLeft, Check } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { LanguageProvider } from '@/lib/i18n/LanguageContext'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { createClient } from '@/lib/supabase/client'
import { saveOnboardingData, generateAndSaveStudyPlan, completeOnboarding } from '@/lib/services/user'
import type { SkillType, StudyGoal, CurrentLevel, Timeline, StudyHours, ExperienceLevel } from '@/lib/types/database'
import Link from 'next/link'

const TOTAL_STEPS = 7

type Answers = {
  experience: ExperienceLevel | null
  targetBand: number
  currentLevel: CurrentLevel | null
  timeline: Timeline | null
  focusSkills: SkillType[]
  studyGoal: StudyGoal | null
  dailyHours: StudyHours | null
}

function OnboardingContent() {
  const { t } = useLanguage()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [answers, setAnswers] = useState<Answers>({
    experience: null,
    targetBand: 7,
    currentLevel: null,
    timeline: null,
    focusSkills: [],
    studyGoal: null,
    dailyHours: null,
  })

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
    })
  }, [router])

  function toggleSkill(skill: SkillType) {
    setAnswers(a => ({
      ...a,
      focusSkills: a.focusSkills.includes(skill)
        ? a.focusSkills.filter(s => s !== skill)
        : [...a.focusSkills, skill],
    }))
  }

  async function finish() {
    setSaving(true)
    const { data: { user } } = await createClient().auth.getUser()
    if (!user) return

    await saveOnboardingData(user.id, {
      experience: answers.experience,
      target_band: answers.targetBand,
      current_level: answers.currentLevel,
      timeline: answers.timeline,
      focus_skills: answers.focusSkills.length ? answers.focusSkills : ['writing', 'speaking'],
      study_goal: answers.studyGoal,
      daily_hours: answers.dailyHours,
    })

    await generateAndSaveStudyPlan(
      user.id,
      answers.targetBand,
      answers.focusSkills.length ? answers.focusSkills : ['writing', 'speaking', 'reading', 'listening'],
      answers.dailyHours ?? '1_hour',
      answers.timeline ?? 'not_sure'
    )

    await completeOnboarding(user.id)
    router.push('/dashboard')
  }

  const progress = (step / TOTAL_STEPS) * 100

  return (
    <div className="min-h-screen bg-white dark:bg-[#06060f] flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800/60">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <span className="text-white text-[10px] font-bold">i</span>
          </div>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">IELTS Camp</span>
        </Link>
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-gray-100 dark:bg-gray-800">
        <div
          className="h-0.5 bg-indigo-500 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">

          {/* Step dots */}
          <div className="flex items-center justify-center gap-1.5 mb-12">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  i + 1 === step
                    ? 'w-6 h-1.5 bg-indigo-600'
                    : i + 1 < step
                    ? 'w-1.5 h-1.5 bg-indigo-300 dark:bg-indigo-600/60'
                    : 'w-1.5 h-1.5 bg-gray-200 dark:bg-gray-700'
                }`}
              />
            ))}
          </div>

          <div key={step} className="animate-step-in">
            {step === 1 && (
              <StepCard title={t('onboarding.q1Title')}>
                {([
                  ['first_time', t('onboarding.q1Opt1')],
                  ['studied_not_taken', t('onboarding.q1Opt2')],
                  ['taken_before', t('onboarding.q1Opt3')],
                ] as [ExperienceLevel, string][]).map(([value, label]) => (
                  <OptionButton
                    key={value}
                    label={label}
                    selected={answers.experience === value}
                    onClick={() => setAnswers(a => ({ ...a, experience: value }))}
                  />
                ))}
              </StepCard>
            )}

            {step === 2 && (
              <StepCard title={t('onboarding.q2Title')}>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                  {[5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9].map(band => (
                    <button
                      key={band}
                      onClick={() => setAnswers(a => ({ ...a, targetBand: band }))}
                      className={`py-3.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                        answers.targetBand === band
                          ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/25'
                          : 'bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400'
                      }`}
                    >
                      {band}
                    </button>
                  ))}
                </div>
              </StepCard>
            )}

            {step === 3 && (
              <StepCard title={t('onboarding.q3Title')}>
                {([
                  ['beginner', t('onboarding.q3Opt1')],
                  ['intermediate', t('onboarding.q3Opt2')],
                  ['upper_intermediate', t('onboarding.q3Opt3')],
                  ['advanced', t('onboarding.q3Opt4')],
                ] as [CurrentLevel, string][]).map(([value, label]) => (
                  <OptionButton
                    key={value}
                    label={label}
                    selected={answers.currentLevel === value}
                    onClick={() => setAnswers(a => ({ ...a, currentLevel: value }))}
                  />
                ))}
              </StepCard>
            )}

            {step === 4 && (
              <StepCard title={t('onboarding.q4Title')}>
                {([
                  ['within_1_month', t('onboarding.q4Opt1')],
                  ['1_3_months', t('onboarding.q4Opt2')],
                  ['3_6_months', t('onboarding.q4Opt3')],
                  ['not_sure', t('onboarding.q4Opt4')],
                ] as [Timeline, string][]).map(([value, label]) => (
                  <OptionButton
                    key={value}
                    label={label}
                    selected={answers.timeline === value}
                    onClick={() => setAnswers(a => ({ ...a, timeline: value }))}
                  />
                ))}
              </StepCard>
            )}

            {step === 5 && (
              <StepCard title={t('onboarding.q5Title')}>
                <div className="grid grid-cols-2 gap-2.5">
                  {([
                    ['writing', t('onboarding.q5Writing')],
                    ['speaking', t('onboarding.q5Speaking')],
                    ['reading', t('onboarding.q5Reading')],
                    ['listening', t('onboarding.q5Listening')],
                  ] as [SkillType, string][]).map(([skill, label]) => {
                    const selected = answers.focusSkills.includes(skill)
                    return (
                      <button
                        key={skill}
                        onClick={() => toggleSkill(skill)}
                        className={`flex items-center justify-between px-4 py-4 rounded-2xl border text-sm font-medium transition-all duration-150 ${
                          selected
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                            : 'border-gray-200 dark:border-gray-700/80 bg-gray-50/50 dark:bg-gray-800/40 text-gray-700 dark:text-gray-300 hover:border-indigo-300 dark:hover:border-indigo-500/40'
                        }`}
                      >
                        {label}
                        {selected && <Check size={13} strokeWidth={2.5} className="text-indigo-500" />}
                      </button>
                    )
                  })}
                </div>
              </StepCard>
            )}

            {step === 6 && (
              <StepCard title={t('onboarding.q6Title')}>
                {([
                  ['university', t('onboarding.q6Opt1')],
                  ['immigration', t('onboarding.q6Opt2')],
                  ['work', t('onboarding.q6Opt3')],
                  ['personal', t('onboarding.q6Opt4')],
                ] as [StudyGoal, string][]).map(([value, label]) => (
                  <OptionButton
                    key={value}
                    label={label}
                    selected={answers.studyGoal === value}
                    onClick={() => setAnswers(a => ({ ...a, studyGoal: value }))}
                  />
                ))}
              </StepCard>
            )}

            {step === 7 && (
              <StepCard title={t('onboarding.q7Title')}>
                {([
                  ['30_min', t('onboarding.q7Opt1')],
                  ['1_hour', t('onboarding.q7Opt2')],
                  ['2_hours', t('onboarding.q7Opt3')],
                  ['3_plus_hours', t('onboarding.q7Opt4')],
                ] as [StudyHours, string][]).map(([value, label]) => (
                  <OptionButton
                    key={value}
                    label={label}
                    selected={answers.dailyHours === value}
                    onClick={() => setAnswers(a => ({ ...a, dailyHours: value }))}
                  />
                ))}
              </StepCard>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-10">
            <button
              onClick={() => setStep(s => Math.max(1, s - 1))}
              disabled={step === 1}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-400 dark:text-gray-500 disabled:opacity-0 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              <ChevronLeft size={15} strokeWidth={2} />
              {t('onboarding.back')}
            </button>

            {step < TOTAL_STEPS ? (
              <button
                onClick={() => setStep(s => s + 1)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold btn-primary text-white"
              >
                {t('onboarding.next')}
                <ChevronRight size={15} strokeWidth={2.5} />
              </button>
            ) : (
              <button
                onClick={finish}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold btn-primary text-white disabled:opacity-60"
              >
                {saving
                  ? <><span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />{' '}</>
                  : null
                }
                {t('onboarding.finish')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StepCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white text-center mb-8 tracking-tight leading-snug">
        {title}
      </h2>
      <div className="space-y-2.5">{children}</div>
    </div>
  )
}

function OptionButton({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border text-sm font-medium transition-all duration-150 ${
        selected
          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
          : 'border-gray-200 dark:border-gray-700/80 bg-gray-50/50 dark:bg-gray-800/40 text-gray-700 dark:text-gray-300 hover:border-indigo-300 dark:hover:border-indigo-500/40 hover:bg-white dark:hover:bg-gray-800/60'
      }`}
    >
      {label}
      <div className={`w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
        selected ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300 dark:border-gray-600'
      }`} style={{ width: '18px', height: '18px' }}>
        {selected && <Check size={10} strokeWidth={3} className="text-white" />}
      </div>
    </button>
  )
}

export default function OnboardingPage() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <OnboardingContent />
      </LanguageProvider>
    </ThemeProvider>
  )
}
