'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { useIsMobile } from '@/lib/hooks/useIsMobile'
import type { RoastMode } from '@/app/api/ai/roast/route'
import { createClient } from '@/lib/supabase/client'
import { getUser } from '@/lib/services/auth'

type SpeakingContext = {
  sessionCount: number
  avgBand: number | null
  avgFluency: number | null
  avgLexical: number | null
  avgGrammar: number | null
  avgPronunciation: number | null
  recentImprovements: string[]
}

async function fetchSpeakingContext(): Promise<SpeakingContext> {
  const empty: SpeakingContext = { sessionCount: 0, avgBand: null, avgFluency: null, avgLexical: null, avgGrammar: null, avgPronunciation: null, recentImprovements: [] }
  try {
    const { user } = await getUser()
    if (!user) return empty
    const { data } = await createClient()
      .from('speaking_submissions')
      .select('band_score, fluency_score, lexical_score, grammar_score, pronunciation_score, ai_feedback')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)
    const rows = data ?? []
    if (rows.length === 0) return empty
    const avg = (key: string) => {
      const vals = rows.map(r => (r as Record<string, unknown>)[key]).filter((v): v is number => typeof v === 'number')
      return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null
    }
    const improvements: string[] = []
    for (const row of rows.slice(0, 3)) {
      if (!row.ai_feedback) continue
      try {
        const fb = JSON.parse(row.ai_feedback) as { improvements?: string[] }
        if (Array.isArray(fb.improvements)) improvements.push(...fb.improvements.slice(0, 2))
      } catch { /* skip */ }
      if (improvements.length >= 5) break
    }
    return {
      sessionCount: rows.length,
      avgBand:          avg('band_score'),
      avgFluency:       avg('fluency_score'),
      avgLexical:       avg('lexical_score'),
      avgGrammar:       avg('grammar_score'),
      avgPronunciation: avg('pronunciation_score'),
      recentImprovements: [...new Set(improvements)].slice(0, 4),
    }
  } catch { return empty }
}

type Lang = 'en' | 'ru' | 'kz' | 'ky' | 'uz'
type Status = 'connecting' | 'live' | 'ending'

/* ── Particle sphere ──────────────────────────────────────── */
type Particle = { x: number; y: number; z: number; baseSize: number }

function genParticles(count: number): Particle[] {
  const pts: Particle[] = []
  const phi = Math.PI * (Math.sqrt(5) - 1)
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2
    const r = Math.sqrt(Math.max(0, 1 - y * y))
    const theta = phi * i
    pts.push({ x: Math.cos(theta) * r, y, z: Math.sin(theta) * r, baseSize: 0.8 + Math.random() * 2.4 })
  }
  return pts
}

function lerpColor(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const r = Math.round(((pa >> 16) & 0xff) * (1 - t) + ((pb >> 16) & 0xff) * t)
  const g = Math.round(((pa >> 8) & 0xff) * (1 - t) + ((pb >> 8) & 0xff) * t)
  const bv = Math.round((pa & 0xff) * (1 - t) + (pb & 0xff) * t)
  return `rgb(${r},${g},${bv})`
}

// Colors per mode: [top, mid, bottom]
const SPHERE_COLORS: Record<RoastMode, [string, string, string]> = {
  polite: ['#818cf8', '#c084fc', '#a78bfa'],   // indigo → violet
  roast:  ['#38bdf8', '#fb923c', '#f97316'],   // blue → orange (like reference)
  savage: ['#f87171', '#fb923c', '#b91c1c'],   // red → orange-red
}

