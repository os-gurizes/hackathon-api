import { sql, type SQL } from 'drizzle-orm'
import { Type, type Static } from 'typebox'

import { Side } from './schema.js'

export const Filters = {
  tournament: Type.Optional(Type.Integer({ minimum: 1, maximum: 32767 })),
  stage: Type.Optional(Type.Integer({ minimum: 1, maximum: 32767 })),
  map: Type.Optional(Type.Integer({ minimum: 1, maximum: 32767 })),
  side: Type.Optional(Side),
  team: Type.Optional(Type.Integer({ minimum: 1, maximum: 2147483647 })),
  player: Type.Optional(Type.Integer({ minimum: 1, maximum: 2147483647 })),
  agent: Type.Optional(Type.Integer({ minimum: 1, maximum: 32767 })),
}

export const FiltersQuery = Type.Object(Filters)
export type Filters = Static<typeof FiltersQuery>

export type FilterColumns = {
  stage?: SQL
  map?: SQL
  side?: SQL
  team?: SQL
  player?: SQL
  agent?: SQL
}

export function filterConditions(filters: Filters, columns: FilterColumns): Array<SQL | undefined> {
  const equals = (column: SQL | undefined, value: number | string | undefined) =>
    column && value !== undefined ? sql`${column} = ${value}` : undefined
  return [
    filters.tournament !== undefined && columns.stage
      ? sql`${columns.stage} IN (SELECT id FROM analytics.stages WHERE tournament_id = ${filters.tournament})`
      : undefined,
    equals(columns.stage, filters.stage),
    equals(columns.map, filters.map),
    equals(columns.side, filters.side),
    equals(columns.team, filters.team),
    equals(columns.player, filters.player),
    equals(columns.agent, filters.agent),
  ]
}
