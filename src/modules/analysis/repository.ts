import { sql, type SQL } from 'drizzle-orm'

import type { Database } from '../../db/client.js'
import { filterConditions } from '../../shared/filters.js'
import { pick, roundRefs } from '../../shared/rounds.js'
import { rows, where } from '../../shared/sql.js'
import { fixed } from '../../shared/stats.js'
import type {
  AbilitiesQuery,
  AnalysisQuery,
  PatternsQuery,
  Combos,
  PlayerAbilities,
  PlayerPattern,
  PressureLine,
  Rotations,
  StrategyUsage,
  TeamEconomy,
} from './schemas.js'

const EXAMPLES = 8
const rate = (part: number, total: number) => (total === 0 ? 0 : fixed(part / total, 3))

type Columns = { stage?: SQL; map?: SQL; side?: SQL }

function scoped(query: AnalysisQuery, columns: Columns, extra: Array<SQL | undefined> = []): SQL {
  return where([...filterConditions(query, columns), ...extra])
}

type BuyType = TeamEconomy['byBuyType'][number]['buyType']

export async function teamEconomy(
  db: Database,
  teamId: number,
  query: AnalysisQuery,
  onlyPlayer?: number,
): Promise<TeamEconomy> {
  const columns = { stage: sql`e.stage_id`, map: sql`e.map_id`, side: sql`e.side` }
  const filter = scoped(query, columns, [sql`e.team_id = ${teamId}`])
  const [byBuy, matrix, flags] = await Promise.all([
    rows<{ buy_type: BuyType; rounds: number; won: number; loadout: number; spent: number; bank: number }>(
      db,
      sql`SELECT e.buy_type, count(*)::int AS rounds, count(*) FILTER (WHERE e.won)::int AS won,
                 avg(e.loadout)::float8 AS loadout, avg(e.spent)::float8 AS spent, avg(e.bank)::float8 AS bank
          FROM analytics.round_team_economy e WHERE ${filter}
          GROUP BY e.buy_type ORDER BY avg(e.loadout)`,
    ),
    rows<{ buy_type: BuyType; opponent_buy: BuyType; rounds: number; won: number; expected: number }>(
      db,
      sql`SELECT e.buy_type, e.opponent_buy, count(*)::int AS rounds, count(*) FILTER (WHERE e.won)::int AS won,
                 avg(e.expected_win)::float8 AS expected
          FROM analytics.round_team_economy e WHERE ${filter}
          GROUP BY e.buy_type, e.opponent_buy ORDER BY e.buy_type, e.opponent_buy`,
    ),
    rows<{
      flag: string
      player_id: number | null
      game_name: string | null
      tag_line: string | null
      count: number
      won: number
      expected: number
      examples: string[]
    }>(
      db,
      sql`SELECT f.flag, f.player_id, p.game_name, p.tag_line, count(*)::int AS count,
                 count(*) FILTER (WHERE f.won)::int AS won, avg(f.expected_win)::float8 AS expected,
                 (array_agg(f.round_id::text ORDER BY f.round_id DESC))[1:${EXAMPLES}] AS examples
          FROM analytics.economy_flags f
          JOIN analytics.round_team_economy e ON e.round_id = f.round_id AND e.team_id = f.team_id
          LEFT JOIN analytics.players p ON p.id = f.player_id
          WHERE ${filter} AND ${ownRows(sql`f.player_id`, onlyPlayer)}
          GROUP BY f.flag, f.player_id, p.game_name, p.tag_line
          ORDER BY count(*) DESC`,
    ),
  ])
  const refs = await roundRefs(
    db,
    flags.flatMap((f) => f.examples),
  )
  return {
    byBuyType: byBuy.map((b) => ({
      buyType: b.buy_type,
      rounds: b.rounds,
      winRate: rate(b.won, b.rounds),
      averageLoadout: fixed(b.loadout, 0),
      averageSpent: fixed(b.spent, 0),
      averageBank: fixed(b.bank, 0),
    })),
    matrix: matrix.map((m) => ({
      buyType: m.buy_type,
      opponentBuy: m.opponent_buy,
      rounds: m.rounds,
      winRate: rate(m.won, m.rounds),
      expectedWinRate: fixed(m.expected, 3),
    })),
    flags: flags.map((f) => ({
      flag: f.flag,
      scope: f.player_id === null ? ('team' as const) : ('player' as const),
      player:
        f.player_id === null || f.game_name === null || f.tag_line === null
          ? null
          : { id: f.player_id, gameName: f.game_name, tagLine: f.tag_line },
      count: f.count,
      winRate: rate(f.won, f.count),
      expectedWinRate: fixed(f.expected, 3),
      examples: pick(refs, f.examples),
    })),
  }
}

