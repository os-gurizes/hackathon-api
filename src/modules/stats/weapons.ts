import { sql } from 'drizzle-orm'
import { Type, type Static } from 'typebox'

import type { Database } from '../../db/client.js'
import { filterConditions, type Filters } from '../../shared/filters.js'
import { Nullable, Rate } from '../../shared/schema.js'
import { rows, where } from '../../shared/sql.js'
import { fixed } from '../../shared/stats.js'

export type WeaponRow = {
  weapon_id: number
  name: string
  category: string | null
  kills: number
  first_kills: number
  rounds: number
  rounds_won: number
  hs: number
  shots: number
  distance_sum: number
  distance_n: number
  d0: number
  d10: number
  d20: number
  d30: number
}

export const WEAPON_COLUMNS = sql`
  w.id AS weapon_id, w.name, w.category, sum(s.kills)::int AS kills, sum(s.first_kills)::int AS first_kills,
  sum(s.rounds_equipped)::int AS rounds, sum(s.rounds_won_equipped)::int AS rounds_won,
  sum(s.headshots_equipped)::int AS hs,
  sum(s.headshots_equipped + s.bodyshots_equipped + s.legshots_equipped)::int AS shots,
  sum(s.distance_sum_m)::float8 AS distance_sum, sum(s.distance_samples)::int AS distance_n,
  sum(s.kills_0_10m)::int AS d0, sum(s.kills_10_20m)::int AS d10, sum(s.kills_20_30m)::int AS d20,
  sum(s.kills_30m_plus)::int AS d30`

const WEAPON_FILTER_COLUMNS = {
  stage: sql`s.stage_id`,
  map: sql`s.map_id`,
  side: sql`s.side`,
  team: sql`s.team_id`,
  player: sql`s.player_id`,
  agent: sql`s.agent_id`,
}

export const weaponFilters = (filters: Filters) => filterConditions(filters, WEAPON_FILTER_COLUMNS)

export const rate = (part: number, total: number) => (total === 0 ? 0 : fixed(part / total, 3))
export const distance = (sum: number, n: number) => (n === 0 ? null : fixed(sum / n, 1))

export const WeaponStat = Type.Object({
  weapon: Type.Object({
    id: Type.Integer(),
    name: Type.String(),
    category: Nullable(Type.String()),
    cost: Nullable(Type.Integer()),
  }),
  kills: Type.Integer(),
  firstKills: Type.Integer(),
  roundsEquipped: Type.Integer(),
  killsPerRoundEquipped: Type.Number(),
  winRateEquipped: Rate,
  headshotRateEquipped: Rate,
  averageDistance: Nullable(Type.Number()),
  costPerKill: Nullable(Type.Number()),
  killsByDistance: Type.Object({
    under10: Type.Integer(),
    from10to20: Type.Integer(),
    from20to30: Type.Integer(),
    over30: Type.Integer(),
  }),
})

export type WeaponStat = Static<typeof WeaponStat>

export async function weaponStats(db: Database, filters: Filters): Promise<WeaponStat[]> {
  const data = await rows<WeaponRow & { cost: number | null }>(
    db,
    sql`SELECT ${WEAPON_COLUMNS}, w.cost FROM analytics.weapon_stats s JOIN analytics.weapons w ON w.id = s.weapon_id
        WHERE ${where(weaponFilters(filters))} AND NOT w.is_armor
        GROUP BY w.id HAVING sum(s.kills) > 0 ORDER BY sum(s.kills) DESC`,
  )
  return data.map((w) => ({
    weapon: { id: w.weapon_id, name: w.name, category: w.category, cost: w.cost },
    kills: w.kills,
    firstKills: w.first_kills,
    roundsEquipped: w.rounds,
    killsPerRoundEquipped: w.rounds === 0 ? 0 : fixed(w.kills / w.rounds, 3),
    winRateEquipped: rate(w.rounds_won, w.rounds),
    headshotRateEquipped: rate(w.hs, w.shots),
    averageDistance: distance(w.distance_sum, w.distance_n),
    costPerKill: w.cost === null || w.kills === 0 ? null : fixed((w.cost * w.rounds) / w.kills, 0),
    killsByDistance: { under10: w.d0, from10to20: w.d10, from20to30: w.d20, over30: w.d30 },
  }))
}
