import { sql, type SQL } from 'drizzle-orm'

import type { Database } from '../../db/client.js'
import { filterConditions } from '../../shared/filters.js'
import { one, rows, where } from '../../shared/sql.js'
import { fixed } from '../../shared/stats.js'
import type { Heatmap, HeatmapQuery, MapStats, MapStatsQuery, Metric } from './schemas.js'

export const HEATMAP_GRID = 64
const KD_PRIOR = 3

type Counts = {
  presence: number
  kills: number
  deaths: number
  first_kills: number
  first_deaths: number
  traded_deaths: number
}

const COUNT_COLUMNS = sql`
  sum(h.presence)::int AS presence, sum(h.kills)::int AS kills, sum(h.deaths)::int AS deaths,
  sum(h.first_kills)::int AS first_kills, sum(h.first_deaths)::int AS first_deaths,
  sum(h.traded_deaths)::int AS traded_deaths`

function scope(mapId: number, query: HeatmapQuery): SQL {
  return where([
    sql`h.map_id = ${mapId}`,
    ...filterConditions(query, {
      stage: sql`h.stage_id`,
      side: sql`h.side`,
      team: sql`h.team_id`,
      player: sql`h.player_id`,
      agent: sql`h.agent_id`,
    }),
  ])
}

type MetricValue = { value: number; sampleSize: number }

const METRIC_VALUE: Record<Metric, (counts: Counts, mapKd: number) => MetricValue> = {
  presence: (c) => ({ value: c.presence, sampleSize: c.presence }),
  kills: (c) => ({ value: c.kills, sampleSize: c.kills }),
  deaths: (c) => ({ value: c.deaths, sampleSize: c.deaths }),
  first_kills: (c) => ({ value: c.first_kills, sampleSize: c.first_kills }),
  first_deaths: (c) => ({ value: c.first_deaths, sampleSize: c.first_deaths }),
  traded_deaths: (c) => ({ value: c.traded_deaths, sampleSize: c.deaths }),
  kd: (c, mapKd) => ({
    value: fixed((c.kills + KD_PRIOR * mapKd) / (c.deaths + KD_PRIOR), 3),
    sampleSize: c.kills + c.deaths,
  }),
}

export const metricValue = (metric: Metric, counts: Counts, mapKd: number): MetricValue =>
  METRIC_VALUE[metric](counts, mapKd)

export async function heatmap(db: Database, mapId: number, query: HeatmapQuery): Promise<Heatmap> {
  const filter = scope(mapId, query)
  const totals = await one<{ kills: number | null; deaths: number | null }>(
    db,
    sql`SELECT sum(h.kills)::int AS kills, sum(h.deaths)::int AS deaths FROM analytics.heatmap_cells h WHERE ${filter}`,
  )
  const mapKd = (totals?.kills ?? 0) / Math.max(totals?.deaths ?? 0, 1) || 1
  const relevant = (c: Counts) =>
    query.metric === 'kd' ? c.kills + c.deaths > 0 : metricValue(query.metric, c, mapKd).sampleSize > 0

  if (query.resolution === 'zones') {
    const data = await rows<Counts & { zone_id: number; name: string }>(
      db,
      sql`SELECT h.zone_id, z.name, ${COUNT_COLUMNS}
          FROM analytics.heatmap_zones h JOIN analytics.zones z ON z.id = h.zone_id
          WHERE ${filter} GROUP BY h.zone_id, z.name ORDER BY h.zone_id`,
    )
    const zones = data.filter(relevant).map((z) => ({
      zoneId: z.zone_id,
      name: z.name,
      ...metricValue(query.metric, z, mapKd),
      tradeRate: z.deaths === 0 ? null : fixed(z.traded_deaths / z.deaths, 3),
      presence: z.presence,
      kills: z.kills,
      deaths: z.deaths,
      firstKills: z.first_kills,
      firstDeaths: z.first_deaths,
      tradedDeaths: z.traded_deaths,
    }))
    return {
      mapId,
      metric: query.metric,
      resolution: 'zones',
      grid: HEATMAP_GRID,
      maxValue: Math.max(0, ...zones.map((z) => z.value)),
      cells: [],
      zones,
    }
  }

  const data = await rows<Counts & { cx: number; cy: number }>(
    db,
    sql`SELECT h.cx, h.cy, ${COUNT_COLUMNS} FROM analytics.heatmap_cells h WHERE ${filter} GROUP BY h.cx, h.cy`,
  )
  const cells = data
    .filter(relevant)
    .map((c) => ({ x: c.cx, y: c.cy, ...metricValue(query.metric, c, mapKd) }))
  return {
    mapId,
    metric: query.metric,
    resolution: 'cells',
    grid: HEATMAP_GRID,
    maxValue: Math.max(0, ...cells.map((c) => c.value)),
    cells,
    zones: [],
  }
}