const ownRows = (column: SQL, onlyPlayer: number | undefined): SQL =>
  onlyPlayer === undefined ? sql`TRUE` : sql`(${column} IS NULL OR ${column} = ${onlyPlayer})`

export function wilson(wins: number, n: number, z = 1.96): [number, number] {
  if (n === 0) return [0, 0]
  const p = wins / n
  const denominator = 1 + (z * z) / n
  const center = (p + (z * z) / (2 * n)) / denominator
  const margin = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denominator
  return [fixed(Math.max(0, center - margin), 3), fixed(Math.min(1, center + margin), 3)]
}

export async function teamStrategies(
  db: Database,
  teamId: number,
  query: AnalysisQuery,
): Promise<StrategyUsage[]> {
  const data = await rows<{
    id: number
    map_id: number
    map_slug: string
    map_name: string
    side: 'attack' | 'defense'
    title: string
    description: string
    is_noise: boolean
    region_counts: Record<string, number>
    top_zones: Array<{ zoneId: number; name: string; share: number }>
    plant_sites: Record<string, number>
    plant_time_s: number | null
    overall_rounds: number
    overall_win_rate: number
    rounds: number
    wins: number
    examples: string[]
  }>(
    db,
    sql`SELECT s.id, mp.id AS map_id, mp.slug AS map_slug, mp.name AS map_name, s.side, s.title, s.description,
               s.is_noise, s.region_counts, s.top_zones, s.plant_sites, s.plant_time_s,
               s.rounds AS overall_rounds, s.win_rate AS overall_win_rate,
               count(*)::int AS rounds, count(*) FILTER (WHERE rs.won)::int AS wins,
               (array_agg(rs.round_id::text ORDER BY rs.round_id DESC))[1:${EXAMPLES}] AS examples
        FROM analytics.round_strategy rs
        JOIN analytics.strategies s ON s.id = rs.strategy_id
        JOIN analytics.maps mp ON mp.id = s.map_id
        JOIN analytics.rounds r ON r.id = rs.round_id
        JOIN analytics.matches m ON m.id = r.match_id
        JOIN analytics.series se ON se.id = m.series_id
        WHERE ${scoped(query, { stage: sql`se.stage_id`, map: sql`s.map_id`, side: sql`rs.side` }, [
          sql`rs.team_id = ${teamId}`,
        ])}
        GROUP BY s.id, mp.id
        ORDER BY count(*) DESC`,
  )
  const refs = await roundRefs(
    db,
    data.flatMap((d) => d.examples),
  )
  return data.map((d) => ({
    strategy: {
      id: d.id,
      map: { id: d.map_id, slug: d.map_slug, name: d.map_name },
      side: d.side,
      title: d.title,
      description: d.description,
      isNoise: d.is_noise,
      regionCounts: d.region_counts,
      topZones: d.top_zones,
      plantSites: d.plant_sites,
      plantTimeSeconds: d.plant_time_s,
      overallWinRate: fixed(d.overall_win_rate, 3),
      overallRounds: d.overall_rounds,
    },
    rounds: d.rounds,
    wins: d.wins,
    winRate: rate(d.wins, d.rounds),
    confidenceInterval: wilson(d.wins, d.rounds),
    examples: pick(refs, d.examples),
  }))
}

const ROUND_SCOPE = (query: AnalysisQuery, extra: SQL) => sql`
  JOIN analytics.rounds r ON r.id = t.round_id
  JOIN analytics.matches m ON m.id = r.match_id
  JOIN analytics.series se ON se.id = m.series_id
  WHERE ${scoped(query, { stage: sql`se.stage_id`, map: sql`m.map_id`, side: sql`t.side` }, [extra])}`

