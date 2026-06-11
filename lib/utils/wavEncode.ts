// Converts a recorded audio Blob (webm/opus on Chrome, mp4/aac on Safari) into a
// 16-bit PCM WAV Blob. The speaking grader sends the Part 2 long turn to an
// audio model that only accepts wav/mp3, so we transcode in the browser via the
// Web Audio API (decodeAudioData handles every format the browser can record).

export async function blobToWav(blob: Blob, targetSampleRate?: number): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer()
  const Ctx = window.AudioContext
    || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctx) throw new Error('Web Audio API not available')

  const audioCtx = new Ctx()
  try {
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
    return encodeWav(audioBuffer, targetSampleRate)
  } finally {
    audioCtx.close().catch(() => {})
  }
}

// Downmix to mono 16-bit PCM, optionally decimating to `targetSampleRate` (e.g.
// 16 kHz for a long whole-session recording, which keeps the upload small). Mono
// is plenty for speech assessment and roughly halves size versus stereo.
function encodeWav(buffer: AudioBuffer, targetSampleRate?: number): Blob {
  const srcRate = buffer.sampleRate
  const srcLength = buffer.length
  const channels = buffer.numberOfChannels

  // Average all channels into one at the source rate.
  const srcMono = new Float32Array(srcLength)
  for (let ch = 0; ch < channels; ch++) {
    const data = buffer.getChannelData(ch)
    for (let i = 0; i < srcLength; i++) srcMono[i] += data[i] / channels
  }

  // Optional nearest-sample decimation to a lower rate.
  const sampleRate = targetSampleRate && targetSampleRate < srcRate ? targetSampleRate : srcRate
  let mono = srcMono
  let length = srcLength
  if (sampleRate !== srcRate) {
    const ratio = srcRate / sampleRate
    length = Math.floor(srcLength / ratio)
    mono = new Float32Array(length)
    for (let i = 0; i < length; i++) mono[i] = srcMono[Math.floor(i * ratio)]
  }

  const bytesPerSample = 2
  const dataSize = length * bytesPerSample
  const out = new ArrayBuffer(44 + dataSize)
  const view = new DataView(out)

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
  }

  // RIFF/WAVE header for mono PCM16.
  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true)            // PCM chunk size
  view.setUint16(20, 1, true)             // audio format = PCM
  view.setUint16(22, 1, true)             // channels = mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * bytesPerSample, true) // byte rate
  view.setUint16(32, bytesPerSample, true)              // block align
  view.setUint16(34, 16, true)            // bits per sample
  writeStr(36, 'data')
  view.setUint32(40, dataSize, true)

  let offset = 44
  for (let i = 0; i < length; i++) {
    const s = Math.max(-1, Math.min(1, mono[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    offset += bytesPerSample
  }

  return new Blob([out], { type: 'audio/wav' })
}
