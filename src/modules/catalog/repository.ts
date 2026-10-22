import { sql } from 'drizzle-orm'

import type { Database } from '../../db/client.js'
import { one, rows } from '../../shared/sql.js'
import type {
  Agent,
  MapDetail,
  MapSummary,
  SeriesDetail,
  StageStandings,
  Tournament,
  Weapon,
} from './schemas.js'

const SVG_SIZE = 1000

export async function listTournaments(db: Database): Promise<Tournament[]> {
  const data = await rows<{
    tournament_id: number
    tournament_slug: string
    tournament_name: string
    id: number
    slug: string
    name: string
    sort_order: number
    matches: number
  }>(
    db,
    sql`SELECT t.id AS tournament_id, t.slug AS tournament_slug, t.name AS tournament_name,
               st.id, st.slug, st.name, st.sort_order, count(m.id)::int AS matches
        FROM analytics.tournaments t
        JOIN analytics.stages st ON st.tournament_id = t.id
        LEFT JOIN analytics.series s ON s.stage_id = st.id
        LEFT JOIN analytics.matches m ON m.series_id = s.id
        GROUP BY t.id, st.id
        ORDER BY t.name, st.sort_order`,
  )
  const byId = new Map<number, Tournament>()
  for (const row of data) {
    const tournament = byId.get(row.tournament_id) ?? {
      id: row.tournament_id,
      slug: row.tournament_slug,
      name: row.tournament_name,
      stages: [],
    }
    tournament.stages.push({
      id: row.id,
      slug: row.slug,
      name: row.name,
      order: row.sort_order,
      matches: row.matches,
    })
    byId.set(row.tournament_id, tournament)
  }
  return [...byId.values()]
}

export async function tournamentExists(db: Database, id: number): Promise<boolean> {
  return (await one(db, sql`SELECT 1 AS ok FROM analytics.tournaments WHERE id = ${id}`)) !== undefined
}

export async function standings(
  db: Database,
  tournamentId: number,
  stageId?: number,
): Promise<StageStandings[]> {
  const data = await rows<{
    stage_id: number
    stage_name: string
    team_id: number
    slug: string
    display_name: string
    series_played: number
    series_won: number
    maps_won: number
    maps_lost: number
    round_diff: number
  }>(
    db,
    sql`WITH team_maps AS (
          SELECT s.stage_id, s.id AS series_id, side.team_id,
                 (m.winner_team_id = side.team_id) AS won,
                 CASE WHEN side.team_id = m.red_team_id THEN m.red_score - m.blue_score
                      ELSE m.blue_score - m.red_score END AS diff
          FROM analytics.matches m
          JOIN analytics.series s ON s.id = m.series_id
          CROSS JOIN LATERAL (VALUES (m.red_team_id), (m.blue_team_id)) AS side(team_id)
        )
        SELECT st.id AS stage_id, st.name AS stage_name, tm.team_id, t.slug, t.display_name,
               count(DISTINCT tm.series_id)::int AS series_played,
               count(DISTINCT tm.series_id) FILTER (WHERE se.winner_team_id = tm.team_id)::int AS series_won,
               count(*) FILTER (WHERE tm.won)::int AS maps_won,
               count(*) FILTER (WHERE NOT tm.won)::int AS maps_lost,
               sum(tm.diff)::int AS round_diff
        FROM team_maps tm
        JOIN analytics.stages st ON st.id = tm.stage_id
        JOIN analytics.series se ON se.id = tm.series_id
        JOIN analytics.teams t ON t.id = tm.team_id
        WHERE st.tournament_id = ${tournamentId} ${stageId === undefined ? sql`` : sql`AND st.id = ${stageId}`}
        GROUP BY st.id, st.name, st.sort_order, tm.team_id, t.slug, t.display_name
        ORDER BY st.sort_order, series_won DESC,
                 count(*) FILTER (WHERE tm.won) - count(*) FILTER (WHERE NOT tm.won) DESC,
                 round_diff DESC, t.display_name`,
  )
  const byStage = new Map<number, StageStandings>()
  for (const row of data) {
    const stage = byStage.get(row.stage_id) ?? {
      stage: { id: row.stage_id, name: row.stage_name },
      standings: [],
    }
    stage.standings.push({
      team: { id: row.team_id, slug: row.slug, displayName: row.display_name },
      seriesPlayed: row.series_played,
      seriesWon: row.series_won,
      mapsWon: row.maps_won,
      mapsLost: row.maps_lost,
      roundDiff: row.round_diff,
    })
    byStage.set(row.stage_id, stage)
  }
  return [...byStage.values()]
}