export async function teamRotations(
  db: Database,
  teamId: number,
  query: AnalysisQuery,
  onlyPlayer?: number,
): Promise<Rotations> {
  const scope = ROUND_SCOPE(query, sql`t.team_id = ${teamId}`)
  const [summary, byPlayer, examples] = await Promise.all([
    rows<{ side: 'attack' | 'defense'; informed: boolean; rotations: number; fell: number; won: number }>(
      db,
      sql`SELECT t.side, t.informed, count(*)::int AS rotations, count(*) FILTER (WHERE t.source_fell)::int AS fell,
                 count(*) FILTER (WHERE t.round_won)::int AS won
          FROM analytics.rotations t ${scope}
          GROUP BY t.side, t.informed ORDER BY t.side, t.informed`,
    ),
    rows<{
      player_id: number
      game_name: string
      tag_line: string
      rotations: number
      uninformed: number
      fell: number
    }>(
      db,
      sql`SELECT p.id AS player_id, p.game_name, p.tag_line, count(*)::int AS rotations,
                 count(*) FILTER (WHERE NOT t.informed)::int AS uninformed,
                 count(*) FILTER (WHERE NOT t.informed AND t.source_fell)::int AS fell
          FROM analytics.rotations t JOIN analytics.players p ON p.id = t.player_id ${scope}
            AND ${ownRows(sql`t.player_id`, onlyPlayer)}
          GROUP BY p.id ORDER BY count(*) FILTER (WHERE NOT t.informed) DESC`,
    ),
    rows<{
      round_id: string
      player_id: number
      game_name: string
      tag_line: string
      from_region: string
      to_region: string
      left_after_ms: number
      seen_at_ms: number
      source_fell: boolean
    }>(
      db,
      sql`SELECT t.round_id::text, p.id AS player_id, p.game_name, p.tag_line, t.from_region, t.to_region,
                 t.left_after_ms, t.seen_at_ms, t.source_fell
          FROM analytics.rotations t JOIN analytics.players p ON p.id = t.player_id ${scope} AND NOT t.informed
            AND ${ownRows(sql`t.player_id`, onlyPlayer)}
          ORDER BY t.source_fell DESC, t.round_id DESC LIMIT ${EXAMPLES * 2}`,
    ),
  ])
  const refs = await roundRefs(
    db,
    examples.map((e) => e.round_id),
  )
  return {
    isEstimate: true,
    summary: summary.map((s) => ({
      side: s.side,
      informed: s.informed,
      rotations: s.rotations,
      sourceFellRate: rate(s.fell, s.rotations),
      roundWinRate: rate(s.won, s.rotations),
    })),
    byPlayer: byPlayer.map((p) => ({
      player: { id: p.player_id, gameName: p.game_name, tagLine: p.tag_line },
      rotations: p.rotations,
      uninformed: p.uninformed,
      uninformedSourceFellRate: p.uninformed === 0 ? null : rate(p.fell, p.uninformed),
    })),
    examples: examples.flatMap((e) => {
      const round = refs.get(e.round_id)
      if (!round) return []
      return [
        {
          round,
          player: { id: e.player_id, gameName: e.game_name, tagLine: e.tag_line },
          from: e.from_region,
          to: e.to_region,
          leftAfterMs: e.left_after_ms,
          seenAtMs: e.seen_at_ms,
          sourceFell: e.source_fell,
        },
      ]
    }),
  }
}

export async function teamCombos(
  db: Database,
  teamId: number,
  query: AnalysisQuery,
  onlyPlayer?: number,
): Promise<Combos> {
  const data = await rows<{
    kind: 'assist' | 'ability_followup'
    a_id: number
    a_name: string
    a_tag: string
    b_id: number
    b_name: string
    b_tag: string
    agent_a: number
    agent_a_name: string
    agent_a_role: string | null
    agent_b: number
    agent_b_name: string
    agent_b_role: string | null
    occurrences: number
    wp_gain: number
    site_control: number
    won: number
  }>(
    db,
    sql`SELECT c.kind, pa.id AS a_id, pa.game_name AS a_name, pa.tag_line AS a_tag,
               pb.id AS b_id, pb.game_name AS b_name, pb.tag_line AS b_tag,
               aa.id AS agent_a, aa.name AS agent_a_name, aa.role AS agent_a_role,
               ab.id AS agent_b, ab.name AS agent_b_name, ab.role AS agent_b_role,
               sum(c.occurrences)::int AS occurrences, sum(c.wp_gain)::float8 AS wp_gain,
               sum(c.site_control)::int AS site_control, sum(c.occurrences_won)::int AS won
        FROM analytics.combos c
        JOIN analytics.players pa ON pa.id = c.player_a
        JOIN analytics.players pb ON pb.id = c.player_b
        JOIN analytics.agents aa ON aa.id = c.agent_a
        JOIN analytics.agents ab ON ab.id = c.agent_b
        WHERE ${scoped(query, { stage: sql`c.stage_id`, map: sql`c.map_id`, side: sql`c.side` }, [
          sql`c.team_id = ${teamId}`,
          onlyPlayer === undefined ? undefined : sql`${onlyPlayer} IN (c.player_a, c.player_b)`,
        ])}
        GROUP BY c.kind, pa.id, pb.id, aa.id, ab.id
        ORDER BY sum(c.occurrences) DESC
        LIMIT 40`,
  )
  return {
    isEstimate: true,
    combos: data.map((c) => ({
      kind: c.kind,
      playerA: { id: c.a_id, gameName: c.a_name, tagLine: c.a_tag },
      playerB: { id: c.b_id, gameName: c.b_name, tagLine: c.b_tag },
      agentA: { id: c.agent_a, name: c.agent_a_name, role: c.agent_a_role },
      agentB: { id: c.agent_b, name: c.agent_b_name, role: c.agent_b_role },
      occurrences: c.occurrences,
      averageWpGain: fixed(c.wp_gain / Math.max(c.occurrences, 1), 3),
      siteControlRate: rate(c.site_control, c.occurrences),
      winRate: rate(c.won, c.occurrences),
    })),
  }
}

