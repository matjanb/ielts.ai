'use client'

import { useState, useRef, useEffect } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { useIsMobile } from '@/lib/hooks/useIsMobile'
import type { RoastMode } from '@/app/api/ai/roast/route'

type Lang = 'en' | 'ru' | 'kz' | 'ky' | 'uz'
interface Message { role: 'user' | 'assistant'; content: string }

const MODES: { id: RoastMode; emoji: string; label: Record<Lang, string>; desc: Record<Lang, string> }[] = [
  {
    id: 'polite',
    emoji: '🎩',
    label: { en: 'Polite', ru: 'Вежливый', kz: 'Сыпайы', ky: 'Сылык', uz: 'Muloyim' },
    desc:  { en: 'Gentle mentor', ru: 'Добрый ментор', kz: 'Жылы ментор', ky: 'Жылуу ментор', uz: 'Mehribon mentor' },
  },
  {
    id: 'roast',
    emoji: '🔥',
    label: { en: 'Roast', ru: 'Роаст', kz: 'Роаст', ky: 'Роаст', uz: 'Roast' },
    desc:  { en: 'Savage & funny', ru: 'Жёстко и смешно', kz: 'Қатты күлкілі', ky: 'Катуу күлкүлүү', uz: 'Qattiq va kulgili' },
  },
  {
    id: 'savage',
    emoji: '💀',
    label: { en: 'Uncensored', ru: 'Без цензуры', kz: 'Цензурасыз', ky: 'Цензурасыз', uz: 'Sensorsiz' },
    desc:  { en: '18+ no filter', ru: '18+ без фильтров', kz: '18+ сүзгісіз', ky: '18+ чыпкасыз', uz: '18+ filtersiz' },
  },
]

const PLACEHOLDERS: Record<Lang, string> = {
  en: 'Write your IELTS text or just chat…',
  ru: 'Напишите ваш IELTS текст или просто поговорите…',
  kz: 'IELTS мәтіңізді жазыңыз немесе жай сөйлесіңіз…',
  ky: 'IELTS текстиңизди жазыңыз же жай маектешиңиз…',
  uz: 'IELTS matningizni yozing yoki shunchaki suhbatlashing…',
}

const STARTER: Record<Lang, string[]> = {
  en: ['Roast my IELTS writing sample', "What's my approximate band score?", 'How can I improve my vocabulary?'],
  ru: ['Прожарь мой текст IELTS', 'Какой у меня примерный балл?', 'Как улучшить словарный запас?'],
  kz: ['Менің IELTS мәтінімді прожарить', 'Менің балым қандай?', 'Сөздік қорымды қалай жақсартамын?'],
  ky: ['Менин IELTS текстимди прожарить', 'Менин баллым кандай?', 'Лексикамды кантип жакшыртам?'],
  uz: ["IELTS matnimni roast qil", "Taxminiy ballim qancha?", "Lug'atimni qanday yaxshilayman?"],
}

