import { sql } from 'drizzle-orm'
import { Type, type Static } from 'typebox'

import { Literals, Rate } from './schema.js'

export const StatLine = Type.Object({
  matches: Type.Integer(),
  rounds: Type.Integer(),
  roundWinRate: Rate,
  acs: Type.Number(),
  kd: Type.Number(),
  kills: Type.Integer(),
  deaths: Type.Integer(),
  assists: Type.Integer(),
  adr: Type.Number(),
  kast: Rate,
  headshotRate: Rate,
  firstKills: Type.Integer(),
  firstDeaths: Type.Integer(),
  clutchWins: Type.Integer(),
  clutchAttempts: Type.Integer(),
  multikills: Type.Integer(),
})

export type StatLine = Static<typeof StatLine>

export type StatRow = {
  matches: number
  rounds: number
  rounds_won: number
  score: number
  kills: number
  deaths: number
  assists: number
  damage: number
  headshots: number
  shots: number
  kast_rounds: number
  first_kills: number
  first_deaths: number
  clutch_wins: number
  clutch_attempts: number
  multikills: number
}

export const STAT_COLUMNS = sql`
  count(DISTINCT s.match_id)::int AS matches, sum(s.rounds)::int AS rounds, sum(s.rounds_won)::int AS rounds_won,
  sum(s.score)::int AS score, sum(s.kills)::int AS kills, sum(s.deaths)::int AS deaths,
  sum(s.assists)::int AS assists, sum(s.damage)::int AS damage, sum(s.headshots)::int AS headshots,
  sum(s.headshots + s.bodyshots + s.legshots)::int AS shots, sum(s.kast_rounds)::int AS kast_rounds,
  sum(s.first_kills)::int AS first_kills, sum(s.first_deaths)::int AS first_deaths,
  sum(s.clutch_wins)::int AS clutch_wins, sum(s.clutch_attempts)::int AS clutch_attempts,
  sum(s.multikills_2 + s.multikills_3 + s.multikills_4 + s.multikills_5)::int AS multikills`

export const EMPTY_STATS: StatRow = {
  matches: 0,
  rounds: 0,
  rounds_won: 0,
  score: 0,
  kills: 0,
  deaths: 0,
  assists: 0,
  damage: 0,
  headshots: 0,
  shots: 0,
  kast_rounds: 0,
  first_kills: 0,
  first_deaths: 0,
  clutch_wins: 0,
  clutch_attempts: 0,
  multikills: 0,
}

export const fixed = (value: number, digits: number): number => Number(value.toFixed(digits))
const ratio = (part: number, total: number, digits = 3) => (total === 0 ? 0 : fixed(part / total, digits))

export function toStatLine(row: StatRow): StatLine {
  return {
    matches: row.matches,
    rounds: row.rounds,
    roundWinRate: ratio(row.rounds_won, row.rounds),
    acs: ratio(row.score, row.rounds, 1),
    kd: fixed(row.kills / Math.max(row.deaths, 1), 2),
    kills: row.kills,
    deaths: row.deaths,
    assists: row.assists,
    adr: ratio(row.damage, row.rounds, 1),
    kast: ratio(row.kast_rounds, row.rounds),
    headshotRate: ratio(row.headshots, row.shots),
    firstKills: row.first_kills,
    firstDeaths: row.first_deaths,
    clutchWins: row.clutch_wins,
    clutchAttempts: row.clutch_attempts,
    multikills: row.multikills,
  }
}

export const SORT_EXPRESSIONS = {
  acs: sql`sum(s.score)::float8 / nullif(sum(s.rounds), 0)`,
  kd: sql`sum(s.kills)::float8 / greatest(sum(s.deaths), 1)`,
  adr: sql`sum(s.damage)::float8 / nullif(sum(s.rounds), 0)`,
  kast: sql`sum(s.kast_rounds)::float8 / nullif(sum(s.rounds), 0)`,
  hs: sql`sum(s.headshots)::float8 / nullif(sum(s.headshots + s.bodyshots + s.legshots), 0)`,
  fk: sql`sum(s.first_kills)::float8 / nullif(sum(s.rounds), 0)`,
} as const

export type SortKey = keyof typeof SORT_EXPRESSIONS

export const SortQuery = Literals(['acs', 'kd', 'adr', 'kast', 'hs', 'fk'], { default: 'acs' })