type PressureRow = {
  context: string
  rounds: number
  won: number
  survived: number
  kills: number
  deaths: number
  wp_delta: number
}

const PRESSURE_COLUMNS = sql`
  t.context, sum(t.rounds)::int AS rounds, sum(t.rounds_won)::int AS won, sum(t.survived)::int AS survived,
  sum(t.kills)::int AS kills, sum(t.deaths)::int AS deaths, sum(t.wp_delta)::float8 AS wp_delta`

export async function pressure(
  db: Database,
  owner: { column: 'team_id' | 'player_id'; id: number },
  query: AnalysisQuery,
): Promise<PressureLine[]> {
  const columns = { stage: sql`t.stage_id`, map: sql`t.map_id`, side: sql`t.side` }
  const [mine, baseline] = await Promise.all([
    rows<PressureRow>(
      db,
      sql`SELECT ${PRESSURE_COLUMNS} FROM analytics.pressure_stats t
          WHERE ${scoped(query, columns, [sql`${sql.identifier('t')}.${sql.identifier(owner.column)} = ${owner.id}`])}
          GROUP BY t.context ORDER BY t.context`,
    ),
    rows<PressureRow>(
      db,
      sql`SELECT ${PRESSURE_COLUMNS} FROM analytics.pressure_stats t WHERE ${scoped(query, columns)} GROUP BY t.context`,
    ),
  ])
  const base = new Map(baseline.map((b) => [b.context, b]))
  return mine.map((m) => {
    const b = base.get(m.context)
    return {
      context: m.context,
      playerRounds: m.rounds,
      winRate: rate(m.won, m.rounds),
      survivalRate: rate(m.survived, m.rounds),
      kd: fixed(m.kills / Math.max(m.deaths, 1), 2),
      wpDeltaPerRound: fixed(m.wp_delta / Math.max(m.rounds, 1), 3),
      baseline: {
        winRate: b ? rate(b.won, b.rounds) : 0,
        survivalRate: b ? rate(b.survived, b.rounds) : 0,
        kd: b ? fixed(b.kills / Math.max(b.deaths, 1), 2) : 0,
      },
    }
  })
}

