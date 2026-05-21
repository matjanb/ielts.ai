import { createClient } from '@/lib/supabase/client'

export async function uploadAudio(file: File, path?: string): Promise<string> {
  const supabase = createClient()
  const filePath = path ?? `${Date.now()}-${file.name}`

  const { error } = await supabase.storage
    .from('test-audio')
    .upload(filePath, file, { upsert: true })

  if (error) throw new Error(`Audio upload failed: ${error.message}`)

  const { data } = supabase.storage.from('test-audio').getPublicUrl(filePath)
  return data.publicUrl
}
