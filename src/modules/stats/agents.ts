import { sql } from 'drizzle-orm'
import { Type, type Static } from 'typebox'

import type { Database } from '../../db/client.js'
import { AgentRef, Rate } from '../../shared/schema.js'
import { rows } from '../../shared/sql.js'
import { fixed } from '../../shared/stats.js'

const PRIOR_ROUNDS = 200
const PRIOR_DEATHS = 140

export const AgentStatsQuery = Type.Object({ map: Type.Optional(Type.Integer({ minimum: 1 })) })

export const AgentStat = Type.Object({
  agent: AgentRef,
  picks: Type.Integer(),
  pickRate: Rate,
  rounds: Type.Integer(),
  winRate: Rate,
  acs: Type.Number(),
  kd: Type.Number(),
  acsAdjusted: Type.Number(),
  kdAdjusted: Type.Number(),
})

export type AgentStat = Static<typeof AgentStat>

export async function agentStats(db: Database, mapId: number | undefined): Promise<AgentStat[]> {
  const scope = mapId === undefined ? sql`TRUE` : sql`s.map_id = ${mapId}`
  const data = await rows<{
    id: number
    name: string
    role: string | null
    picks: number
    slots: number
    rounds: number
    won: number
    score: number
    kills: number
    deaths: number
    prior_acs: number
    prior_kd: number
  }>(
    db,
    sql`WITH scoped AS (SELECT * FROM analytics.player_match_stats s WHERE ${scope}),
        prior AS (
          SELECT sum(score)::float8 / sum(rounds) AS acs, sum(kills)::float8 / greatest(sum(deaths), 1) AS kd,
                 count(DISTINCT match_id) * 2 AS slots
          FROM scoped
        )
        SELECT a.id, a.name, a.role, count(DISTINCT (s.match_id, s.team_id))::int AS picks, prior.slots::int AS slots,
               sum(s.rounds)::int AS rounds, sum(s.rounds_won)::int AS won, sum(s.score)::int AS score,
               sum(s.kills)::int AS kills, sum(s.deaths)::int AS deaths, prior.acs AS prior_acs, prior.kd AS prior_kd
        FROM scoped s JOIN analytics.agents a ON a.id = s.agent_id CROSS JOIN prior
        GROUP BY a.id, prior.acs, prior.kd, prior.slots
        ORDER BY (sum(s.score) + ${PRIOR_ROUNDS} * prior.acs) / (sum(s.rounds) + ${PRIOR_ROUNDS}) DESC`,
  )
  return data.map((r) => ({
    agent: { id: r.id, name: r.name, role: r.role },
    picks: r.picks,
    pickRate: r.slots === 0 ? 0 : fixed(r.picks / r.slots, 3),
    rounds: r.rounds,
    winRate: r.rounds === 0 ? 0 : fixed(r.won / r.rounds, 3),
    acs: fixed(r.score / Math.max(r.rounds, 1), 1),
    kd: fixed(r.kills / Math.max(r.deaths, 1), 2),
    acsAdjusted: fixed((r.score + PRIOR_ROUNDS * r.prior_acs) / (r.rounds + PRIOR_ROUNDS), 1),
    kdAdjusted: fixed((r.kills + PRIOR_DEATHS * r.prior_kd) / (r.deaths + PRIOR_DEATHS), 2),
  }))
}