function drawSphere(
  ctx: CanvasRenderingContext2D, S: number,
  particles: Particle[], rotY: number, audioLevel: number, pulse: number, mode: RoastMode,
) {
  ctx.clearRect(0, 0, S, S)
  const cx = S / 2, cy = S / 2
  // S is the buffer size (1.5× the display), so sphere comfortably fits within
  const R = S * 0.32 * (1 + audioLevel * 0.18 + pulse * 0.08)
  const cols = SPHERE_COLORS[mode]
  const cosR = Math.cos(rotY), sinR = Math.sin(rotY)

  const proj = particles.map(p => {
    const rx = p.x * cosR + p.z * sinR
    const rz = -p.x * sinR + p.z * cosR
    const ry = p.y
    const s = 3.5 / (3.5 + rz * 0.5)
    return {
      sx: cx + rx * R * s,
      sy: cy - ry * R * s,
      z: rz,
      size: p.baseSize * s * (1 + audioLevel * 0.9 + pulse * 0.3),
      opacity: Math.min(1, (0.25 + 0.75 * ((rz + 1) / 2)) * (0.65 + audioLevel * 0.6 + pulse * 0.3)),
      t: (ry + 1) / 2,
    }
  }).sort((a, b) => a.z - b.z)

  // No per-particle shadowBlur (very expensive) — overall glow comes from CSS drop-shadow
  for (const p of proj) {
    if (p.size < 0.3 || p.opacity < 0.03) continue
    const col = p.t < 0.5
      ? lerpColor(cols[0], cols[1], p.t * 2)
      : lerpColor(cols[1], cols[2], (p.t - 0.5) * 2)
    ctx.globalAlpha = p.opacity
    ctx.fillStyle = col
    ctx.beginPath()
    ctx.arc(p.sx, p.sy, Math.max(0.4, p.size), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}
/* ──────────────────────────────────────────────────────────── */

const MODES: { id: RoastMode; emoji: string; label: Record<Lang, string>; desc: Record<Lang, string> }[] = [
  {
    id: 'polite', emoji: '🎩',
    label: { en: 'Polite',      ru: 'Вежливый',    kz: 'Сыпайы',     ky: 'Сылык',     uz: 'Muloyim'   },
    desc:  { en: 'Kind mentor', ru: 'Добрый ментор',kz: 'Жылы ментор', ky: 'Жылуу ментор', uz: 'Mehribon' },
  },
  {
    id: 'roast', emoji: '🔥',
    label: { en: 'Roast',       ru: 'Роаст',        kz: 'Роаст',      ky: 'Роаст',     uz: 'Roast'     },
    desc:  { en: 'Savage & fun',ru: 'Жёстко и смешно', kz: 'Қатал күлкілі', ky: 'Катуу күлкүлүү', uz: 'Qattiq va kulgili' },
  },
  {
    id: 'savage', emoji: '💀',
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
function LiveScreen({ mode, onExit, lang, context }: { mode: RoastMode; onExit: () => void; lang: Lang; context: SpeakingContext | null }) {
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
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>(genParticles(280))
  const rotYRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  const startedRef = useRef(false)

  const currentMode = MODES.find(m => m.id === mode)!
  const glowColor = SPHERE_COLORS[mode][1]

  const END_BTN: Record<Lang, string> = { en: 'End', ru: 'Завершить', kz: 'Аяқтау', ky: 'Аяктоо', uz: 'Tugatish' }
  const CONN: Record<Lang, string> = { en: 'Connecting…', ru: 'Подключение…', kz: 'Қосылуда…', ky: 'Туташтыруу…', uz: 'Ulanmoqda…' }
  const AI_SPEAKING: Record<Lang, string> = { en: 'Speaking…', ru: 'Говорит…', kz: 'Сөйлеп жатыр…', ky: 'Сүйлөп жатат…', uz: 'Gapirmoqda…' }
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

  // WebRTC connection
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
        dc.onopen = () => {
          try {
            // Set temperature per mode — savage needs max chaos (1.2), roast is hot (1.0), polite is measured (0.8)
            const temp = mode === 'savage' ? 1.2 : mode === 'roast' ? 1.0 : 0.2
            dc.send(JSON.stringify({ type: 'session.update', session: { temperature: temp } }))
            dc.send(JSON.stringify({
              type: 'conversation.item.create',
              item: { type: 'message', role: 'user', content: [{ type: 'input_text', text: '[SESSION_START]' }] },
            }))
            dc.send(JSON.stringify({ type: 'response.create' }))
          } catch {}
        }

        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)

        const resp = await fetch(`/api/ai/roast/realtime?mode=${mode}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sdp: offer.sdp ?? '', context }),
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

  // Timer
  useEffect(() => {
    const id = setInterval(() => setElapsed(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [])

  // Particle sphere animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const CSS = isMobile ? 220 : 280
    // Buffer is 1.5× the display size — gives room so sphere never clips into a square
    const BUF = Math.round(CSS * 1.5)
    canvas.width = BUF * dpr
    canvas.height = BUF * dpr
    ctx.scale(dpr, dpr)

    const lbuf = new Uint8Array(256) as Uint8Array<ArrayBuffer>
    const rbuf = new Uint8Array(256) as Uint8Array<ArrayBuffer>
    let smooth = 0
    let pulse = 0
    let alive = true

    const rms = (an: AnalyserNode | null, buf: Uint8Array<ArrayBuffer>) => {
      if (!an) return 0
      an.getByteTimeDomainData(buf)
      let sum = 0
      for (let i = 0; i < buf.length; i++) { const x = (buf[i] - 128) / 128; sum += x * x }
      return Math.sqrt(sum / buf.length) * 4
    }

    const tick = () => {
      if (!alive) return
      const lvl = Math.min(1, Math.max(rms(localAnalyserRef.current, lbuf), rms(remoteAnalyserRef.current, rbuf)))
      // Pulse: spikes when audio suddenly jumps (loud burst)
      const spike = Math.max(0, lvl - smooth)
      smooth += (lvl - smooth) * 0.15
      pulse = Math.max(0, pulse * 0.82 + spike * 3.0)
      // Rotate faster when speaking, extra spin on pulse bursts
      rotYRef.current += 0.005 + smooth * 0.028 + pulse * 0.018
      drawSphere(ctx, BUF, particlesRef.current, rotYRef.current, smooth, pulse, mode)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => { alive = false; if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null } }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, isMobile])

  const handleEnd = () => { setStatus('ending'); cleanup(); onExit() }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')
  const orbSize = isMobile ? 220 : 280

  const caption = status === 'connecting' ? CONN[lang]
    : status === 'ending' ? '…'
    : aiSpeaking ? AI_SPEAKING[lang]
    : userSpeaking ? (lang === 'ru' ? 'Слушает…' : lang === 'kz' ? 'Тыңдап жатыр…' : lang === 'ky' ? 'Угуп жатат…' : lang === 'uz' ? 'Eshitmoqda…' : 'Listening…')
    : WAITING[lang]

  return (
    <div style={{ position: 'relative', flex: 1, background: '#07080a', display: 'flex', flexDirection: 'column' }}>
      <audio ref={remoteAudioRef} autoPlay hidden />

      {/* Header */}
      <header style={{ padding: isMobile ? '12px 16px' : '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: status === 'live' ? glowColor : '#444', boxShadow: status === 'live' ? `0 0 0 4px color-mix(in srgb, ${glowColor} 25%, transparent)` : 'none', transition: 'all 0.3s' }}/>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{currentMode.emoji} {currentMode.label[lang]}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)' }}>{mm}:{ss}</span>
          <button onClick={handleEnd} style={{ padding: '6px 14px', background: 'transparent', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, fontSize: 12, color: 'rgba(255,255,255,0.45)', cursor: 'pointer' }}>
            {END_BTN[lang]}
          </button>
        </div>
      </header>

      {/* Particle sphere */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '20px 16px 24px' : '28px 24px 32px', gap: 22 }}>
        <canvas
          ref={canvasRef}
          style={{
            width: orbSize, height: orbSize, flexShrink: 0,
            filter: `drop-shadow(0 0 24px color-mix(in srgb, ${glowColor} 70%, transparent)) drop-shadow(0 0 48px color-mix(in srgb, ${glowColor} 35%, transparent))`,
          }}
        />

        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: 15, fontWeight: 500, color: aiSpeaking ? glowColor : 'rgba(255,255,255,0.3)' }}>{caption}</span>
        </div>

        {(lastAi || lastUser) && status === 'live' && (
          <div style={{ width: '100%', maxWidth: 520, display: 'grid', gap: 10, marginTop: 4 }}>
            {lastAi && (
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 14, padding: '12px 16px' }}>
                <div style={{ fontSize: 10, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.28)', fontWeight: 600, marginBottom: 4 }}>AI</div>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: 'rgba(255,255,255,0.82)' }}>{lastAi}</p>
              </div>
            )}
            {lastUser && (
              <div style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '12px 16px' }}>
                <div style={{ fontSize: 10, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.22)', fontWeight: 600, marginBottom: 4 }}>
                  {lang === 'ru' ? 'ВЫ' : lang === 'kz' ? 'СІЗ' : lang === 'ky' ? 'СИЗ' : lang === 'uz' ? 'SIZ' : 'YOU'}
                </div>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: 'rgba(255,255,255,0.48)' }}>{lastUser}</p>
              </div>
            )}
          </div>
        )}

        {connError && <div style={{ fontSize: 13, color: '#f87171', textAlign: 'center' }}>{connError}</div>}
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
  const [context, setContext] = useState<SpeakingContext | null>(null)

  async function handleStart() {
    const ctx = await fetchSpeakingContext()
    setContext(ctx)
    setStarted(true)
  }

  if (!started) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <ReadyScreen mode={mode} onModeChange={setMode} onStart={handleStart} lang={lang} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <LiveScreen key={key} mode={mode} lang={lang} context={context} onExit={() => { setStarted(false); setKey(k => k + 1) }} />
    </div>
  )
}
