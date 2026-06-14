'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { useIsMobile } from '@/lib/hooks/useIsMobile'
import type { RoastMode } from '@/app/api/ai/roast/route'

type Lang = 'en' | 'ru' | 'kz' | 'ky' | 'uz'
type Phase = 'idle' | 'recording' | 'thinking' | 'speaking'
interface Message { role: 'user' | 'assistant'; content: string }

const MODES: { id: RoastMode; emoji: string; label: Record<Lang, string> }[] = [
  { id: 'polite', emoji: '🎩', label: { en: 'Polite',     ru: 'Вежливый',     kz: 'Сыпайы',     ky: 'Сылык',     uz: 'Muloyim'   } },
  { id: 'roast',  emoji: '🔥', label: { en: 'Roast',      ru: 'Роаст',        kz: 'Роаст',      ky: 'Роаст',     uz: 'Roast'     } },
  { id: 'savage', emoji: '💀', label: { en: 'No filter',  ru: 'Без цензуры',  kz: 'Цензурасыз', ky: 'Цензурасыз',uz: 'Sensorsiz' } },
]

const PHASE_HINT: Record<Phase, Record<Lang, string>> = {
  idle:      { en: 'Hold to speak',   ru: 'Держите чтобы говорить', kz: 'Ұстап сөйлеңіз',      ky: 'Кармап сүйлөңүз',      uz: 'Ushlab gapiring'       },
  recording: { en: 'Recording…',      ru: 'Запись…',                kz: 'Жазылуда…',            ky: 'Жазылууда…',           uz: 'Yozilmoqda…'           },
  thinking:  { en: 'Thinking…',       ru: 'Думаю…',                 kz: 'Ойлап жатырмын…',     ky: 'Ойлонуп жатам…',       uz: 'O\'ylayapman…'          },
  speaking:  { en: 'Speaking…',       ru: 'Говорю…',                kz: 'Сөйлеп жатырмын…',    ky: 'Сүйлөп жатам…',        uz: 'Gapirmoqdaman…'        },
}

