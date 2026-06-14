'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { useIsMobile } from '@/lib/hooks/useIsMobile'
import type { RoastMode } from '@/app/api/ai/roast/route'

type Lang = 'en' | 'ru' | 'kz' | 'ky' | 'uz'
type Phase = 'idle' | 'listening' | 'thinking' | 'speaking'
interface Message { role: 'user' | 'assistant'; content: string }

// SpeechRecognition types
interface ISpeechRecognitionEvent extends Event {
  resultIndex: number
  results: { length: number; [i: number]: { isFinal: boolean; [j: number]: { transcript: string } } }
}
interface ISpeechRecognition extends EventTarget {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number
  start(): void; stop(): void; abort(): void
  onstart: ((e: Event) => void) | null
  onend: ((e: Event) => void) | null
  onerror: ((e: Event) => void) | null
  onresult: ((e: ISpeechRecognitionEvent) => void) | null
}
declare global {
  interface Window {
    SpeechRecognition: new () => ISpeechRecognition
    webkitSpeechRecognition: new () => ISpeechRecognition
  }
}

const LANG_CODE: Record<Lang, string> = {
  en: 'en-US', ru: 'ru-RU', kz: 'kk-KZ', ky: 'ky-KG', uz: 'uz-UZ',
}

const MODES: { id: RoastMode; emoji: string; label: Record<Lang, string> }[] = [
  { id: 'polite', emoji: '🎩', label: { en: 'Polite', ru: 'Вежливый', kz: 'Сыпайы', ky: 'Сылык', uz: 'Muloyim' } },
  { id: 'roast',  emoji: '🔥', label: { en: 'Roast',  ru: 'Роаст',    kz: 'Роаст',  ky: 'Роаст',  uz: 'Roast'   } },
  { id: 'savage', emoji: '💀', label: { en: 'No filter', ru: 'Без цензуры', kz: 'Цензурасыз', ky: 'Цензурасыз', uz: 'Sensorsiz' } },
]

const PHASE_LABEL: Record<Phase, Record<Lang, string>> = {
  idle:      { en: 'Tap to speak', ru: 'Нажмите чтобы говорить', kz: 'Сөйлеу үшін басыңыз', ky: 'Сүйлөө үчүн басыңыз', uz: 'Gapirish uchun bosing' },
  listening: { en: 'Listening…',   ru: 'Слушаю…',               kz: 'Тыңдап жатырмын…',    ky: 'Угуп жатам…',         uz: 'Eshitmoqdaman…' },
  thinking:  { en: 'Thinking…',    ru: 'Думаю…',                kz: 'Ойлап жатырмын…',     ky: 'Ойлонуп жатам…',      uz: 'O\'ylayapman…' },
  speaking:  { en: 'Speaking…',    ru: 'Говорю…',               kz: 'Сөйлеп жатырмын…',   ky: 'Сүйлөп жатам…',       uz: 'Gapirmoqdaman…' },
}

