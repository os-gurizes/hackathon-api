import { sql, type SQL } from 'drizzle-orm'

import type { Database } from '../../db/client.js'
import { decodeCursor, encodeCursor } from '../../shared/cursor.js'
import { filterConditions } from '../../shared/filters.js'
import { one, rows, where } from '../../shared/sql.js'
import type { MatchDetail, MatchesQuery, MatchSummary, Replay, ReplayEvent, RoundSummary } from './schemas.js'

type SummaryRow = {
  id: number
  series_id: number
  game: string
  played_on: string
  started_at: string
  started_ms: number
  duration_ms: number
  tournament: string
  stage_id: number
  stage_name: string
  map_id: number
  map_slug: string
  map_name: string
  red_id: number
  red_slug: string
  red_name: string
  red_score: number
  blue_id: number
  blue_slug: string
  blue_name: string
  blue_score: number
  winner_team_id: number
  game_version: string
}

const SUMMARY_SELECT = sql`
  SELECT m.id, m.series_id, m.game_letter AS game, to_char(m.played_on, 'YYYY-MM-DD') AS played_on,
         to_char(m.started_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS started_at,
         (extract(epoch FROM m.started_at) * 1000)::float8 AS started_ms, m.duration_ms,
         t.name AS tournament, st.id AS stage_id, st.name AS stage_name,
         mp.id AS map_id, mp.slug AS map_slug, mp.name AS map_name,
         red.id AS red_id, red.slug AS red_slug, red.display_name AS red_name, m.red_score,
         blue.id AS blue_id, blue.slug AS blue_slug, blue.display_name AS blue_name, m.blue_score,
         m.winner_team_id, m.game_version
  FROM analytics.matches m
  JOIN analytics.series s ON s.id = m.series_id
  JOIN analytics.stages st ON st.id = s.stage_id
  JOIN analytics.tournaments t ON t.id = st.tournament_id
  JOIN analytics.maps mp ON mp.id = m.map_id
  JOIN analytics.teams red ON red.id = m.red_team_id
  JOIN analytics.teams blue ON blue.id = m.blue_team_id`

function toSummary(row: SummaryRow): MatchSummary {
  return {
    id: row.id,
    seriesId: row.series_id,
    game: row.game,
    playedOn: row.played_on,
    startedAt: row.started_at,
    durationMs: row.duration_ms,
    tournament: row.tournament,
    stage: { id: row.stage_id, name: row.stage_name },
    map: { id: row.map_id, slug: row.map_slug, name: row.map_name },
    red: { team: { id: row.red_id, slug: row.red_slug, displayName: row.red_name }, score: row.red_score },
    blue: {
      team: { id: row.blue_id, slug: row.blue_slug, displayName: row.blue_name },
      score: row.blue_score,
    },
    winnerTeamId: row.winner_team_id,
  }
}

export async function listMatches(
  db: Database,
  query: MatchesQuery,
): Promise<{ items: MatchSummary[]; nextCursor: string | null }> {
  const cursor = query.cursor === undefined ? undefined : decodeCursor(query.cursor)
  const conditions: Array<SQL | undefined> = [
    ...filterConditions(query, { stage: sql`s.stage_id`, map: sql`m.map_id` }),
    query.team === undefined ? undefined : sql`${query.team} IN (m.red_team_id, m.blue_team_id)`,
    query.player === undefined
      ? undefined
      : sql`EXISTS (SELECT 1 FROM analytics.match_players x WHERE x.match_id = m.id AND x.player_id = ${query.player})`,
    cursor === undefined
      ? undefined
      : sql`(m.started_at, m.id) < (to_timestamp(${cursor.sortKey / 1000}), ${cursor.id})`,
  ]
  const data = await rows<SummaryRow>(
    db,
    sql`${SUMMARY_SELECT} WHERE ${where(conditions)} ORDER BY m.started_at DESC, m.id DESC LIMIT ${query.limit + 1}`,
  )
  const page = data.slice(0, query.limit)
  const last = page.at(-1)
  return {
    items: page.map(toSummary),
    nextCursor:
      data.length > query.limit && last ? encodeCursor({ sortKey: last.started_ms, id: last.id }) : null,
  }
}