export default function RoastPage() {
  const { language } = useLanguage()
  const isMobile = useIsMobile()
  const lang = (language ?? 'en') as Lang

  const [mode, setMode] = useState<RoastMode>('roast')
  const [phase, setPhase] = useState<Phase>('idle')
  const [messages, setMessages] = useState<Message[]>([])
  const [error, setError] = useState('')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const messagesRef = useRef<Message[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  messagesRef.current = messages

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Cleanup on unmount
  useEffect(() => () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    audioRef.current?.pause()
  }, [])

  const stopAudio = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; audioRef.current = null }
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
      audio.onended = () => { URL.revokeObjectURL(url); audioRef.current = null; setPhase('idle') }
      audio.onerror = () => setPhase('idle')
      await audio.play()
    } catch { setPhase('idle') }
  }, [mode])

  const sendToAI = useCallback(async (userText: string) => {
    const newMessages: Message[] = [...messagesRef.current, { role: 'user', content: userText }]
    setMessages(newMessages)
    setPhase('thinking')
    setError('')

    try {
      const res = await fetch('/api/ai/roast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, mode, lang }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error')
      const reply: string = data.reply
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
      await speak(reply)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error')
      setPhase('idle')
    }
  }, [mode, lang, speak])

  const startRecording = useCallback(async () => {
    if (phase !== 'idle') return
    setError('')

    // Stop AI audio if talking
    stopAudio()

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4'

      const recorder = new MediaRecorder(stream, { mimeType })
      chunksRef.current = []
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.start(100)
      mediaRecorderRef.current = recorder
      setPhase('recording')
    } catch {
      setError(lang === 'ru' ? 'Нет доступа к микрофону. Разрешите доступ в браузере.'
        : lang === 'kz' ? 'Микрофонға қол жеткізу жоқ. Браузерде рұқсат беріңіз.'
        : lang === 'ky' ? 'Микрофонго жетүү жок. Браузерде уруксат бериңиз.'
        : lang === 'uz' ? 'Mikrofonnga ruxsat yo\'q. Brauzerda ruxsat bering.'
        : 'Microphone access denied. Please allow it in your browser.')
    }
  }, [phase, lang])

  const stopRecording = useCallback(async () => {
    if (phase !== 'recording') return
    setPhase('thinking')

    const recorder = mediaRecorderRef.current
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null

    if (!recorder) return

    const blob: Blob = await new Promise(resolve => {
      recorder.onstop = () => resolve(new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' }))
      try { recorder.stop() } catch { resolve(new Blob(chunksRef.current)) }
    })

    if (blob.size < 1000) {
      // Too short — nothing was recorded
      setPhase('idle')
      return
    }

    // Transcribe with Whisper
    try {
      const fd = new FormData()
      fd.append('audio', new File([blob], 'audio.webm', { type: blob.type }))
      const res = await fetch('/api/ai/roast/stt', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok || !data.transcript?.trim()) { setPhase('idle'); return }
      await sendToAI(data.transcript.trim())
    } catch {
      setPhase('idle')
    }
  }, [phase, sendToAI])

  // Touch/mouse hold handlers
  const handlePressStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    if (phase === 'speaking') { stopAudio(); setPhase('idle'); return }
    if (phase !== 'idle') return
    holdTimerRef.current = setTimeout(() => startRecording(), 100)
  }, [phase, startRecording])

  const handlePressEnd = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null }
    if (phase === 'recording') stopRecording()
  }, [phase, stopRecording])

  const currentMode = MODES.find(m => m.id === mode)!
  const hint = PHASE_HINT[phase][lang]

  const orbColor = phase === 'recording' ? '#ef4444'
    : phase === 'thinking' ? 'var(--warn)'
    : phase === 'speaking' ? '#a855f7'
    : 'var(--accent)'

  const orbGlow = phase === 'recording'
    ? '0 0 0 10px rgba(239,68,68,0.15), 0 0 50px rgba(239,68,68,0.3)'
    : phase === 'speaking'
    ? '0 0 0 10px rgba(168,85,247,0.15), 0 0 50px rgba(168,85,247,0.3)'
    : phase === 'thinking'
    ? '0 0 0 10px rgba(196,122,26,0.15), 0 0 50px rgba(196,122,26,0.2)'
    : '0 0 0 6px color-mix(in srgb, var(--accent) 10%, transparent)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: isMobile ? 'calc(100dvh - 56px)' : '100vh', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* Top bar */}
      <div style={{ padding: isMobile ? '12px 16px' : '14px 28px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>🔥</span>
          <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em' }}>AI Roast</span>
        </div>

        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-soft)', padding: 4, borderRadius: 12, border: '1px solid var(--border)' }}>
          {MODES.map(m => (
            <button key={m.id} onClick={() => { setMode(m.id); stopAudio(); setPhase('idle') }}
              style={{
                display: 'flex', alignItems: 'center', gap: isMobile ? 0 : 5,
                padding: isMobile ? '6px 8px' : '6px 12px', borderRadius: 8,
                fontSize: isMobile ? 15 : 13, fontWeight: 600,
                background: mode === m.id ? 'var(--bg-elev)' : 'transparent',
                color: mode === m.id ? 'var(--text)' : 'var(--text-3)',
                border: mode === m.id ? '1px solid var(--border-strong)' : '1px solid transparent',
                boxShadow: mode === m.id ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.15s', cursor: 'pointer',
              }}>
              <span>{m.emoji}</span>
              {!isMobile && <span>{m.label[lang]}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Transcript */}
      <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '16px 12px' : '24px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.length === 0 && (
          <div className="animate-fade-up" style={{ margin: 'auto', textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 14 }}>{currentMode.emoji}</div>
            <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.02em', marginBottom: 6 }}>{currentMode.label[lang]}</div>
            <div style={{ fontSize: 14, color: 'var(--text-3)' }}>
              {lang === 'ru' ? 'Зажмите кнопку микрофона и говорите'
               : lang === 'kz' ? 'Микрофон батырмасын ұстап сөйлеңіз'
               : lang === 'ky' ? 'Микрофон баскычын кармап сүйлөңүз'
               : lang === 'uz' ? 'Mikrofon tugmasini ushlab gapiring'
               : 'Hold the mic button and speak'}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: 8 }}>
            {msg.role === 'assistant' && (
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, marginTop: 2 }}>
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

        {error && (
          <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--danger)', padding: '8px 16px', background: 'color-mix(in srgb, var(--danger) 8%, transparent)', borderRadius: 10, border: '1px solid color-mix(in srgb, var(--danger) 25%, transparent)' }}>
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Mic orb */}
      <div style={{ padding: isMobile ? '20px 16px 32px' : '24px 28px 36px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, flexShrink: 0, borderTop: '1px solid var(--border)' }}>

        <button
          onMouseDown={handlePressStart}
          onMouseUp={handlePressEnd}
          onMouseLeave={handlePressEnd}
          onTouchStart={handlePressStart}
          onTouchEnd={handlePressEnd}
          disabled={phase === 'thinking'}
          style={{
            width: 80, height: 80, borderRadius: '50%', border: 'none',
            background: `radial-gradient(circle at 35% 30%, color-mix(in srgb, ${orbColor} 60%, white), ${orbColor})`,
            boxShadow: orbGlow,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: phase === 'thinking' ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s cubic-bezier(0.2, 0.7, 0.2, 1)',
            transform: phase === 'recording' ? 'scale(1.12)' : 'scale(1)',
            animation: phase === 'recording' ? 'orbBreathe 1.2s ease-in-out infinite'
              : phase === 'speaking' ? 'orbSpeak 1.15s ease-in-out infinite' : 'none',
            userSelect: 'none', WebkitUserSelect: 'none',
            touchAction: 'none',
          }}
        >
          {phase === 'thinking' ? (
            <div style={{ display: 'flex', gap: 4 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: 'white', animation: 'dotPulse 1.2s ease-in-out infinite', animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          ) : phase === 'speaking' ? (
            <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 5L6 9H2v6h4l5 4V5z"/>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
            </svg>
          ) : (
            <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="3" width="6" height="12" rx="3"/>
              <path d="M5 11a7 7 0 0 0 14 0"/>
              <path d="M12 18v3"/>
            </svg>
          )}
        </button>

        <div style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 500 }}>{hint}</div>

        {messages.length > 0 && (
          <button
            onClick={() => { stopAudio(); setMessages([]); setPhase('idle'); setError('') }}
            style={{ fontSize: 12, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            {lang === 'ru' ? '↺ Начать заново' : lang === 'kz' ? '↺ Қайта бастау' : lang === 'ky' ? '↺ Кайра баштоо' : lang === 'uz' ? '↺ Qayta boshlash' : '↺ Start over'}
          </button>
        )}
      </div>

      <style>{`
        @keyframes dotPulse {
          0%, 80%, 100% { opacity: 0.4; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
