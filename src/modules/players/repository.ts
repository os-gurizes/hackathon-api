import { sql, type SQL } from 'drizzle-orm'

import type { Database } from '../../db/client.js'
import { decodeCursor, encodeCursor } from '../../shared/cursor.js'
import { filterConditions, type Filters } from '../../shared/filters.js'
import { one, rows, where } from '../../shared/sql.js'
import { fixed, SORT_EXPRESSIONS, STAT_COLUMNS, toStatLine, type StatRow } from '../../shared/stats.js'
import { distance, rate, WEAPON_COLUMNS, weaponFilters, type WeaponRow } from '../stats/weapons.js'
import type {
  PlayerAgent,
  PlayerFilters,
  PlayerMatch,
  PlayerMatchesQuery,
  PlayerProfile,
  PlayersQuery,
  PlayerStats,
  PlayerWeapon,
  RankingItem,
} from './schemas.js'

const STAT_FILTER_COLUMNS = {
  stage: sql`s.stage_id`,
  map: sql`s.map_id`,
  side: sql`s.side`,
  team: sql`s.team_id`,
  player: sql`s.player_id`,
  agent: sql`s.agent_id`,
}

const statFilters = (filters: Filters): Array<SQL | undefined> =>
  filterConditions(filters, STAT_FILTER_COLUMNS)

const escapeLike = (term: string) => term.replaceAll(/[\\%_]/g, (c) => `\\${c}`)

type PlayerRow = { player_id: number; game_name: string; tag_line: string }
const playerRef = (row: PlayerRow) => ({ id: row.player_id, gameName: row.game_name, tagLine: row.tag_line })

export async function playerExists(db: Database, id: number): Promise<boolean> {
  return (await one(db, sql`SELECT 1 AS ok FROM analytics.players WHERE id = ${id}`)) !== undefined
}

export async function ranking(
  db: Database,
  query: PlayersQuery,
): Promise<{ items: RankingItem[]; nextCursor: string | null }> {
  const sortValue = sql`coalesce(${SORT_EXPRESSIONS[query.sort]}, 0)`
  const cursor = query.cursor === undefined ? undefined : decodeCursor(query.cursor)
  const data = await rows<StatRow & PlayerRow & { sort_value: number }>(
    db,
    sql`SELECT p.id AS player_id, p.game_name, p.tag_line, ${STAT_COLUMNS}, ${sortValue} AS sort_value
        FROM analytics.player_match_stats s
        JOIN analytics.players p ON p.id = s.player_id
        WHERE ${where([
          ...statFilters(query),
          query.search === undefined ? undefined : sql`p.game_name ILIKE ${`%${escapeLike(query.search)}%`}`,
        ])}
        GROUP BY p.id
        HAVING sum(s.rounds) >= ${query.minRounds}
          ${cursor === undefined ? sql`` : sql`AND (${sortValue}, p.id) < (${cursor.sortKey}, ${cursor.id})`}
        ORDER BY sort_value DESC, p.id DESC
        LIMIT ${query.limit + 1}`,
  )
  const page = data.slice(0, query.limit)
  const last = page.at(-1)
  return {
    items: page.map((row) => ({
      player: playerRef(row),
      stats: toStatLine(row),
      sortValue: fixed(row.sort_value, 4),
    })),
    nextCursor:
      data.length > query.limit && last
        ? encodeCursor({ sortKey: last.sort_value, id: last.player_id })
        : null,
  }
}

export async function profile(db: Database, id: number): Promise<PlayerProfile | undefined> {
  const player = await one<PlayerRow>(
    db,
    sql`SELECT id AS player_id, game_name, tag_line FROM analytics.players WHERE id = ${id}`,
  )
  if (!player) return undefined
  const [teams, totals, agents] = await Promise.all([
    rows<{ id: number; slug: string; display_name: string; matches: number; last_played_on: string }>(
      db,
      sql`SELECT t.id, t.slug, t.display_name, count(*)::int AS matches,
                 to_char(max(m.played_on), 'YYYY-MM-DD') AS last_played_on
          FROM analytics.match_players mp
          JOIN analytics.teams t ON t.id = mp.team_id
          JOIN analytics.matches m ON m.id = mp.match_id
          WHERE mp.player_id = ${id}
          GROUP BY t.id ORDER BY max(m.played_on) DESC`,
    ),
    one<StatRow>(
      db,
      sql`SELECT ${STAT_COLUMNS} FROM analytics.player_match_stats s WHERE s.player_id = ${id}`,
    ),
    rows<{ id: number; name: string; role: string | null; matches: number }>(
      db,
      sql`SELECT a.id, a.name, a.role, count(*)::int AS matches
          FROM analytics.match_players mp JOIN analytics.agents a ON a.id = mp.agent_id
          WHERE mp.player_id = ${id}
          GROUP BY a.id ORDER BY count(*) DESC, a.name LIMIT 3`,
    ),
  ])
  if (!totals) return undefined
  return {
    player: playerRef(player),
    teams: teams.map((t) => ({
      team: { id: t.id, slug: t.slug, displayName: t.display_name },
      matches: t.matches,
      lastPlayedOn: t.last_played_on,
    })),
    totals: toStatLine(totals),
    topAgents: agents.map((a) => ({ agent: { id: a.id, name: a.name, role: a.role }, matches: a.matches })),
  }
}

