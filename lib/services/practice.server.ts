import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Question } from '@/lib/types/database'
import type { Difficulty, PracticeGroup } from '@/lib/services/tests'

/**
 * Server-side practice-set builder. Mirrors the old client getPracticeSet but
 * runs with the service-role key, so practice questions (which legitimately
 * reveal `correct_answer` as a study aid) are served only through this
 * subscription-gated endpoint — never from the public anon key.
 */
export async function getPracticeSetServer(opts: {
  skill: 'listening' | 'reading'
  questionType: string
  difficulty: Difficulty | 'any'
  limit: number
}): Promise<PracticeGroup[]> {
  const admin = createAdminClient()

  const { data: tests } = await admin.from('tests').select('id').eq('type', opts.skill)
  const testIds = (tests ?? []).map(t => t.id)
  if (testIds.length === 0) return []

  let sectionsQuery = admin
    .from('test_sections')
    .select('id, title, instructions, audio_url, difficulty')
    .in('test_id', testIds)
  if (opts.difficulty !== 'any') sectionsQuery = sectionsQuery.eq('difficulty', opts.difficulty)
  const { data: sections } = await sectionsQuery
  const sectionList = sections ?? []
  if (sectionList.length === 0) return []

  // Filter to the requested type IN the query (not in memory). Match the granular
  // listening subtype when set, otherwise fall back to the coarse question_type —
  // so reading (no subtype) and listening (subtype) both work. Still server-side.
  const t = opts.questionType
  const { data: questionRows } = await admin
    .from('questions')
    .select('*')
    .in('section_id', sectionList.map(s => s.id))
    .or(`question_subtype.eq.${t},and(question_subtype.is.null,question_type.eq.${t})`)
    .order('question_number')
  const questions: Question[] = questionRows ?? []

  const bySection = new Map<string, Question[]>()
  for (const q of questions) {
    if (!bySection.has(q.section_id)) bySection.set(q.section_id, [])
    bySection.get(q.section_id)!.push(q)
  }

  // Matching-pool questions keep the A–G option box only on the first item; the
  // rest are `matching_pool_ref`. Copy the resolved pool onto every matching
  // question in the section so each one renders standalone (a letter dropdown).
  for (const qs of bySection.values()) {
    const anchor = qs.find(q => {
      const o = q.options as { format?: string; pool?: unknown } | null
      return o?.format === 'matching_pool' && Array.isArray(o.pool)
    })
    if (!anchor) continue
    const ao = anchor.options as { pool: unknown; instruction?: unknown }
    for (const q of qs) {
      const o = q.options as { format?: string } | null
      if (o?.format === 'matching_pool' || o?.format === 'matching_pool_ref') {
        q.options = { ...o, pool: ao.pool, instruction: ao.instruction } as Question['options']
      }
    }
  }

  const usable = sectionList.filter(s => bySection.has(s.id))
  for (let i = usable.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[usable[i], usable[j]] = [usable[j], usable[i]]
  }

  const groups: PracticeGroup[] = []
  let count = 0
  for (const s of usable) {
    if (count >= opts.limit) break
    const qs = bySection.get(s.id)!
    groups.push({
      sectionId: s.id,
      title: s.title,
      passage: opts.skill === 'reading' ? (s.instructions ?? null) : null,
      audioUrl: s.audio_url ?? null,
      difficulty: (s.difficulty ?? null) as Difficulty | null,
      questions: qs,
    })
    count += qs.length
  }
  return groups
}
