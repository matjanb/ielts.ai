'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { useIsMobile } from '@/lib/hooks/useIsMobile'
import type { RoastMode } from '@/app/api/ai/roast/route'

type Lang = 'en' | 'ru' | 'kz' | 'ky' | 'uz'
type Status = 'connecting' | 'live' | 'ending'

const MODES: { id: RoastMode; emoji: string; voice: string; label: Record<Lang, string>; desc: Record<Lang, string> }[] = [
  {
    id: 'polite', emoji: '🎩', voice: 'sage',
    label: { en: 'Polite',      ru: 'Вежливый',    kz: 'Сыпайы',     ky: 'Сылык',     uz: 'Muloyim'   },
    desc:  { en: 'Kind mentor', ru: 'Добрый ментор',kz: 'Жылы ментор', ky: 'Жылуу ментор', uz: 'Mehribon' },
  },
  {
    id: 'roast',  emoji: '🔥', voice: 'onyx',
    label: { en: 'Roast',       ru: 'Роаст',        kz: 'Роаст',      ky: 'Роаст',     uz: 'Roast'     },
    desc:  { en: 'Savage & fun',ru: 'Жёстко и смешно', kz: 'Қатал күлкілі', ky: 'Катуу күлкүлүү', uz: 'Qattiq va kulgili' },
  },
  {
    id: 'savage', emoji: '💀', voice: 'echo',
    label: { en: 'No filter',   ru: 'Без цензуры',  kz: 'Цензурасыз', ky: 'Цензурасыз',uz: 'Sensorsiz'  },
    desc:  { en: '18+ no limit',ru: '18+ без рамок', kz: '18+ шексіз', ky: '18+ чексиз', uz: '18+ cheksiz' },
  },
]

