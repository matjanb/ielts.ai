// Resource selection for the coach agent. The agent never searches the web:
// it maps the primary signal to a (module, problem_tag) pair and picks a
// random matching row from the curated `resources` table, falling back to the
// module's general_plateau shelf when nothing tag-specific is stocked.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, SkillType } from '../types/database'
import type { PrimarySignal } from './signals.ts'

type Db = SupabaseClient<Database>

export type AgentResource = {
  id: string
  module: string
  problem_tag: string
  resource_type: string
  title: string
  url: string
  instruction: string
}

export const GENERAL_TAG = 'general_plateau'

/**
 * Which shelf to look at for a given signal. Inactivity and positive signals
 * are message-only (a comeback nudge with homework attached reads as nagging),
 * so they map to null.
 */
export function resourceTargetFor(
  primary: PrimarySignal,
): { module: SkillType | 'vocabulary'; tag: string } | null {
  switch (primary.type) {
    case 'plateau':
      return {
        module: primary.signal.module,
        tag: primary.signal.weakArea?.questionType ?? GENERAL_TAG,
      }
    case 'repeated_error':
      return { module: primary.signal.module, tag: primary.signal.questionType }
    case 'inactivity':
    case 'positive':
      return null
  }
}

/**
 * Random active resource for (module, tag); falls back to general_plateau of
 * the same module. Random pick keeps repeated messages from always pushing the
 * same link. Returns null when the shelf is empty — the agent then writes its
 * advice without a link rather than inventing one.
 */
export async function getResource(
  db: Db,
  module: string,
  problemTag: string,
): Promise<AgentResource | null> {
  for (const tag of problemTag === GENERAL_TAG ? [GENERAL_TAG] : [problemTag, GENERAL_TAG]) {
    const { data, error } = await db
      .from('resources')
      .select('id, module, problem_tag, resource_type, title, url, instruction')
      .eq('module', module)
      .eq('problem_tag', tag)
      .eq('is_active', true)
    if (error) throw new Error(`getResource: ${error.message}`)
    if (data && data.length > 0) return data[Math.floor(Math.random() * data.length)]
  }
  return null
}

/** Convenience: signal in, resource (or null) out. */
export async function getResourceForSignal(
  db: Db,
  primary: PrimarySignal,
): Promise<AgentResource | null> {
  const target = resourceTargetFor(primary)
  if (!target) return null
  return getResource(db, target.module, target.tag)
}
