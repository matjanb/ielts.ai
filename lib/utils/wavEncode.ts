// Converts a recorded audio Blob (webm/opus on Chrome, mp4/aac on Safari) into a
// 16-bit PCM WAV Blob. The speaking grader sends the candidate's speech to an
// audio model that only accepts wav/mp3, so we transcode in the browser via the
// Web Audio API (decodeAudioData handles every format the browser can record).

export interface SpeechSegment { start: number; end: number } // milliseconds from recording start

async function decodeMono(blob: Blob): Promise<{ data: Float32Array; sampleRate: number }> {
  const arrayBuffer = await blob.arrayBuffer()
  const Ctx = window.AudioContext
    || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctx) throw new Error('Web Audio API not available')
  const audioCtx = new Ctx()
  try {
    const buf = await audioCtx.decodeAudioData(arrayBuffer)
    const length = buf.length
    const channels = buf.numberOfChannels
    const mono = new Float32Array(length)
    for (let ch = 0; ch < channels; ch++) {
      const d = buf.getChannelData(ch)
      for (let i = 0; i < length; i++) mono[i] += d[i] / channels
    }
    return { data: mono, sampleRate: buf.sampleRate }
  } finally {
    audioCtx.close().catch(() => {})
  }
}

// Nearest-sample decimation to a lower rate (16 kHz is plenty for speech and
// keeps the upload/token size small).
function resample(data: Float32Array, srcRate: number, targetRate?: number): { data: Float32Array; sampleRate: number } {
  if (!targetRate || targetRate >= srcRate) return { data, sampleRate: srcRate }
  const ratio = srcRate / targetRate
  const length = Math.floor(data.length / ratio)
  const out = new Float32Array(length)
  for (let i = 0; i < length; i++) out[i] = data[Math.floor(i * ratio)]
  return { data: out, sampleRate: targetRate }
}

function floatToWav(mono: Float32Array, sampleRate: number): Blob {
  const length = mono.length
  const bytesPerSample = 2
  const dataSize = length * bytesPerSample
  const out = new ArrayBuffer(44 + dataSize)
  const view = new DataView(out)
  const writeStr = (offset: number, str: string) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)) }
  writeStr(0, 'RIFF'); view.setUint32(4, 36 + dataSize, true); writeStr(8, 'WAVE')
  writeStr(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * bytesPerSample, true)
  view.setUint16(32, bytesPerSample, true); view.setUint16(34, 16, true)
  writeStr(36, 'data'); view.setUint32(40, dataSize, true)
  let offset = 44
  for (let i = 0; i < length; i++) {
    const s = Math.max(-1, Math.min(1, mono[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    offset += bytesPerSample
  }
  return new Blob([out], { type: 'audio/wav' })
}

function tailTrim(data: Float32Array, sampleRate: number, maxSeconds?: number): Float32Array {
  if (!maxSeconds || data.length <= maxSeconds * sampleRate) return data
  return data.slice(data.length - Math.floor(maxSeconds * sampleRate))
}

/** Whole recording → mono 16-bit WAV, optionally downsampled and tail-trimmed. */
export async function blobToWav(blob: Blob, targetSampleRate?: number, maxSeconds?: number): Promise<Blob> {
  const decoded = await decodeMono(blob)
  const { data, sampleRate } = resample(decoded.data, decoded.sampleRate, targetSampleRate)
  return floatToWav(tailTrim(data, sampleRate, maxSeconds), sampleRate)
}

/**
 * Extract and concatenate only the candidate's speech segments (padded a little
 * so word edges aren't clipped, overlapping segments merged), then encode WAV.
 * This packs the acoustic-grade sample with actual speech instead of the silence
 * that fills a live conversation while the examiner is talking.
 */
export async function blobToWavSegments(
  blob: Blob,
  segments: SpeechSegment[],
  opts: { targetSampleRate?: number; padMs?: number; maxSeconds?: number } = {},
): Promise<Blob> {
  const { targetSampleRate, padMs = 350, maxSeconds } = opts
  const decoded = await decodeMono(blob)
  const totalMs = (decoded.data.length / decoded.sampleRate) * 1000

  // Pad, clamp and merge overlapping/adjacent segments.
  const padded = segments
    .map(s => ({ start: Math.max(0, s.start - padMs), end: Math.min(totalMs, s.end + padMs) }))
    .filter(s => s.end > s.start)
    .sort((a, b) => a.start - b.start)
  const merged: SpeechSegment[] = []
  for (const s of padded) {
    const last = merged[merged.length - 1]
    if (last && s.start <= last.end) last.end = Math.max(last.end, s.end)
    else merged.push({ ...s })
  }
  if (merged.length === 0) return blobToWav(blob, targetSampleRate, maxSeconds)

  // Slice the decoded samples for each segment and concatenate.
  const sr = decoded.sampleRate
  const parts: Float32Array[] = []
  let totalLen = 0
  for (const s of merged) {
    const a = Math.floor((s.start / 1000) * sr)
    const b = Math.min(decoded.data.length, Math.floor((s.end / 1000) * sr))
    if (b > a) { const seg = decoded.data.subarray(a, b); parts.push(seg); totalLen += seg.length }
  }
  if (totalLen === 0) return blobToWav(blob, targetSampleRate, maxSeconds)
  const joined = new Float32Array(totalLen)
  let off = 0
  for (const p of parts) { joined.set(p, off); off += p.length }

  const { data, sampleRate } = resample(joined, sr, targetSampleRate)
  return floatToWav(tailTrim(data, sampleRate, maxSeconds), sampleRate)
}
