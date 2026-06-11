import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'

// Candidate speaking recordings are personal data, so they live in the PRIVATE
// `speaking-audio` bucket and are only ever reachable through short-lived signed
// URLs. Uploads and signing run server-side with the service-role key; the
// client never touches the bucket directly. See migration 025.

const BUCKET = 'speaking-audio'
const SIGNED_URL_TTL_SECONDS = 60 * 60 // 1 hour — enough to play back a result

/** Storage object path for one turn's audio, namespaced under the user folder. */
export function speakingAudioPath(userId: string, submissionId: string, turnIndex: number, ext: string): string {
  return `${userId}/${submissionId}/${turnIndex}.${ext}`
}

/**
 * Upload a candidate recording to the private bucket and return its storage
 * path (NOT a URL). Pass the path to {@link signSpeakingAudio} to play it back.
 */
export async function uploadSpeakingAudio(
  path: string,
  data: ArrayBuffer | Blob | Buffer,
  contentType: string,
): Promise<string> {
  const admin = createAdminClient()
  const { error } = await admin.storage
    .from(BUCKET)
    .upload(path, data, { contentType, upsert: true })
  if (error) throw new Error(`Speaking audio upload failed: ${error.message}`)
  return path
}

/** Mint a short-lived signed URL for one stored recording. */
export async function signSpeakingAudio(path: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
  if (error || !data?.signedUrl) return null
  return data.signedUrl
}

/**
 * Download a stored recording as base64 for sending to an audio model. Returns
 * null if the object is missing or unreadable (grader then falls back to text).
 */
export async function downloadSpeakingAudioBase64(path: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data, error } = await admin.storage.from(BUCKET).download(path)
  if (error || !data) return null
  const buf = Buffer.from(await data.arrayBuffer())
  return buf.toString('base64')
}

/** Mint signed URLs for several stored recordings in one round trip. */
export async function signSpeakingAudioBatch(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {}
  const admin = createAdminClient()
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS)
  if (error || !data) return {}
  const out: Record<string, string> = {}
  for (const item of data) {
    if (item.signedUrl && item.path) out[item.path] = item.signedUrl
  }
  return out
}