export async function mapStats(db: Database, mapId: number, query: MapStatsQuery): Promise<MapStats> {
  const matchFilter = where([
    sql`m.map_id = ${mapId}`,
    ...filterConditions(query, { stage: sql`s.stage_id` }),
    query.team === undefined ? undefined : sql`${query.team} IN (m.red_team_id, m.blue_team_id)`,
  ])
  const base = sql`FROM analytics.rounds r
                   JOIN analytics.matches m ON m.id = r.match_id
                   JOIN analytics.series s ON s.id = m.series_id
                   WHERE ${matchFilter}`
  const [summary, sites, agents] = await Promise.all([
    one<{ matches: number; rounds: number; attack_won: number }>(
      db,
      sql`SELECT count(DISTINCT m.id)::int AS matches, count(*)::int AS rounds,
                 count(*) FILTER (WHERE r.winner_side = 'attack')::int AS attack_won ${base}`,
    ),
    rows<{ site: string; plants: number; attack_won: number }>(
      db,
      sql`SELECT r.plant_site AS site, count(*)::int AS plants,
                 count(*) FILTER (WHERE r.winner_side = 'attack')::int AS attack_won
          ${base} AND r.plant_site IS NOT NULL GROUP BY r.plant_site ORDER BY r.plant_site`,
    ),
    rows<{ id: number; name: string; role: string | null; picks: number; won: number }>(
      db,
      sql`SELECT a.id, a.name, a.role, count(*)::int AS picks,
                 count(*) FILTER (WHERE m.winner_team_id = mp.team_id)::int AS won
          FROM analytics.match_players mp
          JOIN analytics.matches m ON m.id = mp.match_id
          JOIN analytics.series s ON s.id = m.series_id
          JOIN analytics.agents a ON a.id = mp.agent_id
          WHERE ${matchFilter} ${query.team === undefined ? sql`` : sql`AND mp.team_id = ${query.team}`}
          GROUP BY a.id ORDER BY count(*) DESC, a.name`,
    ),
  ])
  const matches = summary?.matches ?? 0
  const rounds = summary?.rounds ?? 0
  const attackWon = summary?.attack_won ?? 0
  const totalPlants = sites.reduce((n, s) => n + s.plants, 0)
  const slots = query.team === undefined ? matches * 2 : matches
  const rate = (part: number, total: number) => (total === 0 ? 0 : fixed(part / total, 3))
  return {
    mapId,
    matches,
    rounds,
    sides: [
      { side: 'attack', roundWinRate: rate(attackWon, rounds) },
      { side: 'defense', roundWinRate: rate(rounds - attackWon, rounds) },
    ],
    sites: sites.map((s) => ({
      site: s.site,
      plants: s.plants,
      plantShare: rate(s.plants, totalPlants),
      attackWinRateAfterPlant: rate(s.attack_won, s.plants),
    })),
    agents: agents.map((a) => ({
      agent: { id: a.id, name: a.name, role: a.role },
      picks: a.picks,
      pickRate: rate(a.picks, slots),
      winRate: rate(a.won, a.picks),
    })),
  }
}