export default function RoastPage() {
  const { language } = useLanguage()

  const isMobile = useIsMobile()
  const lang = (language ?? 'en') as Lang

  const [mode, setMode] = useState<RoastMode>('roast')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [detectedLang, setDetectedLang] = useState<Lang | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || loading) return

    const newMessages: Message[] = [...messages, { role: 'user', content }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai/roast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, mode, lang: detectedLang ?? undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error')
      if (data.lang && !detectedLang) setDetectedLang(data.lang as Lang)
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch (e: unknown) {
      setMessages(prev => [...prev, { role: 'assistant', content: e instanceof Error ? e.message : 'Error' }])
    } finally {
      setLoading(false)
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
  }

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const currentMode = MODES.find(m => m.id === mode)!

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: isMobile ? 'calc(100dvh - 56px)' : 'calc(100vh - 0px)', overflow: 'hidden' }}>

      {/* Top bar */}
      <div style={{ padding: isMobile ? '12px 16px' : '14px 28px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: 'var(--bg)', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 24 }}>🔥</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: isMobile ? 15 : 17, letterSpacing: '-0.02em' }}>AI Roast Me</div>
            {detectedLang && (
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                {{ en: 'English', ru: 'Русский', kz: 'Қазақша', ky: 'Кыргызча', uz: "O'zbek" }[detectedLang]}
              </div>
            )}
          </div>
        </div>

        {/* Mode selector */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-soft)', padding: 4, borderRadius: 12, border: '1px solid var(--border)' }}>
          {MODES.map(m => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              title={m.desc[lang]}
              style={{
                display: 'flex', alignItems: 'center', gap: isMobile ? 0 : 5,
                padding: isMobile ? '6px 8px' : '6px 12px',
                borderRadius: 8, fontSize: isMobile ? 15 : 13, fontWeight: 600,
                background: mode === m.id ? 'var(--bg-elev)' : 'transparent',
                color: mode === m.id ? 'var(--text)' : 'var(--text-3)',
                border: mode === m.id ? '1px solid var(--border-strong)' : '1px solid transparent',
                boxShadow: mode === m.id ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.15s',
                cursor: 'pointer',
              }}
            >
              <span>{m.emoji}</span>
              {!isMobile && <span>{m.label[lang]}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '16px 12px' : '24px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {messages.length === 0 && (
          <div className="animate-fade-up" style={{ margin: 'auto', textAlign: 'center', maxWidth: 420 }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>{currentMode.emoji}</div>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 6, letterSpacing: '-0.02em' }}>
              {currentMode.label[lang]} {lang === 'ru' ? 'режим' : lang === 'kz' ? 'режим' : lang === 'ky' ? 'режим' : lang === 'uz' ? 'rejim' : 'mode'}
            </div>
            <div style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 24 }}>
              {currentMode.desc[lang]}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {STARTER[lang].map((s, i) => (
                <button
                  key={i}
                  onClick={() => send(s)}
                  style={{
                    padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 500,
                    border: '1px solid var(--border-strong)', background: 'var(--bg-elev)',
                    color: 'var(--text)', cursor: 'pointer', textAlign: 'left',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-soft)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-elev)')}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {msg.role === 'assistant' && (
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0, marginRight: 8, marginTop: 2 }}>
                {currentMode.emoji}
              </div>
            )}
            <div style={{
              maxWidth: '75%',
              padding: '10px 14px',
              borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              background: msg.role === 'user' ? 'var(--accent)' : 'var(--bg-elev)',
              color: msg.role === 'user' ? 'var(--accent-fg)' : 'var(--text)',
              fontSize: 14,
              lineHeight: 1.6,
              border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
              whiteSpace: 'pre-wrap',
            }}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>
              {currentMode.emoji}
            </div>
            <div style={{ padding: '10px 16px', borderRadius: '18px 18px 18px 4px', background: 'var(--bg-elev)', border: '1px solid var(--border)', display: 'flex', gap: 5, alignItems: 'center' }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--text-3)', animation: 'pulse 1.2s ease-in-out infinite', animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: isMobile ? '10px 12px 16px' : '12px 28px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg)', flexShrink: 0 }}>
        {messages.length > 0 && (
          <button
            onClick={() => { setMessages([]); setDetectedLang(null) }}
            style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            {lang === 'ru' ? '↺ Новый чат' : lang === 'kz' ? '↺ Жаңа чат' : lang === 'ky' ? '↺ Жаңы чат' : lang === 'uz' ? '↺ Yangi chat' : '↺ New chat'}
          </button>
        )}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={PLACEHOLDERS[lang]}
            rows={1}
            style={{
              flex: 1, resize: 'none', padding: '11px 14px',
              borderRadius: 12, border: '1px solid var(--border-strong)',
              background: 'var(--bg-elev)', color: 'var(--text)',
              fontSize: 14, lineHeight: 1.5, fontFamily: 'inherit',
              outline: 'none', transition: 'border-color 0.15s',
              maxHeight: 120, overflowY: 'auto',
            }}
            onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border-strong)')}
            onInput={e => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = Math.min(el.scrollHeight, 120) + 'px'
            }}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            style={{
              width: 42, height: 42, borderRadius: 12, flexShrink: 0,
              background: input.trim() && !loading ? 'var(--accent)' : 'var(--bg-soft)',
              border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s',
            }}
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={input.trim() && !loading ? 'var(--accent-fg)' : 'var(--text-3)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/>
            </svg>
          </button>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6, textAlign: 'center' }}>
          Enter {lang === 'ru' ? 'для отправки' : lang === 'kz' ? 'жіберу үшін' : lang === 'ky' ? 'жиберүү үчүн' : lang === 'uz' ? 'yuborish uchun' : 'to send'} · Shift+Enter {lang === 'ru' ? 'новая строка' : lang === 'kz' ? 'жаңа жол' : lang === 'ky' ? 'жаңы сап' : lang === 'uz' ? 'yangi qator' : 'new line'}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
