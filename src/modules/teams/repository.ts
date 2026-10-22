import { sql } from 'drizzle-orm'

import type { Database } from '../../db/client.js'
import { one, rows } from '../../shared/sql.js'
import { fixed } from '../../shared/stats.js'
import type { TeamProfile, TeamsQuery, TeamSummary } from './schemas.js'

type SummaryRow = { id: number; slug: string; display_name: string; matches: number; wins: number }

const toSummary = (row: SummaryRow): TeamSummary => ({
  team: { id: row.id, slug: row.slug, displayName: row.display_name },
  matches: row.matches,
  wins: row.wins,
  winRate: row.matches === 0 ? 0 : fixed(row.wins / row.matches, 3),
})

const TEAM_MATCHES = sql`
  SELECT t.id, t.slug, t.display_name, count(m.id)::int AS matches,
         count(m.id) FILTER (WHERE m.winner_team_id = t.id)::int AS wins
  FROM analytics.teams t
  JOIN analytics.matches m ON t.id IN (m.red_team_id, m.blue_team_id)
  JOIN analytics.series s ON s.id = m.series_id
  JOIN analytics.stages st ON st.id = s.stage_id`

export async function listTeams(db: Database, query: TeamsQuery): Promise<TeamSummary[]> {
  const data = await rows<SummaryRow>(
    db,
    sql`${TEAM_MATCHES}
        ${query.tournament === undefined ? sql`` : sql`WHERE st.tournament_id = ${query.tournament}`}
        GROUP BY t.id ORDER BY count(m.id) DESC, t.display_name`,
  )
  return data.map(toSummary)
}

export async function teamExists(db: Database, id: number): Promise<boolean> {
  return (await one(db, sql`SELECT 1 AS ok FROM analytics.teams WHERE id = ${id}`)) !== undefined
}

export async function teamProfile(db: Database, id: number): Promise<TeamProfile | undefined> {
  const summary = await one<SummaryRow>(db, sql`${TEAM_MATCHES} WHERE t.id = ${id} GROUP BY t.id`)
  if (!summary) return undefined
  const [roster, maps] = await Promise.all([
    rows<{
      tournament_id: number
      tournament: string
      player_id: number
      game_name: string
      tag_line: string
      matches: number
    }>(
      db,
      sql`SELECT tr.id AS tournament_id, tr.name AS tournament, p.id AS player_id, p.game_name, p.tag_line,
                 count(*)::int AS matches
          FROM analytics.match_players mp
          JOIN analytics.players p ON p.id = mp.player_id
          JOIN analytics.matches m ON m.id = mp.match_id
          JOIN analytics.series s ON s.id = m.series_id
          JOIN analytics.stages st ON st.id = s.stage_id
          JOIN analytics.tournaments tr ON tr.id = st.tournament_id
          WHERE mp.team_id = ${id}
          GROUP BY tr.id, p.id
          ORDER BY tr.name, count(*) DESC, p.game_name`,
    ),
    rows<{
      map_id: number
      slug: string
      name: string
      matches: number
      wins: number
      attack_rounds: number
      attack_won: number
      defense_rounds: number
      defense_won: number
    }>(
      db,
      sql`SELECT mp.id AS map_id, mp.slug, mp.name, count(DISTINCT m.id)::int AS matches,
                 count(DISTINCT m.id) FILTER (WHERE m.winner_team_id = ${id})::int AS wins,
                 count(r.id) FILTER (WHERE r.attack_team_id = ${id})::int AS attack_rounds,
                 count(r.id) FILTER (WHERE r.attack_team_id = ${id} AND r.winner_team_id = ${id})::int AS attack_won,
                 count(r.id) FILTER (WHERE r.defense_team_id = ${id})::int AS defense_rounds,
                 count(r.id) FILTER (WHERE r.defense_team_id = ${id} AND r.winner_team_id = ${id})::int AS defense_won
          FROM analytics.matches m
          JOIN analytics.maps mp ON mp.id = m.map_id
          JOIN analytics.rounds r ON r.match_id = m.id
          WHERE ${id} IN (m.red_team_id, m.blue_team_id)
          GROUP BY mp.id ORDER BY count(DISTINCT m.id) DESC`,
    ),
  ])
  const rosters = new Map<number, TeamProfile['rosters'][number]>()
  for (const row of roster) {
    const entry = rosters.get(row.tournament_id) ?? {
      tournament: { id: row.tournament_id, name: row.tournament },
      players: [],
    }
    entry.players.push({
      player: { id: row.player_id, gameName: row.game_name, tagLine: row.tag_line },
      matches: row.matches,
    })
    rosters.set(row.tournament_id, entry)
  }
  const rate = (won: number, total: number) => (total === 0 ? 0 : fixed(won / total, 3))
  return {
    ...toSummary(summary),
    rosters: [...rosters.values()],
    maps: maps.map((m) => ({
      map: { id: m.map_id, slug: m.slug, name: m.name },
      matches: m.matches,
      wins: m.wins,
      attackRoundWinRate: rate(m.attack_won, m.attack_rounds),
      defenseRoundWinRate: rate(m.defense_won, m.defense_rounds),
    })),
  }
}