const MicIcon = ({ size = 24, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/>
  </svg>
)

/* ── Ready screen ── */
function ReadyScreen({ mode, onModeChange, onStart, lang }: {
  mode: RoastMode; onModeChange: (m: RoastMode) => void; onStart: () => void; lang: Lang
}) {
  const isMobile = useIsMobile()
  const current = MODES.find(m => m.id === mode)!

  const TITLE: Record<Lang, string> = { en: 'AI Coach', ru: 'AI Coach', kz: 'AI Coach', ky: 'AI Coach', uz: 'AI Coach' }
  const DESC: Record<Lang, string> = {
    en: 'Have a live voice conversation. The AI will roast your IELTS English in real time.',
    ru: 'Живой голосовой разговор. ИИ прожарит ваш IELTS English в реальном времени.',
    kz: 'Тікелей дауыстық сөйлесу. ЖИ сіздің IELTS English-іңізді нақты уақытта прожарить.',
    ky: 'Түз үн маектешүү. ЖИ сиздин IELTS English-иңизди реалдуу убакытта прожарить.',
    uz: "Jonli ovozli suhbat. AI sizning IELTS English-ingizni real vaqtda roast qiladi.",
  }
  const START: Record<Lang, string> = { en: 'Start Conversation', ru: 'Начать разговор', kz: 'Сөйлесуді бастау', ky: 'Маектешүүнү баштоо', uz: 'Suhbatni boshlash' }
  const PICK: Record<Lang, string> = { en: 'Pick a mode', ru: 'Выберите режим', kz: 'Режим таңдаңыз', ky: 'Режим тандаңыз', uz: 'Rejim tanlang' }

  return (
    <div style={{ flex: 1, background: 'radial-gradient(120% 80% at 50% -10%, var(--accent-soft) 0%, var(--bg) 55%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? 18 : 24 }}>
      <div className="animate-fade-up" style={{ maxWidth: 460, width: '100%', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', padding: 24, borderRadius: '50%', background: 'var(--accent-soft)', marginBottom: 22, fontSize: 36, boxShadow: '0 0 0 1px color-mix(in srgb, var(--accent) 25%, transparent), 0 0 60px -10px color-mix(in srgb, var(--accent) 40%, transparent)' }}>
          {current.emoji}
        </div>
        <h1 style={{ fontSize: isMobile ? 28 : 36, fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 10px' }}>{TITLE[lang]}</h1>
        <p style={{ fontSize: 15, color: 'var(--text-2)', lineHeight: 1.6, margin: '0 0 28px' }}>{DESC[lang]}</p>

        {/* Mode picker */}
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 10 }}>{PICK[lang]}</p>
        <div style={{ display: 'grid', gap: 8, marginBottom: 28 }}>
          {MODES.map(m => (
            <button key={m.id} onClick={() => onModeChange(m.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                borderRadius: 14, border: `2px solid ${mode === m.id ? 'var(--accent)' : 'var(--border)'}`,
                background: mode === m.id ? 'var(--accent-soft)' : 'var(--bg-elev)',
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
              }}>
              <span style={{ fontSize: 24 }}>{m.emoji}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: mode === m.id ? 'var(--accent)' : 'var(--text)' }}>{m.label[lang]}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{m.desc[lang]}</div>
              </div>
              {mode === m.id && (
                <svg style={{ marginLeft: 'auto', flexShrink: 0 }} width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg>
              )}
            </button>
          ))}
        </div>

        <button onClick={onStart}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '14px 32px', borderRadius: 14, fontSize: 15, fontWeight: 700, background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', cursor: 'pointer', boxShadow: '0 10px 30px -10px color-mix(in srgb, var(--accent) 60%, transparent)' }}>
          <MicIcon size={17} color="var(--accent-fg)" /> {START[lang]}
        </button>
      </div>
    </div>
  )
}

/* ── Live conversation screen ── */
function LiveScreen({ mode, onExit, lang }: { mode: RoastMode; onExit: () => void; lang: Lang }) {
  const isMobile = useIsMobile()
  const [status, setStatus] = useState<Status>('connecting')
  const [aiSpeaking, setAiSpeaking] = useState(false)
  const [userSpeaking, setUserSpeaking] = useState(false)
  const [lastAi, setLastAi] = useState('')
  const [lastUser, setLastUser] = useState('')
  const [connError, setConnError] = useState('')
  const [elapsed, setElapsed] = useState(0)

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const dcRef = useRef<RTCDataChannel | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const localAnalyserRef = useRef<AnalyserNode | null>(null)
  const remoteAnalyserRef = useRef<AnalyserNode | null>(null)
  const orbRef = useRef<HTMLDivElement>(null)
  const turbulenceRef = useRef<SVGFETurbulenceElement>(null)
  const rafRef = useRef<number | null>(null)
  const startedRef = useRef(false)

  const currentMode = MODES.find(m => m.id === mode)!

  const END_BTN: Record<Lang, string> = { en: 'End', ru: 'Завершить', kz: 'Аяқтау', ky: 'Аяктоо', uz: 'Tugatish' }
  const CONN: Record<Lang, string> = { en: 'Connecting…', ru: 'Подключение…', kz: 'Қосылуда…', ky: 'Туташтыруу…', uz: 'Ulanmoqda…' }
  const AI_SPEAKING: Record<Lang, string> = { en: 'Speaking…', ru: 'Говорит…', kz: 'Сөйлеп жатыр…', ky: 'Сүйлөп жатат…', uz: 'Gapirmoqda…' }
  const YOU_SPEAKING: Record<Lang, string> = { en: 'Listening…', ru: 'Слушает…', kz: 'Тыңдап жатыр…', ky: 'Угуп жатат…', uz: 'Eshitmoqda…' }
  const WAITING: Record<Lang, string> = { en: 'Your turn…', ru: 'Ваша очередь…', kz: 'Сіздің кезегіңіз…', ky: 'Сиздин кезегиңиз…', uz: 'Sizning navbatingiz…' }

  const cleanup = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    try { dcRef.current?.close() } catch {}
    try { pcRef.current?.getSenders().forEach(s => s.track?.stop()) } catch {}
    try { pcRef.current?.close() } catch {}
    micStreamRef.current?.getTracks().forEach(tr => tr.stop())
    audioCtxRef.current?.close().catch(() => {})
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null
    pcRef.current = null; dcRef.current = null; micStreamRef.current = null
  }, [])

  const ensureCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      const C = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (C) audioCtxRef.current = new C()
    }
    return audioCtxRef.current
  }, [])

  const handleEvent = useCallback((raw: string) => {
    let msg: { type?: string; transcript?: string }
    try { msg = JSON.parse(raw) } catch { return }
    switch (msg.type) {
      case 'input_audio_buffer.speech_started': setUserSpeaking(true); break
      case 'input_audio_buffer.speech_stopped': setUserSpeaking(false); break
      case 'response.created':
      case 'response.output_audio.delta':
      case 'response.audio.delta': setAiSpeaking(true); break
      case 'response.output_audio.done':
      case 'response.audio.done':
      case 'response.done': setAiSpeaking(false); break
      case 'conversation.item.input_audio_transcription.completed':
        if (msg.transcript?.trim()) setLastUser(msg.transcript.trim()); break
      case 'response.output_audio_transcript.done':
      case 'response.audio_transcript.done':
        if (msg.transcript?.trim()) setLastAi(msg.transcript.trim()); break
    }
  }, [])

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    let cancelled = false

    ;(async () => {
      try {
        const mic = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null)
        if (!mic) { if (!cancelled) setConnError(lang === 'ru' ? 'Нет доступа к микрофону.' : 'Microphone access denied.'); return }
        if (cancelled) { mic.getTracks().forEach(tr => tr.stop()); return }
        micStreamRef.current = mic

        const ctx = ensureCtx()
        if (ctx) {
          if (ctx.state === 'suspended') await ctx.resume().catch(() => {})
          const ls = ctx.createMediaStreamSource(mic)
          const la = ctx.createAnalyser(); la.fftSize = 256; la.smoothingTimeConstant = 0.6
          ls.connect(la); localAnalyserRef.current = la
        }

        const pc = new RTCPeerConnection()
        pcRef.current = pc
        pc.ontrack = e => {
          if (remoteAudioRef.current) remoteAudioRef.current.srcObject = e.streams[0]
          const c = ensureCtx()
          if (c) {
            try {
              const rs = c.createMediaStreamSource(e.streams[0])
              const ra = c.createAnalyser(); ra.fftSize = 256; ra.smoothingTimeConstant = 0.6
              rs.connect(ra); remoteAnalyserRef.current = ra
            } catch {}
          }
        }
        pc.addTrack(mic.getTracks()[0], mic)

        const dc = pc.createDataChannel('oai-events')
        dcRef.current = dc
        dc.onmessage = ev => handleEvent(ev.data)
        dc.onopen = () => { try { dc.send(JSON.stringify({ type: 'response.create' })) } catch {} }

        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)

        const resp = await fetch(`/api/ai/roast/realtime?mode=${mode}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/sdp' },
          body: offer.sdp ?? '',
        })
        if (!resp.ok) {
          let m = 'Could not connect. Please try again.'
          try { const j = await resp.clone().json(); if (j?.error) m = j.error } catch {}
          if (!cancelled) setConnError(m)
          cleanup(); return
        }
        const answer = await resp.text()
        await pc.setRemoteDescription({ type: 'answer', sdp: answer })
        if (!cancelled) setStatus('live')
      } catch { if (!cancelled) setConnError('Connection failed. Please try again.') }
    })()

    return () => { cancelled = true; cleanup() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const id = setInterval(() => setElapsed(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [])

  // Cloud orb audio reactivity
  useEffect(() => {
    if (status !== 'live') return
    const orb = orbRef.current
    const turb = turbulenceRef.current
    if (!orb) return
    let smooth = 0
    let smoothFreq = 0.018
    const lbuf = new Uint8Array(256) as Uint8Array<ArrayBuffer>
    const rbuf = new Uint8Array(256) as Uint8Array<ArrayBuffer>
    const rms = (an: AnalyserNode | null, buf: Uint8Array<ArrayBuffer>) => {
      if (!an) return 0
      an.getByteTimeDomainData(buf)
      let sum = 0
      for (let i = 0; i < buf.length; i++) { const x = (buf[i] - 128) / 128; sum += x * x }
      return Math.sqrt(sum / buf.length) * 4
    }
    const draw = () => {
      const localLvl = rms(localAnalyserRef.current, lbuf)
      const remoteLvl = rms(remoteAnalyserRef.current, rbuf)
      const level = Math.min(1, Math.max(localLvl, remoteLvl))
      smooth += (level - smooth) * 0.18
      // Scale: grows more dramatically with voice
      const scale = 1 + smooth * 0.55
      orb.style.transform = `scale(${scale.toFixed(3)})`
      // Turbulence frequency rises with voice intensity — makes cloud churn
      const targetFreq = 0.018 + smooth * 0.06
      smoothFreq += (targetFreq - smoothFreq) * 0.12
      if (turb) turb.setAttribute('baseFrequency', `${smoothFreq.toFixed(4)} ${(smoothFreq * 1.6).toFixed(4)}`)
      rafRef.current = requestAnimationFrame(draw)
    }
    rafRef.current = requestAnimationFrame(draw)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (orb) orb.style.transform = ''
    }
  }, [status])

  const handleEnd = () => { setStatus('ending'); cleanup(); onExit() }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')
  const orbSize = isMobile ? 200 : 260

  const orbMode = status !== 'live' ? 'think' : aiSpeaking ? 'speak' : userSpeaking ? 'rec' : 'idle'

  const caption = status === 'connecting' ? CONN[lang]
    : status === 'ending' ? '…'
    : aiSpeaking ? AI_SPEAKING[lang]
    : userSpeaking ? YOU_SPEAKING[lang]
    : WAITING[lang]

  // Cloud color palette per mode
  const CLOUD_COLORS = {
    polite:  { c1: '#f0e8ff', c2: '#a78bfa', c3: '#7c3aed', glow: '#8b5cf6' },
    roast:   { c1: '#fff3e8', c2: '#fb923c', c3: '#c2410c', glow: '#f97316' },
    savage:  { c1: '#fff0f0', c2: '#f87171', c3: '#991b1b', glow: '#dc2626' },
  }
  const cc = CLOUD_COLORS[mode]

  return (
    <div style={{ position: 'relative', flex: 1, background: `radial-gradient(140% 80% at 50% -10%, color-mix(in srgb, ${cc.glow} 12%, transparent) 0%, var(--bg) 60%)`, display: 'flex', flexDirection: 'column' }}>
      <audio ref={remoteAudioRef} autoPlay hidden />

      {/* SVG cloud filter — gentle turbulence + heavy blur = soft fluffy edges */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }} aria-hidden="true">
        <defs>
          <filter id="cloud-filter" x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
            <feTurbulence
              ref={turbulenceRef}
              type="fractalNoise"
              baseFrequency="0.013 0.018"
              numOctaves="5"
              seed="3"
              result="noise"
            />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="14" xChannelSelector="R" yChannelSelector="G" result="displaced"/>
            <feGaussianBlur in="displaced" stdDeviation="10"/>
          </filter>
        </defs>
      </svg>

      {/* Header */}
      <header style={{ padding: isMobile ? '12px 16px' : '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: status === 'live' ? cc.glow : 'var(--text-3)', boxShadow: status === 'live' ? `0 0 0 4px color-mix(in srgb, ${cc.glow} 25%, transparent)` : 'none', transition: 'all 0.3s' }}/>
          <span style={{ fontSize: 13, fontWeight: 700 }}>{currentMode.emoji} {currentMode.label[lang]}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13.5, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>{mm}:{ss}</span>
          <button onClick={handleEnd} style={{ padding: '6px 14px', background: 'transparent', border: '1px solid var(--border-strong)', borderRadius: 8, fontSize: 12, color: 'var(--text-2)', cursor: 'pointer' }}>
            {END_BTN[lang]}
          </button>
        </div>
      </header>

      {/* Cloud Orb */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '20px 16px 24px' : '28px 24px 32px', gap: 22 }}>
        <div
          ref={orbRef}
          style={{
            width: orbSize, height: orbSize, flexShrink: 0,
            borderRadius: '50%',
            background: `radial-gradient(circle at 35% 30%, ${cc.c1} 0%, ${cc.c1} 18%, ${cc.c2} 52%, ${cc.c3} 100%)`,
            filter: 'url(#cloud-filter)',
            boxShadow: `0 0 100px 40px color-mix(in srgb, ${cc.glow} 45%, transparent), 0 0 40px 10px color-mix(in srgb, ${cc.c1} 30%, transparent)`,
            animation: orbMode === 'idle' ? 'cloudIdle 5s ease-in-out infinite'
              : orbMode === 'think' ? 'cloudThink 2s ease-in-out infinite'
              : 'cloudTalk 1s ease-in-out infinite',
            transition: 'box-shadow 0.4s ease',
          }}
        />

        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: 15, fontWeight: 500, color: aiSpeaking ? 'var(--accent)' : 'var(--text-2)' }}>{caption}</span>
        </div>

        {/* Live transcript peek */}
        {(lastAi || lastUser) && status === 'live' && (
          <div style={{ width: '100%', maxWidth: 520, display: 'grid', gap: 10, marginTop: 4 }}>
            {lastAi && (
              <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 16px' }}>
                <div style={{ fontSize: 10, letterSpacing: '0.08em', color: 'var(--text-3)', fontWeight: 600, marginBottom: 4 }}>AI</div>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: 'var(--text)' }}>{lastAi}</p>
              </div>
            )}
            {lastUser && (
              <div style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 16px' }}>
                <div style={{ fontSize: 10, letterSpacing: '0.08em', color: 'var(--text-3)', fontWeight: 600, marginBottom: 4 }}>
                  {lang === 'ru' ? 'ВЫ' : lang === 'kz' ? 'СІЗ' : lang === 'ky' ? 'СИЗ' : lang === 'uz' ? 'SIZ' : 'YOU'}
                </div>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: 'var(--text-2)' }}>{lastUser}</p>
              </div>
            )}
          </div>
        )}

        {connError && <div style={{ fontSize: 13, color: 'var(--danger)', textAlign: 'center' }}>{connError}</div>}
      </div>
    </div>
  )
}

/* ── Main page ── */
export default function RoastPage() {
  const { language } = useLanguage()
  const lang = (language ?? 'en') as Lang
  const [started, setStarted] = useState(false)
  const [mode, setMode] = useState<RoastMode>('roast')
  const [key, setKey] = useState(0)

  if (!started) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <ReadyScreen mode={mode} onModeChange={setMode} onStart={() => setStarted(true)} lang={lang} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <LiveScreen
        key={key}
        mode={mode}
        lang={lang}
        onExit={() => { setStarted(false); setKey(k => k + 1) }}
      />
    </div>
  )
}