export async function playerPatterns(
  db: Database,
  playerId: number,
  query: PatternsQuery,
): Promise<PlayerPattern[]> {
  const data = await rows<{
    pattern: PlayerPattern['pattern']
    tier: PlayerPattern['tier']
    map_id: number
    map_slug: string
    map_name: string
    side: 'attack' | 'defense'
    zone_id: number | null
    zone_name: string | null
    rounds: number
    occurrences: number
    expected: number
    rate: number
    baseline_rate: number
    cost_rounds: number
    evidence: string[]
  }>(
    db,
    sql`SELECT pp.pattern, pp.tier, mp.id AS map_id, mp.slug AS map_slug, mp.name AS map_name, pp.side,
               z.id AS zone_id, z.name AS zone_name, pp.rounds, pp.occurrences, pp.expected, pp.rate,
               pp.baseline_rate, pp.cost_rounds, pp.evidence_round_ids::text[] AS evidence
        FROM analytics.player_patterns pp
        JOIN analytics.maps mp ON mp.id = pp.map_id
        LEFT JOIN analytics.zones z ON z.id = pp.zone_id
        WHERE ${scoped(query, { map: sql`pp.map_id`, side: sql`pp.side` }, [
          sql`pp.player_id = ${playerId}`,
          sql`pp.tier IS NOT NULL`,
        ])}
        ORDER BY pp.tier, pp.cost_rounds DESC`,
  )
  const refs = await roundRefs(
    db,
    data.flatMap((d) => d.evidence),
  )
  return data.map((d) => ({
    pattern: d.pattern,
    tier: d.tier,
    map: { id: d.map_id, slug: d.map_slug, name: d.map_name },
    side: d.side,
    zone: d.zone_id === null || d.zone_name === null ? null : { id: d.zone_id, name: d.zone_name },
    rounds: d.rounds,
    occurrences: d.occurrences,
    expected: fixed(d.expected, 1),
    rate: fixed(d.rate, 3),
    baselineRate: fixed(d.baseline_rate, 3),
    costRounds: fixed(d.cost_rounds, 2),
    examples: pick(refs, d.evidence),
  }))
}

export async function playerAbilities(
  db: Database,
  playerId: number,
  query: AbilitiesQuery,
): Promise<PlayerAbilities> {
  const usageFilter = where([
    sql`u.player_id = ${playerId}`,
    query.map === undefined ? undefined : sql`u.map_id = ${query.map}`,
    ...filterConditions(query, {
      stage: sql`(SELECT se.stage_id FROM analytics.matches mm JOIN analytics.series se ON se.id = mm.series_id WHERE mm.id = u.match_id)`,
    }),
  ])
  const [kills, usage] = await Promise.all([
    rows<{
      agent_id: number
      agent_name: string
      agent_role: string | null
      slot: string
      ability_name: string | null
      kills: number
      wp_gain: number
    }>(
      db,
      sql`SELECT a.id AS agent_id, a.name AS agent_name, a.role AS agent_role, k.slot, k.ability_name,
                 sum(k.kills)::int AS kills, sum(k.wp_gain)::float8 AS wp_gain
          FROM analytics.ability_kills k
          JOIN analytics.agents a ON a.id = k.agent_id
          JOIN analytics.matches m ON m.id = k.match_id
          JOIN analytics.series se ON se.id = m.series_id
          WHERE ${where([
            sql`k.player_id = ${playerId}`,
            query.map === undefined ? undefined : sql`m.map_id = ${query.map}`,
            ...filterConditions(query, { stage: sql`se.stage_id` }),
          ])}
          GROUP BY a.id, k.slot, k.ability_name ORDER BY sum(k.kills) DESC`,
    ),
    rows<{
      matches: number
      overuse: number
      casts: number
      rounds: number
      ult_casts: number
      ult_kills: number
      ult_decided: number
    }>(
      db,
      sql`SELECT count(*)::int AS matches, count(*) FILTER (WHERE u.likely_overuse)::int AS overuse,
                 coalesce(sum(u.casts), 0)::int AS casts, coalesce(sum(u.rounds), 0)::int AS rounds,
                 coalesce(sum(u.ult_casts), 0)::int AS ult_casts, coalesce(sum(u.ult_kills), 0)::int AS ult_kills,
                 coalesce(sum(u.ult_kills_decided), 0)::int AS ult_decided
          FROM analytics.ability_usage u WHERE ${usageFilter}`,
    ),
  ])
  const u = usage[0] ?? {
    matches: 0,
    overuse: 0,
    casts: 0,
    rounds: 0,
    ult_casts: 0,
    ult_kills: 0,
    ult_decided: 0,
  }
  return {
    isEstimate: true,
    abilityKills: kills.map((k) => ({
      agent: { id: k.agent_id, name: k.agent_name, role: k.agent_role },
      slot: k.slot,
      abilityName: k.ability_name,
      kills: k.kills,
      averageWpGain: fixed(k.wp_gain / Math.max(k.kills, 1), 3),
    })),
    usage: {
      matches: u.matches,
      likelyOveruseMatches: u.overuse,
      castsPerRound: fixed(u.casts / Math.max(u.rounds, 1), 2),
      ultimateCasts: u.ult_casts,
      ultimateKills: u.ult_kills,
      ultimateKillsInDecidedRounds: u.ult_decided,
    },
  }
}