export async function matchDetail(db: Database, id: number): Promise<MatchDetail | undefined> {
  const header = await one<SummaryRow>(db, sql`${SUMMARY_SELECT} WHERE m.id = ${id}`)
  if (!header) return undefined
  const lines = await rows<{
    player_id: number
    game_name: string
    tag_line: string
    team_id: number
    agent_id: number
    agent_name: string
    agent_role: string | null
    rounds: number
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
    plants: number
    defuses: number
  }>(
    db,
    sql`SELECT p.id AS player_id, p.game_name, p.tag_line, s.team_id, a.id AS agent_id, a.name AS agent_name,
               a.role AS agent_role, sum(s.rounds)::int AS rounds, sum(s.score)::int AS score,
               sum(s.kills)::int AS kills, sum(s.deaths)::int AS deaths, sum(s.assists)::int AS assists,
               sum(s.damage)::int AS damage, sum(s.headshots)::int AS headshots,
               sum(s.headshots + s.bodyshots + s.legshots)::int AS shots, sum(s.kast_rounds)::int AS kast_rounds,
               sum(s.first_kills)::int AS first_kills, sum(s.first_deaths)::int AS first_deaths,
               sum(s.plants)::int AS plants, sum(s.defuses)::int AS defuses
        FROM analytics.player_match_stats s
        JOIN analytics.players p ON p.id = s.player_id
        JOIN analytics.agents a ON a.id = s.agent_id
        WHERE s.match_id = ${id}
        GROUP BY p.id, s.team_id, a.id
        ORDER BY s.team_id, sum(s.score) DESC`,
  )
  return {
    ...toSummary(header),
    gameVersion: header.game_version,
    scoreboard: lines.map((l) => ({
      player: { id: l.player_id, gameName: l.game_name, tagLine: l.tag_line },
      teamId: l.team_id,
      agent: { id: l.agent_id, name: l.agent_name, role: l.agent_role },
      rounds: l.rounds,
      acs: round(l.score / l.rounds, 1),
      kills: l.kills,
      deaths: l.deaths,
      assists: l.assists,
      kd: round(l.kills / Math.max(l.deaths, 1), 2),
      adr: round(l.damage / l.rounds, 1),
      headshotRate: l.shots === 0 ? 0 : round(l.headshots / l.shots, 3),
      kast: round(l.kast_rounds / l.rounds, 3),
      firstKills: l.first_kills,
      firstDeaths: l.first_deaths,
      plants: l.plants,
      defuses: l.defuses,
    })),
  }
}

const round = (value: number, digits: number) => Number(value.toFixed(digits))

export async function matchRounds(db: Database, matchId: number): Promise<RoundSummary[] | undefined> {
  const exists = await one(db, sql`SELECT 1 AS ok FROM analytics.matches WHERE id = ${matchId}`)
  if (!exists) return undefined
  const [summary, buys, curve] = await Promise.all([
    rows<{
      id: string
      number: number
      winner_team_id: number
      winner_side: 'attack' | 'defense'
      attack_team_id: number
      defense_team_id: number
      result_code: string
      plant_site: string | null
      plant_time_ms: number | null
    }>(
      db,
      sql`SELECT id, number, winner_team_id, winner_side, attack_team_id, defense_team_id, result_code,
                 plant_site, plant_time_ms
          FROM analytics.rounds WHERE match_id = ${matchId} ORDER BY number`,
    ),
    rows<{
      round_id: string
      team_id: number
      buy_type: RoundSummary['buys'][number]['buyType']
      loadout: number
    }>(
      db,
      sql`SELECT e.round_id, e.team_id, e.buy_type, e.loadout
          FROM analytics.round_team_economy e WHERE e.match_id = ${matchId} ORDER BY e.round_id, e.team_id`,
    ),
    rows<{ round_id: string; t_round_ms: number; event: 'start' | 'kill' | 'plant'; wp_attack: number }>(
      db,
      sql`SELECT w.round_id, w.t_round_ms, w.event, w.wp_attack
          FROM analytics.round_wp_states w
          JOIN analytics.rounds r ON r.id = w.round_id
          WHERE r.match_id = ${matchId} AND w.event <> 'pre_kill'
          ORDER BY w.round_id, w.seq`,
    ),
  ])
  return summary.map((r) => ({
    number: r.number,
    winnerTeamId: r.winner_team_id,
    winnerSide: r.winner_side,
    attackTeamId: r.attack_team_id,
    defenseTeamId: r.defense_team_id,
    resultCode: r.result_code,
    plantSite: r.plant_site,
    plantTimeMs: r.plant_time_ms,
    buys: buys
      .filter((b) => b.round_id === r.id)
      .map((b) => ({ teamId: b.team_id, buyType: b.buy_type, loadout: b.loadout })),
    winProbability: curve
      .filter((w) => w.round_id === r.id)
      .map((w) => ({ tMs: w.t_round_ms, event: w.event, attack: round(w.wp_attack, 3) })),
  }))
}

