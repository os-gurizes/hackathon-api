import { sql } from 'drizzle-orm'
import { Type, type Static } from 'typebox'

import type { Database } from '../db/client.js'
import { rows } from './sql.js'

export const RoundRef = Type.Object({ matchId: Type.Integer(), number: Type.Integer() })
export type RoundRef = Static<typeof RoundRef>

export async function roundRefs(
  db: Database,
  ids: ReadonlyArray<string | number>,
): Promise<Map<string, RoundRef>> {
  if (ids.length === 0) return new Map()
  const data = await rows<{ id: string; match_id: number; number: number }>(
    db,
    sql`SELECT id, match_id, number FROM analytics.rounds
        WHERE id = ANY(ARRAY[${sql.join(
          ids.map((id) => sql`${String(id)}`),
          sql`, `,
        )}]::bigint[])`,
  )
  return new Map(data.map((r) => [String(r.id), { matchId: r.match_id, number: r.number }]))
}

export function pick(refs: Map<string, RoundRef>, ids: ReadonlyArray<string | number>): RoundRef[] {
  return ids.flatMap((id) => {
    const ref = refs.get(String(id))
    return ref ? [ref] : []
  })
}
