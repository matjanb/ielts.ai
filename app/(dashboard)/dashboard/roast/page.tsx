'use client'

import { useState, useRef } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { useIsMobile } from '@/lib/hooks/useIsMobile'

const PLACEHOLDER: Record<string, string> = {
  en: 'Paste your IELTS writing, speaking transcript, or just describe your level…',
  ru: 'Вставьте ваш текст IELTS writing/speaking или опишите свой уровень…',
  kz: 'IELTS жазба/сөйлеу мәтіңізді қойыңыз немесе деңгейіңізді сипаттаңыз…',
  ky: 'IELTS жазуу/сүйлөө текстиңизди коюңуз же деңгээлиңизди сүрөттөңүз…',
  uz: 'IELTS writing/speaking matnini yoki darajangizni tavsiflab yozing…',
}

const EXAMPLE_TEXTS: Record<string, string> = {
  en: 'In my opinion, the advantages of technology is more than disadvantages. First of all, we can easily communication with peoples around the world. Also, Internet have many informations about everything. Without technology, human beings would not progressed.',
  ru: 'В мое мнение, технологии имеет больше преимуществ чем недостатки. Во-первых, мы можем легко общаться с людями по всему мире.',
  kz: 'Менің ойымша, технологияның артықшылықтары кемшіліктерінен көп болып табылады.',
  ky: 'Менин оюмча, технологиянын артыкчылыктары кемчиликтеринен кѳп.',
  uz: "Mening fikrimcha, texnologiyaning afzalliklari kamchiliklaridan ko'p.",
}

const FIRE_EMOJIS = ['🔥', '💀', '😭', '👀', '📉']

function FireIcon() {
  return (
    <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A5.5 5.5 0 0 0 14 20c2.5 0 5-2 5-5.5 0-2.7-1.5-4.5-3-6l-1.5-1.5-1 2s-1-2.5-3-4c0 0 .5 3-2 5.5A3.5 3.5 0 0 0 8.5 14.5z"/>
    </svg>
  )
}

type Lang = 'en' | 'ru' | 'kz' | 'ky' | 'uz'

