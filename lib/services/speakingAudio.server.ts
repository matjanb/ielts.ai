import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'

// Candidate speaking recordings are personal data, so they live in the PRIVATE
// `speaking-audio` bucket (see migration 025). The browser uploads its recording
// straight to the bucket under its own `{user_id}/...` prefix — the RLS policy
// confines each user to their own folder — and the grader reads it back here with
// the service-role key to send to the audio model.

const BUCKET = 'speaking-audio'

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