export async function seriesDetail(db: Database, id: number): Promise<SeriesDetail | undefined> {
  const header = await one<{
    id: number
    number: number
    stage_id: number
    stage_name: string
    tournament: string
    a_id: number
    a_slug: string
    a_name: string
    b_id: number
    b_slug: string
    b_name: string
    w_id: number | null
  }>(
    db,
    sql`SELECT s.id, s.number, st.id AS stage_id, st.name AS stage_name, t.name AS tournament,
               ta.id AS a_id, ta.slug AS a_slug, ta.display_name AS a_name,
               tb.id AS b_id, tb.slug AS b_slug, tb.display_name AS b_name, s.winner_team_id AS w_id
        FROM analytics.series s
        JOIN analytics.stages st ON st.id = s.stage_id
        JOIN analytics.tournaments t ON t.id = st.tournament_id
        JOIN analytics.teams ta ON ta.id = s.team_a_id
        JOIN analytics.teams tb ON tb.id = s.team_b_id
        WHERE s.id = ${id}`,
  )
  if (!header) return undefined
  const maps = await rows<{
    match_id: number
    game: string
    map: string
    score_a: number
    score_b: number
    winner_team_id: number
  }>(
    db,
    sql`SELECT m.id AS match_id, m.game_letter AS game, mp.name AS map,
               CASE WHEN m.red_team_id = ${header.a_id} THEN m.red_score ELSE m.blue_score END::int AS score_a,
               CASE WHEN m.red_team_id = ${header.a_id} THEN m.blue_score ELSE m.red_score END::int AS score_b,
               m.winner_team_id
        FROM analytics.matches m JOIN analytics.maps mp ON mp.id = m.map_id
        WHERE m.series_id = ${id}
        ORDER BY m.game_letter, m.started_at`,
  )
  const teamA = { id: header.a_id, slug: header.a_slug, displayName: header.a_name }
  const teamB = { id: header.b_id, slug: header.b_slug, displayName: header.b_name }
  return {
    id: header.id,
    number: header.number,
    stage: { id: header.stage_id, name: header.stage_name, tournament: header.tournament },
    teamA,
    teamB,
    winner: header.w_id === teamA.id ? teamA : header.w_id === teamB.id ? teamB : null,
    maps: maps.map((m) => ({
      matchId: m.match_id,
      game: m.game,
      map: m.map,
      scoreA: m.score_a,
      scoreB: m.score_b,
      winnerTeamId: m.winner_team_id,
    })),
  }
}

export async function listMaps(db: Database): Promise<MapSummary[]> {
  const data = await rows<{
    id: number
    slug: string
    name: string
    matches: number
    quality: 'ok' | 'low' | null
  }>(
    db,
    sql`SELECT mp.id, mp.slug, mp.name, count(m.id)::int AS matches, mp.silhouette_quality AS quality
        FROM analytics.maps mp LEFT JOIN analytics.matches m ON m.map_id = mp.id
        GROUP BY mp.id ORDER BY count(m.id) DESC, mp.name`,
  )
  return data.map((m) => ({
    id: m.id,
    slug: m.slug,
    name: m.name,
    matches: m.matches,
    silhouetteQuality: m.quality,
  }))
}

export async function mapDetail(db: Database, id: number): Promise<MapDetail | undefined> {
  const map = await one<{
    id: number
    slug: string
    name: string
    silhouette_svg: string | null
    quality: 'ok' | 'low' | null
  }>(
    db,
    sql`SELECT id, slug, name, silhouette_svg, silhouette_quality AS quality FROM analytics.maps WHERE id = ${id}`,
  )
  if (!map) return undefined
  const [sites, zones] = await Promise.all([
    rows<{ site: string; nx: number; ny: number; plants: number }>(
      db,
      sql`SELECT site, nx, ny, plants FROM analytics.map_sites WHERE map_id = ${id} ORDER BY site`,
    ),
    rows<{
      id: number
      name: string
      region: string
      super_region: string
      label_nx: number
      label_ny: number
      path_svg: string
    }>(
      db,
      sql`SELECT id, name, region, super_region, label_nx, label_ny, path_svg
          FROM analytics.zones WHERE map_id = ${id} ORDER BY id`,
    ),
  ])
  return {
    id: map.id,
    slug: map.slug,
    name: map.name,
    viewBox: [0, 0, SVG_SIZE, SVG_SIZE],
    silhouette: map.silhouette_svg,
    silhouetteQuality: map.quality,
    sites: sites.map((s) => ({ site: s.site, at: { x: s.nx, y: s.ny }, plants: s.plants })),
    zones: zones.map((z) => ({
      id: z.id,
      name: z.name,
      region: z.region,
      superRegion: z.super_region,
      label: { x: z.label_nx, y: z.label_ny },
      path: z.path_svg,
    })),
  }
}

export async function listAgents(db: Database): Promise<Agent[]> {
  const data = await rows<{
    id: number
    name: string
    role: string | null
    ability_grenade: string | null
    ability_1: string | null
    ability_2: string | null
    ultimate: string | null
  }>(
    db,
    sql`SELECT id, name, role, ability_grenade, ability_1, ability_2, ultimate FROM analytics.agents ORDER BY name`,
  )
  return data.map((a) => ({
    id: a.id,
    name: a.name,
    role: a.role,
    abilities: {
      grenade: a.ability_grenade,
      ability1: a.ability_1,
      ability2: a.ability_2,
      ultimate: a.ultimate,
    },
  }))
}

export async function listWeapons(db: Database): Promise<Weapon[]> {
  const data = await rows<{
    id: number
    name: string
    category: string | null
    cost: number | null
    is_armor: boolean
  }>(
    db,
    sql`SELECT id, name, category, cost, is_armor FROM analytics.weapons ORDER BY is_armor, cost NULLS LAST, name`,
  )
  return data.map((w) => ({
    id: w.id,
    name: w.name,
    category: w.category,
    cost: w.cost,
    isArmor: w.is_armor,
  }))
}
