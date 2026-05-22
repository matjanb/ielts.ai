/**
 * Updates Q1 and Q2 of Test 1 with image option URLs stored as a JSON array
 * in the existing image_url (text) column. Run with:
 *   node scripts/seed-question-images.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const envContent = readFileSync(new URL('../.env.local', import.meta.url), 'utf-8')
const env = Object.fromEntries(
  envContent
    .split('\n')
    .filter(line => line.trim() && !line.startsWith('#'))
    .map(line => {
      const eq = line.indexOf('=')
      return [line.slice(0, eq).trim(), line.slice(eq + 1).trim()]
    })
    .filter(([k]) => k)
)

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

const BASE = `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/question-images`

const updates = [
  {
    id: '33333333-0001-0001-0001-000000000001',
    label: 'Test 1 Q1',
    image_url: JSON.stringify([
      `${BASE}/t1_q1_a.png`,
      `${BASE}/t1_q1_b.png`,
      `${BASE}/t1_q1_c.png`,
      `${BASE}/t1_q1_d.png`,
    ]),
  },
  {
    id: '33333333-0001-0001-0001-000000000002',
    label: 'Test 1 Q2',
    image_url: JSON.stringify([
      `${BASE}/t1_q2_a.png`,
      `${BASE}/t1_q2_b.png`,
      `${BASE}/t1_q2_c.png`,
      `${BASE}/t1_q2_d.png`,
    ]),
  },
]

for (const { id, label, image_url } of updates) {
  const { error } = await supabase
    .from('questions')
    .update({ image_url })
    .eq('id', id)

  if (error) {
    console.error(`✗ Failed to update ${label} (${id}):`, error.message)
  } else {
    console.log(`✓ Updated ${label} with option images`)
  }
}