function describe(values: number[]): { mean: number; median: number; stdDev: number } {
  if (values.length === 0) return { mean: 0, median: 0, stdDev: 0 }
  const sorted = [...values].sort((a, b) => a - b)
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length
  const middle = Math.floor(sorted.length / 2)
  const median =
    sorted.length % 2 ? (sorted[middle] ?? 0) : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length
  return { mean: fixed(mean, 2), median: fixed(median, 2), stdDev: fixed(Math.sqrt(variance), 2) }
}

export async function playerStats(db: Database, id: number, filters: PlayerFilters): Promise<PlayerStats> {
  const base = where([...statFilters({ ...filters, player: id })])
  const [overall, byMap, byAgent, bySide, perMatch] = await Promise.all([
    one<StatRow>(db, sql`SELECT ${STAT_COLUMNS} FROM analytics.player_match_stats s WHERE ${base}`),
    rows<StatRow & { map_id: number; slug: string; name: string }>(
      db,
      sql`SELECT mp.id AS map_id, mp.slug, mp.name, ${STAT_COLUMNS}
          FROM analytics.player_match_stats s JOIN analytics.maps mp ON mp.id = s.map_id
          WHERE ${base} GROUP BY mp.id ORDER BY sum(s.rounds) DESC`,
    ),
    rows<StatRow & { agent_id: number; agent_name: string; agent_role: string | null }>(
      db,
      sql`SELECT a.id AS agent_id, a.name AS agent_name, a.role AS agent_role, ${STAT_COLUMNS}
          FROM analytics.player_match_stats s JOIN analytics.agents a ON a.id = s.agent_id
          WHERE ${base} GROUP BY a.id ORDER BY sum(s.rounds) DESC`,
    ),
    rows<StatRow & { side: 'attack' | 'defense' }>(
      db,
      sql`SELECT s.side, ${STAT_COLUMNS} FROM analytics.player_match_stats s WHERE ${base} GROUP BY s.side ORDER BY s.side`,
    ),
    rows<{ match_id: number; played_on: string; kd: number }>(
      db,
      sql`SELECT s.match_id, to_char(m.played_on, 'YYYY-MM-DD') AS played_on,
                 sum(s.kills)::float8 / greatest(sum(s.deaths), 1) AS kd
          FROM analytics.player_match_stats s JOIN analytics.matches m ON m.id = s.match_id
          WHERE ${base} GROUP BY s.match_id, m.played_on, m.started_at ORDER BY m.started_at`,
    ),
  ])
  const empty: StatRow = {
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
  return {
    overall: toStatLine(overall && overall.matches > 0 ? overall : empty),
    byMap: byMap.map((r) => ({ map: { id: r.map_id, slug: r.slug, name: r.name }, stats: toStatLine(r) })),
    byAgent: byAgent.map((r) => ({
      agent: { id: r.agent_id, name: r.agent_name, role: r.agent_role },
      stats: toStatLine(r),
    })),
    bySide: bySide.map((r) => ({ side: r.side, stats: toStatLine(r) })),
    kdPerMatch: {
      ...describe(perMatch.map((m) => m.kd)),
      matches: perMatch.map((m) => ({ matchId: m.match_id, playedOn: m.played_on, kd: fixed(m.kd, 2) })),
    },
  }
}

export async function playerMatches(
  db: Database,
  id: number,
  query: PlayerMatchesQuery,
): Promise<{ items: PlayerMatch[]; nextCursor: string | null }> {
  const cursor = query.cursor === undefined ? undefined : decodeCursor(query.cursor)
  const data = await rows<{
    match_id: number
    played_on: string
    started_ms: number
    map_id: number
    map_slug: string
    map_name: string
    team_id: number
    team_slug: string
    team_name: string
    opp_id: number
    opp_slug: string
    opp_name: string
    team_score: number
    opp_score: number
    won: boolean
    agent_id: number
    agent_name: string
    agent_role: string | null
    score: number
    rounds: number
    kills: number
    deaths: number
    assists: number
  }>(
    db,
    sql`SELECT m.id AS match_id, to_char(m.played_on, 'YYYY-MM-DD') AS played_on,
               (extract(epoch FROM m.started_at) * 1000)::float8 AS started_ms,
               map.id AS map_id, map.slug AS map_slug, map.name AS map_name,
               t.id AS team_id, t.slug AS team_slug, t.display_name AS team_name,
               o.id AS opp_id, o.slug AS opp_slug, o.display_name AS opp_name,
               CASE WHEN mp.team_id = m.red_team_id THEN m.red_score ELSE m.blue_score END::int AS team_score,
               CASE WHEN mp.team_id = m.red_team_id THEN m.blue_score ELSE m.red_score END::int AS opp_score,
               m.winner_team_id = mp.team_id AS won,
               a.id AS agent_id, a.name AS agent_name, a.role AS agent_role,
               mp.score, mp.rounds_played AS rounds, mp.kills, mp.deaths, mp.assists
        FROM analytics.match_players mp
        JOIN analytics.matches m ON m.id = mp.match_id
        JOIN analytics.maps map ON map.id = m.map_id
        JOIN analytics.teams t ON t.id = mp.team_id
        JOIN analytics.teams o ON o.id = CASE WHEN mp.team_id = m.red_team_id THEN m.blue_team_id ELSE m.red_team_id END
        JOIN analytics.agents a ON a.id = mp.agent_id
        WHERE ${where([
          sql`mp.player_id = ${id}`,
          query.map === undefined ? undefined : sql`m.map_id = ${query.map}`,
          cursor === undefined
            ? undefined
            : sql`(m.started_at, m.id) < (to_timestamp(${cursor.sortKey / 1000}), ${cursor.id})`,
        ])}
        ORDER BY m.started_at DESC, m.id DESC
        LIMIT ${query.limit + 1}`,
  )
  const page = data.slice(0, query.limit)
  const last = page.at(-1)
  return {
    items: page.map((r) => ({
      matchId: r.match_id,
      playedOn: r.played_on,
      map: { id: r.map_id, slug: r.map_slug, name: r.map_name },
      team: { id: r.team_id, slug: r.team_slug, displayName: r.team_name },
      opponent: { id: r.opp_id, slug: r.opp_slug, displayName: r.opp_name },
      teamScore: r.team_score,
      opponentScore: r.opp_score,
      won: r.won,
      agent: { id: r.agent_id, name: r.agent_name, role: r.agent_role },
      acs: fixed(r.score / Math.max(r.rounds, 1), 1),
      kills: r.kills,
      deaths: r.deaths,
      assists: r.assists,
      kd: fixed(r.kills / Math.max(r.deaths, 1), 2),
    })),
    nextCursor:
      data.length > query.limit && last
        ? encodeCursor({ sortKey: last.started_ms, id: last.match_id })
        : null,
  }
}

export async function playerAgents(db: Database, id: number, filters: PlayerFilters): Promise<PlayerAgent[]> {
  const data = await rows<
    StatRow & { agent_id: number; agent_name: string; agent_role: string | null; baseline: number | null }
  >(
    db,
    sql`SELECT a.id AS agent_id, a.name AS agent_name, a.role AS agent_role, ${STAT_COLUMNS},
               sum(s.rounds * ams.acs)::float8 / nullif(sum(s.rounds) FILTER (WHERE ams.acs IS NOT NULL), 0) AS baseline
        FROM analytics.player_match_stats s
        JOIN analytics.agents a ON a.id = s.agent_id
        LEFT JOIN analytics.agent_map_stats ams ON ams.map_id = s.map_id AND ams.agent_id = s.agent_id
        WHERE ${where(statFilters({ ...filters, player: id }))}
        GROUP BY a.id ORDER BY sum(s.rounds) DESC`,
  )
  return data.map((r) => ({
    agent: { id: r.agent_id, name: r.agent_name, role: r.agent_role },
    stats: toStatLine(r),
    baselineAcs: r.baseline === null ? null : fixed(r.baseline, 1),
  }))
}

export async function playerWeapons(
  db: Database,
  id: number,
  filters: PlayerFilters,
): Promise<PlayerWeapon[]> {
  const [mine, everyone] = await Promise.all([
    rows<WeaponRow>(
      db,
      sql`SELECT ${WEAPON_COLUMNS} FROM analytics.weapon_stats s JOIN analytics.weapons w ON w.id = s.weapon_id
          WHERE ${where(weaponFilters({ ...filters, player: id }))} AND NOT w.is_armor
          GROUP BY w.id HAVING sum(s.kills) > 0 OR sum(s.rounds_equipped) > 0
          ORDER BY sum(s.kills) DESC`,
    ),
    rows<WeaponRow>(
      db,
      sql`SELECT ${WEAPON_COLUMNS} FROM analytics.weapon_stats s JOIN analytics.weapons w ON w.id = s.weapon_id
          WHERE ${where(weaponFilters(filters))} AND NOT w.is_armor GROUP BY w.id`,
    ),
  ])
  const baseline = new Map(everyone.map((w) => [w.weapon_id, w]))
  return mine.map((w) => {
    const base = baseline.get(w.weapon_id)
    return {
      weapon: { id: w.weapon_id, name: w.name, category: w.category },
      kills: w.kills,
      firstKills: w.first_kills,
      roundsEquipped: w.rounds,
      winRateEquipped: rate(w.rounds_won, w.rounds),
      headshotRateEquipped: rate(w.hs, w.shots),
      averageDistance: distance(w.distance_sum, w.distance_n),
      killsByDistance: { under10: w.d0, from10to20: w.d10, from20to30: w.d20, over30: w.d30 },
      baseline: {
        winRateEquipped: base ? rate(base.rounds_won, base.rounds) : 0,
        headshotRateEquipped: base ? rate(base.hs, base.shots) : 0,
        averageDistance: base ? distance(base.distance_sum, base.distance_n) : null,
      },
    }
  })
}