export default function RoastPage() {
  const { t, language } = useLanguage()
  const isMobile = useIsMobile()
  const [text, setText] = useState('')
  const [roast, setRoast] = useState('')
  const [detectedLang, setDetectedLang] = useState<Lang | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [charCount, setCharCount] = useState(0)
  const resultRef = useRef<HTMLDivElement>(null)

  const uiLang = (language ?? 'en') as Lang

  const LABELS: Record<string, Record<Lang, string>> = {
    title: { en: 'AI Roast Me', ru: 'AI Roast Me', kz: 'AI Roast Me', ky: 'AI Roast Me', uz: 'AI Roast Me' },
    subtitle: {
      en: 'Paste your IELTS text. Get brutally honest (and funny) feedback.',
      ru: 'Вставьте свой текст IELTS. Получите честный (и смешной) разбор.',
      kz: 'IELTS мәтіңізді қойыңыз. Дөрекі шынайы (және күлкілі) пікір алыңыз.',
      ky: 'IELTS текстиңизди коюңуз. Катаал чынчыл (жана күлкүлүү) пикир алыңыз.',
      uz: "IELTS matnini yozing. Qo'pol va kulgili fikr-mulohaza oling.",
    },
    button: {
      en: 'Roast Me 🔥',
      ru: 'Прожарить меня 🔥',
      kz: 'Мені прожарить 🔥',
      ky: 'Мени прожарить 🔥',
      uz: "Meni roast qil 🔥",
    },
    tryExample: {
      en: 'Try an example',
      ru: 'Попробовать пример',
      kz: 'Мысал қолданып көру',
      ky: 'Мисал колдонуп көр',
      uz: 'Misol sinab ko\'ring',
    },
    loading: {
      en: 'Roasting your text… 🔥',
      ru: 'Прожариваем ваш текст… 🔥',
      kz: 'Мәтіңіз прожарилуда… 🔥',
      ky: 'Текстиңиз прожарилүүдө… 🔥',
      uz: 'Matnni roast qilmoqdamiz… 🔥',
    },
    detectedLabel: {
      en: 'Detected language',
      ru: 'Определён язык',
      kz: 'Анықталған тіл',
      ky: 'Аныкталган тил',
      uz: 'Aniqlangan til',
    },
  }

  const LANG_NAMES: Record<Lang, string> = {
    en: 'English', ru: 'Русский', kz: 'Қазақша', ky: 'Кыргызча', uz: "O'zbek"
  }

  const label = (k: string) => LABELS[k]?.[uiLang] ?? LABELS[k]?.en ?? k

  const handleRoast = async () => {
    if (!text.trim() || loading) return
    setLoading(true)
    setError('')
    setRoast('')
    setDetectedLang(null)

    try {
      const res = await fetch('/api/ai/roast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong')
      setRoast(data.roast)
      setDetectedLang(data.lang as Lang)
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  const handleTextChange = (v: string) => {
    if (v.length > 2000) return
    setText(v)
    setCharCount(v.length)
  }

  const handleExample = () => {
    const ex = EXAMPLE_TEXTS[uiLang] ?? EXAMPLE_TEXTS.en
    setText(ex)
    setCharCount(ex.length)
  }

  // Split roast into paragraphs for display
  const roastParagraphs = roast.split('\n').filter(l => l.trim())

  return (
    <div className="hub-page" style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* Header */}
      <div className="animate-fade-up" style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{ padding: 10, borderRadius: 14, background: 'var(--accent-soft)' }}>
            <FireIcon />
          </div>
          <h1 style={{ fontSize: isMobile ? 26 : 34, fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>
            AI Roast Me
          </h1>
        </div>
        <p style={{ color: 'var(--text-2)', fontSize: 15, margin: 0 }}>
          {label('subtitle')}
        </p>
      </div>

      {/* Input card */}
      <div className="animate-fade-up card hub-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>
            {uiLang === 'ru' ? 'Ваш текст' : uiLang === 'kz' ? 'Сіздің мәтін' : uiLang === 'ky' ? 'Сиздин текст' : uiLang === 'uz' ? 'Sizning matningiz' : 'Your text'}
          </span>
          <button
            onClick={handleExample}
            style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            {label('tryExample')}
          </button>
        </div>
        <textarea
          value={text}
          onChange={e => handleTextChange(e.target.value)}
          placeholder={PLACEHOLDER[uiLang] ?? PLACEHOLDER.en}
          rows={isMobile ? 8 : 10}
          style={{
            width: '100%',
            resize: 'vertical',
            padding: '12px 14px',
            borderRadius: 10,
            border: '1px solid var(--border-strong)',
            background: 'var(--bg)',
            color: 'var(--text)',
            fontSize: 14,
            lineHeight: 1.6,
            fontFamily: 'inherit',
            outline: 'none',
            transition: 'border-color 0.15s',
          }}
          onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
          onBlur={e => (e.target.style.borderColor = 'var(--border-strong)')}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
          <span style={{ fontSize: 12, color: charCount > 1800 ? 'var(--warn)' : 'var(--text-3)' }}>
            {charCount} / 2000
          </span>
          <button
            onClick={handleRoast}
            disabled={!text.trim() || loading}
            style={{
              padding: '11px 24px',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 700,
              background: text.trim() && !loading ? 'var(--accent)' : 'var(--bg-soft)',
              color: text.trim() && !loading ? 'var(--accent-fg)' : 'var(--text-3)',
              border: 'none',
              cursor: text.trim() && !loading ? 'pointer' : 'not-allowed',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {loading ? label('loading') : label('button')}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 10, background: 'color-mix(in srgb, var(--danger) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)', color: 'var(--danger)', fontSize: 14, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Result card */}
      {roast && (
        <div ref={resultRef} className="animate-fade-up card hub-card" style={{ marginTop: 8 }}>
          {/* Detected lang badge */}
          {detectedLang && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{label('detectedLabel')}:</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-soft)', padding: '2px 8px', borderRadius: 99 }}>
                {LANG_NAMES[detectedLang]}
              </span>
            </div>
          )}

          {/* Fire header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 26 }}>🔥</span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em' }}>The Roast</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                {FIRE_EMOJIS.join(' ')}
              </div>
            </div>
          </div>

          {/* Roast content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {roastParagraphs.map((para, i) => {
              const isLast = i === roastParagraphs.length - 1
              return (
                <div
                  key={i}
                  className="animate-fade-up"
                  style={{
                    animationDelay: `${i * 80}ms`,
                    padding: '12px 16px',
                    borderRadius: 10,
                    background: isLast ? 'var(--accent-soft)' : 'var(--bg-soft)',
                    border: `1px solid ${isLast ? 'color-mix(in srgb, var(--accent) 25%, transparent)' : 'var(--border)'}`,
                    fontSize: 14.5,
                    lineHeight: 1.65,
                    color: isLast ? 'var(--accent)' : 'var(--text)',
                    fontWeight: isLast ? 600 : 400,
                  }}
                >
                  {para}
                </div>
              )
            })}
          </div>

          {/* Share prompt */}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>📱</span>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>
              {uiLang === 'ru' ? 'Скриньте и делитесь — покажите всем свой прожар 🔥'
               : uiLang === 'kz' ? 'Скриншот алыңыз және бөлісіңіз — прожарыңызды көрсетіңіз 🔥'
               : uiLang === 'ky' ? 'Скриншот тартыңыз жана бөлүшүңүз — прожариңизди көрсөтүңүз 🔥'
               : uiLang === 'uz' ? 'Skrinshotini oling va ulashing — roastingizni ko\'rsating 🔥'
               : 'Screenshot and share — show the world your roast 🔥'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