export default function RoastPage() {
  const { language } = useLanguage()
  const isMobile = useIsMobile()
  const lang = (language ?? 'en') as Lang

  const [mode, setMode] = useState<RoastMode>('roast')
  const [phase, setPhase] = useState<Phase>('idle')
  const [messages, setMessages] = useState<Message[]>([])
  const [interim, setInterim] = useState('')
  const [supported, setSupported] = useState(true)

  const recogRef = useRef<ISpeechRecognition | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const messagesRef = useRef<Message[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  messagesRef.current = messages

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition
      if (!SR) setSupported(false)
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, interim])

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }
  }

  const speak = useCallback(async (text: string) => {
    setPhase('speaking')
    stopAudio()
    try {
      const res = await fetch('/api/ai/roast/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, mode }),
      })
      if (!res.ok) throw new Error('TTS failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => {
        URL.revokeObjectURL(url)
        audioRef.current = null
        setPhase('idle')
      }
      audio.onerror = () => setPhase('idle')
      await audio.play()
    } catch {
      setPhase('idle')
    }
  }, [mode])

  const sendToAI = useCallback(async (userText: string) => {
    const newMessages: Message[] = [...messagesRef.current, { role: 'user', content: userText }]
    setMessages(newMessages)
    setPhase('thinking')

    try {
      const res = await fetch('/api/ai/roast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, mode, lang }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error')
      const reply = data.reply as string
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
      await speak(reply)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error'
      setMessages(prev => [...prev, { role: 'assistant', content: msg }])
      setPhase('idle')
    }
  }, [mode, lang, speak])

  const startListening = useCallback(() => {
    if (phase !== 'idle') {
      stopAudio()
      recogRef.current?.abort()
      recogRef.current = null
      setPhase('idle')
      setInterim('')
      return
    }

    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!SR) return

    // kk-KZ and ky-KG are rarely supported — fall back to ru-RU
    const langCode = (lang === 'kz' || lang === 'ky') ? 'ru-RU' : (LANG_CODE[lang] ?? 'en-US')

    const recog = new SR()
    recog.lang = langCode
    recog.continuous = true   // keep listening until we get a final result
    recog.interimResults = true
    recog.maxAlternatives = 1

    let gotFinal = false

    recog.onstart = () => setPhase('listening')

    recog.onresult = (e: ISpeechRecognitionEvent) => {
      let final = ''
      let inter = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) final += t
        else inter += t
      }
      setInterim(inter || final)
      if (final.trim() && !gotFinal) {
        gotFinal = true
        setInterim('')
        recog.stop()
        sendToAI(final.trim())
      }
    }

    recog.onerror = (e) => {
      console.error('SpeechRecognition error', e)
      setInterim('')
      setPhase('idle')
    }

    recog.onend = () => {
      setInterim('')
      // If we ended without a final result, go back to idle
      if (!gotFinal) setPhase('idle')
    }

    recogRef.current = recog
    try {
      recog.start()
    } catch (e) {
      console.error('SpeechRecognition start error', e)
      setPhase('idle')
    }
  }, [phase, lang, sendToAI])

  const currentMode = MODES.find(m => m.id === mode)!
  const phaseLabel = PHASE_LABEL[phase][lang]

  const orbColor = phase === 'listening' ? 'var(--accent)'
    : phase === 'thinking' ? 'var(--warn)'
    : phase === 'speaking' ? '#a855f7'
    : 'var(--border-strong)'

  const orbBg = phase === 'listening' ? 'color-mix(in srgb, var(--accent) 15%, transparent)'
    : phase === 'thinking' ? 'color-mix(in srgb, var(--warn) 15%, transparent)'
    : phase === 'speaking' ? 'color-mix(in srgb, #a855f7 15%, transparent)'
    : 'var(--bg-soft)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: isMobile ? 'calc(100dvh - 56px)' : '100vh', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* Top bar */}
      <div style={{ padding: isMobile ? '12px 16px' : '14px 28px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>🔥</span>
          <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em' }}>AI Roast Me</span>
        </div>

        {/* Mode selector */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-soft)', padding: 4, borderRadius: 12, border: '1px solid var(--border)' }}>
          {MODES.map(m => (
            <button
              key={m.id}
              onClick={() => { setMode(m.id); stopAudio(); setPhase('idle') }}
              style={{
                display: 'flex', alignItems: 'center', gap: isMobile ? 0 : 5,
                padding: isMobile ? '6px 8px' : '6px 12px',
                borderRadius: 8, fontSize: isMobile ? 15 : 13, fontWeight: 600,
                background: mode === m.id ? 'var(--bg-elev)' : 'transparent',
                color: mode === m.id ? 'var(--text)' : 'var(--text-3)',
                border: mode === m.id ? '1px solid var(--border-strong)' : '1px solid transparent',
                boxShadow: mode === m.id ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.15s', cursor: 'pointer',
              }}
            >
              <span>{m.emoji}</span>
              {!isMobile && <span>{m.label[lang]}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Transcript */}
      <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '16px 12px' : '24px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.length === 0 && phase === 'idle' && (
          <div className="animate-fade-up" style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>{currentMode.emoji}</div>
            <div style={{ fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>{currentMode.label[lang]}</div>
            <div>{lang === 'ru' ? 'Нажмите на микрофон и говорите'
               : lang === 'kz' ? 'Микрофонды басып сөйлеңіз'
               : lang === 'ky' ? 'Микрофонду басып сүйлөңүз'
               : lang === 'uz' ? 'Mikrofonni bosib gapiring'
               : 'Tap the mic and start talking'}</div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: 8 }}>
            {msg.role === 'assistant' && (
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: orbBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, marginTop: 2 }}>
                {currentMode.emoji}
              </div>
            )}
            <div style={{
              maxWidth: '78%', padding: '10px 14px',
              borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              background: msg.role === 'user' ? 'var(--accent)' : 'var(--bg-elev)',
              color: msg.role === 'user' ? 'var(--accent-fg)' : 'var(--text)',
              fontSize: 14, lineHeight: 1.6,
              border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
              whiteSpace: 'pre-wrap',
            }}>
              {msg.content}
            </div>
          </div>
        ))}

        {/* Interim transcript */}
        {interim && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ maxWidth: '78%', padding: '10px 14px', borderRadius: '18px 18px 4px 18px', background: 'color-mix(in srgb, var(--accent) 30%, transparent)', color: 'var(--accent)', fontSize: 14, lineHeight: 1.6, fontStyle: 'italic' }}>
              {interim}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Orb + controls */}
      <div style={{ padding: isMobile ? '20px 16px 32px' : '24px 28px 36px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, flexShrink: 0, borderTop: '1px solid var(--border)' }}>
        {!supported && (
          <div style={{ fontSize: 13, color: 'var(--danger)', marginBottom: 4 }}>
            {lang === 'ru' ? 'Голосовой ввод не поддерживается в этом браузере. Попробуйте Chrome.' : 'Voice not supported. Try Chrome.'}
          </div>
        )}

        {/* Mic orb */}
        <button
          onClick={startListening}
          disabled={!supported || phase === 'thinking'}
          style={{
            width: 80, height: 80, borderRadius: '50%',
            background: orbBg,
            border: `2px solid ${orbColor}`,
            boxShadow: phase !== 'idle' ? `0 0 0 8px color-mix(in srgb, ${orbColor} 15%, transparent), 0 0 40px color-mix(in srgb, ${orbColor} 30%, transparent)` : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: phase === 'thinking' ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s cubic-bezier(0.2, 0.7, 0.2, 1)',
            animation: phase === 'listening' ? 'orbBreathe 1.5s ease-in-out infinite' : phase === 'speaking' ? 'orbSpeak 1.15s ease-in-out infinite' : 'none',
          }}
        >
          {phase === 'thinking' ? (
            <div style={{ display: 'flex', gap: 4 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--warn)', animation: 'dotPulse 1.2s ease-in-out infinite', animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          ) : phase === 'speaking' ? (
            <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 5L6 9H2v6h4l5 4V5z"/>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
            </svg>
          ) : (
            <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={phase === 'listening' ? 'var(--accent)' : 'var(--text-2)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="3" width="6" height="12" rx="3"/>
              <path d="M5 11a7 7 0 0 0 14 0"/>
              <path d="M12 18v3"/>
            </svg>
          )}
        </button>

        <div style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 500 }}>{phaseLabel}</div>

        {messages.length > 0 && (
          <button
            onClick={() => { stopAudio(); setMessages([]); setPhase('idle'); setInterim('') }}
            style={{ fontSize: 12, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            {lang === 'ru' ? '↺ Начать заново' : lang === 'kz' ? '↺ Қайта бастау' : lang === 'ky' ? '↺ Кайра баштоо' : lang === 'uz' ? '↺ Qayta boshlash' : '↺ Start over'}
          </button>
        )}
      </div>

      <style>{`
        @keyframes dotPulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
