'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Check, GraduationCap, Briefcase } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

const TOTAL_STEPS = 8

type BgAnswers = {
  takenBefore: boolean | null
  ieltsType: 'academic' | 'general_training' | null
  targetBand: number
  estimatedBand: number | null
  examDate: string | null
  dailyStudyTime: string | null
  weakestSkills: string[]
  biggestStruggle: string | null
}

export default function DiagnosticBackgroundPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [answers, setAnswers] = useState<BgAnswers>({
    takenBefore: null,
    ieltsType: null,
    targetBand: 7,
    estimatedBand: null,
    examDate: null,
    dailyStudyTime: null,
    weakestSkills: [],
    biggestStruggle: null,
  })

  const progress = (step / TOTAL_STEPS) * 100

  function toggleSkill(skill: string) {
    setAnswers(a => ({
      ...a,
      weakestSkills: a.weakestSkills.includes(skill)
        ? a.weakestSkills.filter(s => s !== skill)
        : [...a.weakestSkills, skill],
    }))
  }

  function canProceed(): boolean {
    if (step === 1) return answers.takenBefore !== null
    if (step === 2) return answers.ieltsType !== null
    if (step === 3) return answers.targetBand > 0
    if (step === 4) return true // estimatedBand can be null (not sure)
    if (step === 5) return answers.examDate !== null
    if (step === 6) return answers.dailyStudyTime !== null
    if (step === 7) return true // skills can be empty
    if (step === 8) return answers.biggestStruggle !== null
    return true
  }

  function handleNext() {
    if (step < TOTAL_STEPS) {
      setStep(s => s + 1)
    } else {
      // Save to localStorage and go to test
      localStorage.setItem('ielts-diagnostic-background', JSON.stringify(answers))
      router.push('/diagnostic/test')
    }
  }

  const bandOptions = [4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9]
  const estimatedBandOptions = [null, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8]

  return (
    <div className="flex-1 flex flex-col">
      {/* Progress bar */}
      <div className="h-0.5 bg-gray-100 dark:bg-gray-800">
        <div
          className="h-0.5 bg-indigo-500 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">

          {/* Step dots */}
          <div className="flex items-center justify-center gap-1.5 mb-10">
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

          {/* Step counter */}
          <p className="text-center text-xs text-gray-400 dark:text-gray-600 mb-8 font-medium tracking-wide uppercase">
            {t('diagnostic.stepOf', { current: String(step), total: String(TOTAL_STEPS) })}
          </p>

          <div key={step} className="animate-step-in">

            {/* Step 1: Taken IELTS before? */}
            {step === 1 && (
              <StepCard title={t('diagnostic.q1Title')}>
                <div className="flex flex-col gap-2.5">
                  {[
                    { value: true, label: t('diagnostic.q1Yes') },
                    { value: false, label: t('diagnostic.q1No') },
                  ].map(({ value, label }) => (
                    <OptionButton
                      key={String(value)}
                      label={label}
                      selected={answers.takenBefore === value}
                      onClick={() => setAnswers(a => ({ ...a, takenBefore: value }))}
                    />
                  ))}
                </div>
              </StepCard>
            )}

            {/* Step 2: IELTS type */}
            {step === 2 && (
              <StepCard title={t('diagnostic.q2Title')}>
                <div className="flex flex-col gap-2.5">
                  <TypeCard
                    icon={GraduationCap}
                    title={t('diagnostic.q2Academic')}
                    desc={t('diagnostic.q2AcademicDesc')}
                    selected={answers.ieltsType === 'academic'}
                    onClick={() => setAnswers(a => ({ ...a, ieltsType: 'academic' }))}
                  />
                  <TypeCard
                    icon={Briefcase}
                    title={t('diagnostic.q2General')}
                    desc={t('diagnostic.q2GeneralDesc')}
                    selected={answers.ieltsType === 'general_training'}
                    onClick={() => setAnswers(a => ({ ...a, ieltsType: 'general_training' }))}
                  />
                </div>
              </StepCard>
            )}

            {/* Step 3: Target band */}
            {step === 3 && (
              <StepCard title={t('diagnostic.q3Title')}>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {bandOptions.map(band => (
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

            {/* Step 4: Estimated current band */}
            {step === 4 && (
              <StepCard title={t('diagnostic.q4Title')}>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                  <button
                    onClick={() => setAnswers(a => ({ ...a, estimatedBand: null }))}
                    className={`col-span-2 py-3.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                      answers.estimatedBand === null
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/25'
                        : 'bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400'
                    }`}
                  >
                    {t('diagnostic.q4NotSure')}
                  </button>
                  {estimatedBandOptions.slice(1).map(band => (
                    <button
                      key={band}
                      onClick={() => setAnswers(a => ({ ...a, estimatedBand: band }))}
                      className={`py-3.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                        answers.estimatedBand === band
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

            {/* Step 5: Exam date */}
            {step === 5 && (
              <StepCard title={t('diagnostic.q5Title')}>
                <div className="flex flex-col gap-2.5">
                  {[
                    { value: 'within_1_month', label: t('diagnostic.q5Opt1') },
                    { value: '1_3_months', label: t('diagnostic.q5Opt2') },
                    { value: '3_6_months', label: t('diagnostic.q5Opt3') },
                    { value: 'not_sure', label: t('diagnostic.q5Opt4') },
                  ].map(({ value, label }) => (
                    <OptionButton
                      key={value}
                      label={label}
                      selected={answers.examDate === value}
                      onClick={() => setAnswers(a => ({ ...a, examDate: value }))}
                    />
                  ))}
                </div>
              </StepCard>
            )}

            {/* Step 6: Daily study time */}
            {step === 6 && (
              <StepCard title={t('diagnostic.q6Title')}>
                <div className="flex flex-col gap-2.5">
                  {[
                    { value: '30_min', label: t('diagnostic.q6Opt1') },
                    { value: '1_hour', label: t('diagnostic.q6Opt2') },
                    { value: '2_hours', label: t('diagnostic.q6Opt3') },
                    { value: '3_plus_hours', label: t('diagnostic.q6Opt4') },
                  ].map(({ value, label }) => (
                    <OptionButton
                      key={value}
                      label={label}
                      selected={answers.dailyStudyTime === value}
                      onClick={() => setAnswers(a => ({ ...a, dailyStudyTime: value }))}
                    />
                  ))}
                </div>
              </StepCard>
            )}

            {/* Step 7: Weakest skills (multi-select) */}
            {step === 7 && (
              <StepCard title={t('diagnostic.q7Title')} subtitle={t('diagnostic.q7Subtitle')}>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { value: 'writing', label: t('diagnostic.q7Writing') },
                    { value: 'speaking', label: t('diagnostic.q7Speaking') },
                    { value: 'reading', label: t('diagnostic.q7Reading') },
                    { value: 'listening', label: t('diagnostic.q7Listening') },
                  ].map(({ value, label }) => {
                    const selected = answers.weakestSkills.includes(value)
                    return (
                      <button
                        key={value}
                        onClick={() => toggleSkill(value)}
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

            {/* Step 8: Biggest struggle */}
            {step === 8 && (
              <StepCard title={t('diagnostic.q8Title')}>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'time_management', label: t('diagnostic.q8Opt1') },
                    { value: 'vocabulary', label: t('diagnostic.q8Opt2') },
                    { value: 'grammar', label: t('diagnostic.q8Opt3') },
                    { value: 'confidence', label: t('diagnostic.q8Opt4') },
                    { value: 'understanding_questions', label: t('diagnostic.q8Opt5') },
                    { value: 'writing_structure', label: t('diagnostic.q8Opt6') },
                    { value: 'fluency', label: t('diagnostic.q8Opt7') },
                    { value: 'other', label: t('diagnostic.q8Opt8') },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setAnswers(a => ({ ...a, biggestStruggle: value }))}
                      className={`px-4 py-3.5 rounded-2xl border text-sm font-medium text-center transition-all duration-150 ${
                        answers.biggestStruggle === value
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                          : 'border-gray-200 dark:border-gray-700/80 bg-gray-50/50 dark:bg-gray-800/40 text-gray-700 dark:text-gray-300 hover:border-indigo-300 dark:hover:border-indigo-500/40'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </StepCard>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-10">
            <button
              onClick={() => step === 1 ? router.push('/diagnostic/start') : setStep(s => s - 1)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              <ChevronLeft size={15} strokeWidth={2} />
              {t('diagnostic.back')}
            </button>

            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold btn-primary text-white disabled:opacity-40 disabled:pointer-events-none"
            >
              {step < TOTAL_STEPS ? t('diagnostic.next') : t('diagnostic.startCta')}
              <ChevronRight size={15} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function StepCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white text-center mb-2 tracking-tight leading-snug">
        {title}
      </h2>
      {subtitle && (
        <p className="text-sm text-gray-400 dark:text-gray-500 text-center mb-7">{subtitle}</p>
      )}
      {!subtitle && <div className="mb-7" />}
      {children}
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
      <div
        className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
          selected ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300 dark:border-gray-600'
        }`}
      >
        {selected && <Check size={10} strokeWidth={3} className="text-white" />}
      </div>
    </button>
  )
}

function TypeCard({
  icon: Icon,
  title,
  desc,
  selected,
  onClick,
}: {
  icon: React.ElementType
  title: string
  desc: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-start gap-4 px-5 py-4 rounded-2xl border text-left transition-all duration-150 ${
        selected
          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10'
          : 'border-gray-200 dark:border-gray-700/80 bg-gray-50/50 dark:bg-gray-800/40 hover:border-indigo-300 dark:hover:border-indigo-500/40 hover:bg-white dark:hover:bg-gray-800/60'
      }`}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
        selected ? 'bg-indigo-100 dark:bg-indigo-500/20' : 'bg-gray-100 dark:bg-gray-700'
      }`}>
        <Icon size={16} strokeWidth={2} className={selected ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'} />
      </div>
      <div className="flex-1">
        <div className={`text-sm font-semibold mb-0.5 ${selected ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-800 dark:text-gray-200'}`}>
          {title}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{desc}</div>
      </div>
      <div className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center transition-all shrink-0 mt-0.5 ${
        selected ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300 dark:border-gray-600'
      }`}>
        {selected && <Check size={10} strokeWidth={3} className="text-white" />}
      </div>
    </button>
  )
}