export async function roundReplay(
  db: Database,
  matchId: number,
  number: number,
): Promise<Replay | undefined> {
  const header = await one<{
    id: string
    map_id: number
    winner_team_id: number
    result_code: string
    plant_time_ms: number | null
    plant_site: string | null
    planter_id: number | null
    plant_nx: number | null
    plant_ny: number | null
    defuse_time_ms: number | null
    defuser_id: number | null
  }>(
    db,
    sql`SELECT r.id, m.map_id, r.winner_team_id, r.result_code, r.plant_time_ms, r.plant_site, r.planter_id,
               r.plant_nx, r.plant_ny, r.defuse_time_ms, r.defuser_id
        FROM analytics.rounds r JOIN analytics.matches m ON m.id = r.match_id
        WHERE r.match_id = ${matchId} AND r.number = ${number}`,
  )
  if (!header) return undefined
  const [players, kills, assists, positions] = await Promise.all([
    rows<{
      player_id: number
      game_name: string
      tag_line: string
      team_id: number
      side: 'attack' | 'defense'
      agent_id: number
      agent_name: string
      agent_role: string | null
      loadout_value: number
    }>(
      db,
      sql`SELECT p.id AS player_id, p.game_name, p.tag_line, rp.team_id, rp.side, a.id AS agent_id,
                 a.name AS agent_name, a.role AS agent_role, rp.loadout_value
          FROM analytics.round_players rp
          JOIN analytics.players p ON p.id = rp.player_id
          JOIN analytics.match_players mp ON mp.match_id = ${matchId} AND mp.player_id = rp.player_id
          JOIN analytics.agents a ON a.id = mp.agent_id
          WHERE rp.round_id = ${header.id}
          ORDER BY rp.side, p.game_name`,
    ),
    rows<{
      id: string
      t_round_ms: number
      killer_id: number | null
      victim_id: number
      kind: 'enemy' | 'team' | 'self'
      damage_type: string
      weapon_id: number | null
      ability_slot: string | null
      is_first_kill: boolean
      is_trade: boolean
      killer_nx: number | null
      killer_ny: number | null
      victim_nx: number | null
      victim_ny: number | null
    }>(
      db,
      sql`SELECT id, t_round_ms, killer_id, victim_id, kind, damage_type, weapon_id, ability_slot, is_first_kill,
                 is_trade, killer_nx, killer_ny, victim_nx, victim_ny
          FROM analytics.kills WHERE round_id = ${header.id} ORDER BY seq`,
    ),
    rows<{ kill_id: string; player_id: number }>(
      db,
      sql`SELECT ka.kill_id, ka.player_id FROM analytics.kill_assists ka
          JOIN analytics.kills k ON k.id = ka.kill_id WHERE k.round_id = ${header.id}`,
    ),
    rows<{
      kill_id: string
      player_id: number
      side: 'attack' | 'defense'
      nx: number | null
      ny: number | null
      view_rad: number
    }>(
      db,
      sql`SELECT kill_id, player_id, side, nx, ny, view_rad
          FROM analytics.position_samples WHERE round_id = ${header.id} ORDER BY kill_id, player_id`,
    ),
  ])
  const point = (x: number | null, y: number | null) => (x === null || y === null ? null : { x, y })
  const events: ReplayEvent[] = kills.map((k) => ({
    type: 'kill' as const,
    tMs: k.t_round_ms,
    killerId: k.killer_id,
    victimId: k.victim_id,
    kind: k.kind,
    damageType: k.damage_type,
    weaponId: k.weapon_id,
    abilitySlot: k.ability_slot,
    isFirstKill: k.is_first_kill,
    isTrade: k.is_trade,
    killerAt: point(k.killer_nx, k.killer_ny),
    victimAt: point(k.victim_nx, k.victim_ny),
    assistIds: assists.filter((a) => a.kill_id === k.id).map((a) => a.player_id),
    positions: positions
      .filter((p) => p.kill_id === k.id && p.nx !== null && p.ny !== null)
      .map((p) => ({ playerId: p.player_id, side: p.side, x: p.nx ?? 0, y: p.ny ?? 0, view: p.view_rad })),
  }))
  if (header.plant_time_ms !== null) {
    events.push({
      type: 'plant',
      tMs: header.plant_time_ms,
      playerId: header.planter_id,
      site: header.plant_site,
      at: point(header.plant_nx, header.plant_ny),
    })
  }
  if (header.defuse_time_ms !== null) {
    events.push({
      type: 'defuse',
      tMs: header.defuse_time_ms,
      playerId: header.defuser_id,
      site: header.plant_site,
      at: null,
    })
  }
  events.sort((a, b) => a.tMs - b.tMs)
  return {
    matchId,
    number,
    mapId: header.map_id,
    winnerTeamId: header.winner_team_id,
    resultCode: header.result_code,
    players: players.map((p) => ({
      player: { id: p.player_id, gameName: p.game_name, tagLine: p.tag_line },
      teamId: p.team_id,
      side: p.side,
      agent: { id: p.agent_id, name: p.agent_name, role: p.agent_role },
      loadout: p.loadout_value,
    })),
    events,
  }
}
