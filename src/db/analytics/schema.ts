import {
  pgTable,
  pgSchema,
  unique,
  smallint,
  text,
  foreignKey,
  integer,
  index,
  uuid,
  date,
  timestamp,
  check,
  bigint,
  real,
  boolean,
  doublePrecision,
  jsonb,
  primaryKey,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const analytics = pgSchema('analytics')

export const tournaments = analytics.table(
  'tournaments',
  {
    id: smallint().primaryKey().generatedAlwaysAsIdentity({
      name: 'analytics.tournaments_id_seq',
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 32767,
      cache: 1,
    }),
    slug: text().notNull(),
    name: text().notNull(),
  },
  (table) => [unique('tournaments_slug_key').on(table.slug)],
)

export const stages = analytics.table(
  'stages',
  {
    id: smallint().primaryKey().generatedAlwaysAsIdentity({
      name: 'analytics.stages_id_seq',
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 32767,
      cache: 1,
    }),
    tournamentId: smallint('tournament_id').notNull(),
    slug: text().notNull(),
    name: text().notNull(),
    sortOrder: smallint('sort_order').notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.tournamentId],
      foreignColumns: [tournaments.id],
      name: 'stages_tournament_id_fkey',
    }),
    unique('stages_tournament_id_slug_key').on(table.slug, table.tournamentId),
  ],
)

export const series = analytics.table(
  'series',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity({
      name: 'analytics.series_id_seq',
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 2147483647,
      cache: 1,
    }),
    stageId: smallint('stage_id').notNull(),
    number: smallint().notNull(),
    teamAId: integer('team_a_id').notNull(),
    teamBId: integer('team_b_id').notNull(),
    winnerTeamId: integer('winner_team_id'),
  },
  (table) => [
    foreignKey({
      columns: [table.stageId],
      foreignColumns: [stages.id],
      name: 'series_stage_id_fkey',
    }),
    foreignKey({
      columns: [table.teamAId],
      foreignColumns: [teams.id],
      name: 'series_team_a_id_fkey',
    }),
    foreignKey({
      columns: [table.teamBId],
      foreignColumns: [teams.id],
      name: 'series_team_b_id_fkey',
    }),
    foreignKey({
      columns: [table.winnerTeamId],
      foreignColumns: [teams.id],
      name: 'series_winner_team_id_fkey',
    }),
    unique('series_stage_id_number_key').on(table.number, table.stageId),
  ],
)

export const teams = analytics.table(
  'teams',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity({
      name: 'analytics.teams_id_seq',
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 2147483647,
      cache: 1,
    }),
    slug: text().notNull(),
    displayName: text('display_name').notNull(),
  },
  (table) => [unique('teams_slug_key').on(table.slug)],
)

export const matches = analytics.table(
  'matches',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity({
      name: 'analytics.matches_id_seq',
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 2147483647,
      cache: 1,
    }),
    matchUuid: uuid('match_uuid').notNull(),
    seriesId: integer('series_id').notNull(),
    gameLetter: text('game_letter').notNull(),
    mapId: smallint('map_id').notNull(),
    gameVersion: text('game_version').notNull(),
    playedOn: date('played_on').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true, mode: 'string' }).notNull(),
    durationMs: integer('duration_ms').notNull(),
    redTeamId: integer('red_team_id').notNull(),
    blueTeamId: integer('blue_team_id').notNull(),
    winnerTeamId: integer('winner_team_id').notNull(),
    redScore: smallint('red_score').notNull(),
    blueScore: smallint('blue_score').notNull(),
    roundsPlayed: smallint('rounds_played').notNull(),
    sourceFile: text('source_file').notNull(),
  },
  (table) => [
    index('matches_map_id_idx').using('btree', table.mapId.asc().nullsLast().op('int2_ops')),
    index('matches_series_id_idx').using('btree', table.seriesId.asc().nullsLast().op('int4_ops')),
    foreignKey({
      columns: [table.blueTeamId],
      foreignColumns: [teams.id],
      name: 'matches_blue_team_id_fkey',
    }),
    foreignKey({
      columns: [table.mapId],
      foreignColumns: [maps.id],
      name: 'matches_map_id_fkey',
    }),
    foreignKey({
      columns: [table.redTeamId],
      foreignColumns: [teams.id],
      name: 'matches_red_team_id_fkey',
    }),
    foreignKey({
      columns: [table.seriesId],
      foreignColumns: [series.id],
      name: 'matches_series_id_fkey',
    }),
    foreignKey({
      columns: [table.winnerTeamId],
      foreignColumns: [teams.id],
      name: 'matches_winner_team_id_fkey',
    }),
    unique('matches_match_uuid_key').on(table.matchUuid),
  ],
)

export const rounds = analytics.table(
  'rounds',
  {
    id: bigint({ mode: 'number' }).primaryKey().notNull(),
    matchId: integer('match_id').notNull(),
    number: smallint().notNull(),
    winnerTeamId: integer('winner_team_id').notNull(),
    winnerSide: text('winner_side').notNull(),
    attackTeamId: integer('attack_team_id').notNull(),
    defenseTeamId: integer('defense_team_id').notNull(),
    resultCode: text('result_code').notNull(),
    ceremony: text(),
    plantSite: text('plant_site'),
    plantTimeMs: integer('plant_time_ms'),
    planterId: integer('planter_id'),
    plantX: integer('plant_x'),
    plantY: integer('plant_y'),
    defuserId: integer('defuser_id'),
    defuseTimeMs: integer('defuse_time_ms'),
    plantNx: real('plant_nx'),
    plantNy: real('plant_ny'),
    plantZoneId: integer('plant_zone_id'),
  },
  (table) => [
    index('rounds_match_id_idx').using('btree', table.matchId.asc().nullsLast().op('int4_ops')),
    foreignKey({
      columns: [table.attackTeamId],
      foreignColumns: [teams.id],
      name: 'rounds_attack_team_id_fkey',
    }),
    foreignKey({
      columns: [table.defenseTeamId],
      foreignColumns: [teams.id],
      name: 'rounds_defense_team_id_fkey',
    }),
    foreignKey({
      columns: [table.defuserId],
      foreignColumns: [players.id],
      name: 'rounds_defuser_id_fkey',
    }),
    foreignKey({
      columns: [table.matchId],
      foreignColumns: [matches.id],
      name: 'rounds_match_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.plantZoneId],
      foreignColumns: [zones.id],
      name: 'rounds_plant_zone_id_fkey',
    }).onDelete('set null'),
    foreignKey({
      columns: [table.planterId],
      foreignColumns: [players.id],
      name: 'rounds_planter_id_fkey',
    }),
    foreignKey({
      columns: [table.winnerTeamId],
      foreignColumns: [teams.id],
      name: 'rounds_winner_team_id_fkey',
    }),
    unique('rounds_match_id_number_key').on(table.matchId, table.number),
    check('rounds_winner_side_check', sql`winner_side = ANY (ARRAY['attack'::text, 'defense'::text])`),
  ],
)

export const players = analytics.table(
  'players',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity({
      name: 'analytics.players_id_seq',
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 2147483647,
      cache: 1,
    }),
    puuidHash: text('puuid_hash').notNull(),
    gameName: text('game_name').notNull(),
    tagLine: text('tag_line').notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true, mode: 'string' }).notNull(),
  },
  (table) => [unique('players_puuid_hash_key').on(table.puuidHash)],
)

export const agents = analytics.table(
  'agents',
  {
    id: smallint().primaryKey().generatedAlwaysAsIdentity({
      name: 'analytics.agents_id_seq',
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 32767,
      cache: 1,
    }),
    uuid: text().notNull(),
    name: text().notNull(),
    role: text(),
    abilityGrenade: text('ability_grenade'),
    ability1: text('ability_1'),
    ability2: text('ability_2'),
    ultimate: text(),
  },
  (table) => [unique('agents_uuid_key').on(table.uuid)],
)

export const weapons = analytics.table(
  'weapons',
  {
    id: smallint().primaryKey().generatedAlwaysAsIdentity({
      name: 'analytics.weapons_id_seq',
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 32767,
      cache: 1,
    }),
    uuid: text().notNull(),
    name: text().notNull(),
    category: text(),
    cost: integer(),
    isArmor: boolean('is_armor').notNull(),
  },
  (table) => [unique('weapons_uuid_key').on(table.uuid)],
)

export const ingestRuns = analytics.table('ingest_runs', {
  id: integer().primaryKey().generatedAlwaysAsIdentity({
    name: 'analytics.ingest_runs_id_seq',
    startWith: 1,
    increment: 1,
    minValue: 1,
    maxValue: 2147483647,
    cache: 1,
  }),
  startedAt: timestamp('started_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  finishedAt: timestamp('finished_at', { withTimezone: true, mode: 'string' }),
  source: text().notNull(),
  filesSeen: integer('files_seen').default(0).notNull(),
  filesLoaded: integer('files_loaded').default(0).notNull(),
  filesSkipped: integer('files_skipped').default(0).notNull(),
  pipelineVersion: text('pipeline_version').notNull(),
})

export const dataQualityReport = analytics.table(
  'data_quality_report',
  {
    runId: integer('run_id').notNull(),
    severity: text().notNull(),
    code: text().notNull(),
    sourceFile: text('source_file'),
    detail: text().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.runId],
      foreignColumns: [ingestRuns.id],
      name: 'data_quality_report_run_id_fkey',
    }).onDelete('cascade'),
    check(
      'data_quality_report_severity_check',
      sql`severity = ANY (ARRAY['info'::text, 'warning'::text, 'error'::text])`,
    ),
  ],
)

export const kills = analytics.table(
  'kills',
  {
    id: bigint({ mode: 'number' }).primaryKey().notNull(),
    roundId: bigint('round_id', { mode: 'number' }).notNull(),
    seq: smallint().notNull(),
    tRoundMs: integer('t_round_ms').notNull(),
    tGameMs: integer('t_game_ms').notNull(),
    killerId: integer('killer_id'),
    victimId: integer('victim_id').notNull(),
    kind: text().notNull(),
    damageType: text('damage_type').notNull(),
    weaponId: smallint('weapon_id'),
    abilitySlot: text('ability_slot'),
    isSecondaryFire: boolean('is_secondary_fire').notNull(),
    killerX: integer('killer_x'),
    killerY: integer('killer_y'),
    victimX: integer('victim_x').notNull(),
    victimY: integer('victim_y').notNull(),
    distanceM: real('distance_m'),
    isFirstKill: boolean('is_first_kill').notNull(),
    isTrade: boolean('is_trade').notNull(),
    tradedAfterMs: integer('traded_after_ms'),
    killerNx: real('killer_nx'),
    killerNy: real('killer_ny'),
    victimNx: real('victim_nx'),
    victimNy: real('victim_ny'),
    killerZoneId: integer('killer_zone_id'),
    victimZoneId: integer('victim_zone_id'),
  },
  (table) => [
    index('kills_killer_id_idx').using('btree', table.killerId.asc().nullsLast().op('int4_ops')),
    index('kills_killer_zone_id_idx').using('btree', table.killerZoneId.asc().nullsLast().op('int4_ops')),
    index('kills_round_id_idx').using('btree', table.roundId.asc().nullsLast().op('int8_ops')),
    index('kills_victim_id_idx').using('btree', table.victimId.asc().nullsLast().op('int4_ops')),
    index('kills_victim_zone_id_idx').using('btree', table.victimZoneId.asc().nullsLast().op('int4_ops')),
    foreignKey({
      columns: [table.killerId],
      foreignColumns: [players.id],
      name: 'kills_killer_id_fkey',
    }),
    foreignKey({
      columns: [table.killerZoneId],
      foreignColumns: [zones.id],
      name: 'kills_killer_zone_id_fkey',
    }).onDelete('set null'),
    foreignKey({
      columns: [table.roundId],
      foreignColumns: [rounds.id],
      name: 'kills_round_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.victimId],
      foreignColumns: [players.id],
      name: 'kills_victim_id_fkey',
    }),
    foreignKey({
      columns: [table.victimZoneId],
      foreignColumns: [zones.id],
      name: 'kills_victim_zone_id_fkey',
    }).onDelete('set null'),
    foreignKey({
      columns: [table.weaponId],
      foreignColumns: [weapons.id],
      name: 'kills_weapon_id_fkey',
    }),
    unique('kills_round_id_seq_key').on(table.roundId, table.seq),
    check('kills_kind_check', sql`kind = ANY (ARRAY['enemy'::text, 'team'::text, 'self'::text])`),
  ],
)

export const maps = analytics.table(
  'maps',
  {
    id: smallint().primaryKey().generatedAlwaysAsIdentity({
      name: 'analytics.maps_id_seq',
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 32767,
      cache: 1,
    }),
    internalName: text('internal_name').notNull(),
    slug: text().notNull(),
    name: text().notNull(),
    xMult: doublePrecision('x_mult'),
    yMult: doublePrecision('y_mult'),
    xAdd: doublePrecision('x_add'),
    yAdd: doublePrecision('y_add'),
    silhouetteSvg: text('silhouette_svg'),
    bounds: jsonb(),
    calibration: text().default('reference').notNull(),
    silhouetteQuality: text('silhouette_quality'),
  },
  (table) => [
    unique('maps_internal_name_key').on(table.internalName),
    unique('maps_slug_key').on(table.slug),
    check('maps_calibration_check', sql`calibration = ANY (ARRAY['reference'::text, 'derived'::text])`),
    check('maps_silhouette_quality_check', sql`silhouette_quality = ANY (ARRAY['ok'::text, 'low'::text])`),
  ],
)

export const zones = analytics.table(
  'zones',
  {
    id: integer().primaryKey().notNull(),
    mapId: smallint('map_id').notNull(),
    name: text().notNull(),
    region: text().notNull(),
    superRegion: text('super_region').notNull(),
    source: text().notNull(),
    anchorNx: real('anchor_nx').notNull(),
    anchorNy: real('anchor_ny').notNull(),
    labelNx: real('label_nx').notNull(),
    labelNy: real('label_ny').notNull(),
    area: real().notNull(),
    pathSvg: text('path_svg').notNull(),
  },
  (table) => [
    index('zones_map_id_idx').using('btree', table.mapId.asc().nullsLast().op('int2_ops')),
    foreignKey({
      columns: [table.mapId],
      foreignColumns: [maps.id],
      name: 'zones_map_id_fkey',
    }).onDelete('cascade'),
    check('zones_source_check', sql`source = ANY (ARRAY['callout'::text, 'cluster'::text])`),
  ],
)

export const modelRuns = analytics.table('model_runs', {
  id: integer().primaryKey().generatedAlwaysAsIdentity({
    name: 'analytics.model_runs_id_seq',
    startWith: 1,
    increment: 1,
    minValue: 1,
    maxValue: 2147483647,
    cache: 1,
  }),
  model: text().notNull(),
  pipelineVersion: text('pipeline_version').notNull(),
  trainedAt: timestamp('trained_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  seed: integer().notNull(),
  params: jsonb().notNull(),
  metrics: jsonb().notNull(),
})

export const economyFlags = analytics.table(
  'economy_flags',
  {
    roundId: bigint('round_id', { mode: 'number' }).notNull(),
    teamId: integer('team_id').notNull(),
    playerId: integer('player_id'),
    flag: text().notNull(),
    won: boolean().notNull(),
    expectedWin: real('expected_win').notNull(),
    detail: text().notNull(),
  },
  (table) => [
    index('economy_flags_player_id_idx').using('btree', table.playerId.asc().nullsLast().op('int4_ops')),
    index('economy_flags_team_id_flag_idx').using(
      'btree',
      table.teamId.asc().nullsLast().op('int4_ops'),
      table.flag.asc().nullsLast().op('int4_ops'),
    ),
    foreignKey({
      columns: [table.playerId],
      foreignColumns: [players.id],
      name: 'economy_flags_player_id_fkey',
    }),
    foreignKey({
      columns: [table.roundId],
      foreignColumns: [rounds.id],
      name: 'economy_flags_round_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.teamId],
      foreignColumns: [teams.id],
      name: 'economy_flags_team_id_fkey',
    }),
  ],
)

export const killImpact = analytics.table(
  'kill_impact',
  {
    killId: bigint('kill_id', { mode: 'number' }).primaryKey().notNull(),
    roundId: bigint('round_id', { mode: 'number' }).notNull(),
    killerId: integer('killer_id'),
    victimId: integer('victim_id').notNull(),
    killerSide: text('killer_side'),
    victimSide: text('victim_side').notNull(),
    wpBeforeAttack: real('wp_before_attack').notNull(),
    wpAfterAttack: real('wp_after_attack').notNull(),
    victimDelta: real('victim_delta').notNull(),
  },
  (table) => [
    index('kill_impact_killer_id_idx').using('btree', table.killerId.asc().nullsLast().op('int4_ops')),
    index('kill_impact_victim_id_idx').using('btree', table.victimId.asc().nullsLast().op('int4_ops')),
    foreignKey({
      columns: [table.killId],
      foreignColumns: [kills.id],
      name: 'kill_impact_kill_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.killerId],
      foreignColumns: [players.id],
      name: 'kill_impact_killer_id_fkey',
    }),
    foreignKey({
      columns: [table.roundId],
      foreignColumns: [rounds.id],
      name: 'kill_impact_round_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.victimId],
      foreignColumns: [players.id],
      name: 'kill_impact_victim_id_fkey',
    }),
    check('kill_impact_killer_side_check', sql`killer_side = ANY (ARRAY['attack'::text, 'defense'::text])`),
    check('kill_impact_victim_side_check', sql`victim_side = ANY (ARRAY['attack'::text, 'defense'::text])`),
  ],
)

export const strategies = analytics.table(
  'strategies',
  {
    id: integer().primaryKey().notNull(),
    mapId: smallint('map_id').notNull(),
    side: text().notNull(),
    isNoise: boolean('is_noise').notNull(),
    title: text().notNull(),
    description: text().notNull(),
    rounds: integer().notNull(),
    wins: integer().notNull(),
    winRate: real('win_rate').notNull(),
    ciLow: real('ci_low').notNull(),
    ciHigh: real('ci_high').notNull(),
    regionCounts: jsonb('region_counts').notNull(),
    topZones: jsonb('top_zones').notNull(),
    plantSites: jsonb('plant_sites').notNull(),
    plantTimeS: real('plant_time_s'),
  },
  (table) => [
    foreignKey({
      columns: [table.mapId],
      foreignColumns: [maps.id],
      name: 'strategies_map_id_fkey',
    }).onDelete('cascade'),
    check('strategies_side_check', sql`side = ANY (ARRAY['attack'::text, 'defense'::text])`),
  ],
)

export const insights = analytics.table(
  'insights',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity({
      name: 'analytics.insights_id_seq',
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 2147483647,
      cache: 1,
    }),
    scope: text().notNull(),
    scopeId: integer('scope_id').notNull(),
    mapId: smallint('map_id'),
    side: text(),
    kind: text().notNull(),
    polarity: text().notNull(),
    severity: smallint().notNull(),
    title: text().notNull(),
    body: text().notNull(),
    metricValue: real('metric_value'),
    baselineValue: real('baseline_value'),
    sampleSize: integer('sample_size').notNull(),
    confidence: real().notNull(),
    isEstimate: boolean('is_estimate').notNull(),
    evidenceRoundIds: bigint('evidence_round_ids', { mode: 'number' }).array().default([]).notNull(),
  },
  (table) => [
    index('insights_kind_idx').using('btree', table.kind.asc().nullsLast().op('text_ops')),
    index('insights_scope_scope_id_idx').using(
      'btree',
      table.scope.asc().nullsLast().op('int4_ops'),
      table.scopeId.asc().nullsLast().op('int4_ops'),
    ),
    foreignKey({
      columns: [table.mapId],
      foreignColumns: [maps.id],
      name: 'insights_map_id_fkey',
    }).onDelete('cascade'),
    check(
      'insights_polarity_check',
      sql`polarity = ANY (ARRAY['negative'::text, 'positive'::text, 'neutral'::text])`,
    ),
    check('insights_scope_check', sql`scope = ANY (ARRAY['player'::text, 'team'::text])`),
    check('insights_severity_check', sql`(severity >= 1) AND (severity <= 3)`),
    check('insights_side_check', sql`side = ANY (ARRAY['attack'::text, 'defense'::text])`),
  ],
)

export const playerPatterns = analytics.table(
  'player_patterns',
  {
    playerId: integer('player_id').notNull(),
    mapId: smallint('map_id').notNull(),
    side: text().notNull(),
    pattern: text().notNull(),
    zoneId: integer('zone_id'),
    rounds: integer().notNull(),
    occurrences: integer().notNull(),
    expected: real().notNull(),
    rate: real().notNull(),
    baselineRate: real('baseline_rate').notNull(),
    pValue: real('p_value'),
    pAdjusted: real('p_adjusted'),
    costRounds: real('cost_rounds').notNull(),
    significant: boolean().notNull(),
    tier: text(),
    evidenceRoundIds: bigint('evidence_round_ids', { mode: 'number' }).array().notNull(),
  },
  (table) => [
    index('player_patterns_map_id_side_idx').using(
      'btree',
      table.mapId.asc().nullsLast().op('int2_ops'),
      table.side.asc().nullsLast().op('int2_ops'),
    ),
    index('player_patterns_player_id_idx').using('btree', table.playerId.asc().nullsLast().op('int4_ops')),
    foreignKey({
      columns: [table.mapId],
      foreignColumns: [maps.id],
      name: 'player_patterns_map_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.playerId],
      foreignColumns: [players.id],
      name: 'player_patterns_player_id_fkey',
    }),
    foreignKey({
      columns: [table.zoneId],
      foreignColumns: [zones.id],
      name: 'player_patterns_zone_id_fkey',
    }).onDelete('cascade'),
    check('player_patterns_side_check', sql`side = ANY (ARRAY['attack'::text, 'defense'::text])`),
    check('player_patterns_tier_check', sql`tier = ANY (ARRAY['confirmed'::text, 'watch'::text])`),
  ],
)

export const killAssists = analytics.table(
  'kill_assists',
  {
    killId: bigint('kill_id', { mode: 'number' }).notNull(),
    playerId: integer('player_id').notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.killId],
      foreignColumns: [kills.id],
      name: 'kill_assists_kill_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.playerId],
      foreignColumns: [players.id],
      name: 'kill_assists_player_id_fkey',
    }),
    primaryKey({ columns: [table.killId, table.playerId], name: 'kill_assists_pkey' }),
  ],
)

export const mapSites = analytics.table(
  'map_sites',
  {
    mapId: smallint('map_id').notNull(),
    site: text().notNull(),
    nx: real().notNull(),
    ny: real().notNull(),
    plants: integer().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.mapId],
      foreignColumns: [maps.id],
      name: 'map_sites_map_id_fkey',
    }).onDelete('cascade'),
    primaryKey({ columns: [table.mapId, table.site], name: 'map_sites_pkey' }),
  ],
)

export const roundStrategy = analytics.table(
  'round_strategy',
  {
    roundId: bigint('round_id', { mode: 'number' }).notNull(),
    teamId: integer('team_id').notNull(),
    side: text().notNull(),
    strategyId: integer('strategy_id').notNull(),
    confidence: real().notNull(),
    won: boolean().notNull(),
  },
  (table) => [
    index('round_strategy_strategy_id_idx').using('btree', table.strategyId.asc().nullsLast().op('int4_ops')),
    index('round_strategy_team_id_strategy_id_idx').using(
      'btree',
      table.teamId.asc().nullsLast().op('int4_ops'),
      table.strategyId.asc().nullsLast().op('int4_ops'),
    ),
    foreignKey({
      columns: [table.roundId],
      foreignColumns: [rounds.id],
      name: 'round_strategy_round_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.strategyId],
      foreignColumns: [strategies.id],
      name: 'round_strategy_strategy_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.teamId],
      foreignColumns: [teams.id],
      name: 'round_strategy_team_id_fkey',
    }),
    primaryKey({ columns: [table.roundId, table.teamId], name: 'round_strategy_pkey' }),
    check('round_strategy_side_check', sql`side = ANY (ARRAY['attack'::text, 'defense'::text])`),
  ],
)

export const mapCallouts = analytics.table(
  'map_callouts',
  {
    mapId: smallint('map_id').notNull(),
    region: text().notNull(),
    superRegion: text('super_region').notNull(),
    x: doublePrecision().notNull(),
    y: doublePrecision().notNull(),
    nx: doublePrecision(),
    ny: doublePrecision(),
  },
  (table) => [
    foreignKey({
      columns: [table.mapId],
      foreignColumns: [maps.id],
      name: 'map_callouts_map_id_fkey',
    }).onDelete('cascade'),
    primaryKey({ columns: [table.mapId, table.region, table.superRegion], name: 'map_callouts_pkey' }),
  ],
)

export const damageEvents = analytics.table(
  'damage_events',
  {
    roundId: bigint('round_id', { mode: 'number' }).notNull(),
    dealerId: integer('dealer_id').notNull(),
    receiverId: integer('receiver_id').notNull(),
    damage: integer().notNull(),
    headshots: smallint().notNull(),
    bodyshots: smallint().notNull(),
    legshots: smallint().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.dealerId],
      foreignColumns: [players.id],
      name: 'damage_events_dealer_id_fkey',
    }),
    foreignKey({
      columns: [table.receiverId],
      foreignColumns: [players.id],
      name: 'damage_events_receiver_id_fkey',
    }),
    foreignKey({
      columns: [table.roundId],
      foreignColumns: [rounds.id],
      name: 'damage_events_round_id_fkey',
    }).onDelete('cascade'),
    primaryKey({ columns: [table.dealerId, table.receiverId, table.roundId], name: 'damage_events_pkey' }),
  ],
)

export const abilityKills = analytics.table(
  'ability_kills',
  {
    matchId: integer('match_id').notNull(),
    playerId: integer('player_id').notNull(),
    agentId: smallint('agent_id').notNull(),
    slot: text().notNull(),
    abilityName: text('ability_name'),
    kills: smallint().notNull(),
    wpGain: real('wp_gain').notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.agentId],
      foreignColumns: [agents.id],
      name: 'ability_kills_agent_id_fkey',
    }),
    foreignKey({
      columns: [table.matchId],
      foreignColumns: [matches.id],
      name: 'ability_kills_match_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.playerId],
      foreignColumns: [players.id],
      name: 'ability_kills_player_id_fkey',
    }),
    primaryKey({ columns: [table.matchId, table.playerId, table.slot], name: 'ability_kills_pkey' }),
  ],
)

export const roundWpStates = analytics.table(
  'round_wp_states',
  {
    roundId: bigint('round_id', { mode: 'number' }).notNull(),
    seq: smallint().notNull(),
    event: text().notNull(),
    killId: bigint('kill_id', { mode: 'number' }),
    tRoundMs: integer('t_round_ms').notNull(),
    attackAlive: smallint('attack_alive').notNull(),
    defenseAlive: smallint('defense_alive').notNull(),
    wpAttack: real('wp_attack').notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.killId],
      foreignColumns: [kills.id],
      name: 'round_wp_states_kill_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.roundId],
      foreignColumns: [rounds.id],
      name: 'round_wp_states_round_id_fkey',
    }).onDelete('cascade'),
    primaryKey({ columns: [table.roundId, table.seq], name: 'round_wp_states_pkey' }),
    check(
      'round_wp_states_event_check',
      sql`event = ANY (ARRAY['start'::text, 'pre_kill'::text, 'kill'::text, 'plant'::text])`,
    ),
  ],
)

export const agentMapStats = analytics.table(
  'agent_map_stats',
  {
    mapId: smallint('map_id').notNull(),
    agentId: smallint('agent_id').notNull(),
    picks: integer().notNull(),
    pickRate: real('pick_rate').notNull(),
    rounds: integer().notNull(),
    winRate: real('win_rate').notNull(),
    acs: real().notNull(),
    kd: real().notNull(),
    acsBayes: real('acs_bayes').notNull(),
    kdBayes: real('kd_bayes').notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.agentId],
      foreignColumns: [agents.id],
      name: 'agent_map_stats_agent_id_fkey',
    }),
    foreignKey({
      columns: [table.mapId],
      foreignColumns: [maps.id],
      name: 'agent_map_stats_map_id_fkey',
    }),
    primaryKey({ columns: [table.agentId, table.mapId], name: 'agent_map_stats_pkey' }),
  ],
)

export const positionSamples = analytics.table(
  'position_samples',
  {
    killId: bigint('kill_id', { mode: 'number' }).notNull(),
    roundId: bigint('round_id', { mode: 'number' }).notNull(),
    tRoundMs: integer('t_round_ms').notNull(),
    playerId: integer('player_id').notNull(),
    side: text().notNull(),
    x: integer().notNull(),
    y: integer().notNull(),
    nx: real(),
    ny: real(),
    viewRad: real('view_rad').notNull(),
    zoneId: integer('zone_id'),
  },
  (table) => [
    index('position_samples_player_id_idx').using('btree', table.playerId.asc().nullsLast().op('int4_ops')),
    index('position_samples_round_id_idx').using('btree', table.roundId.asc().nullsLast().op('int8_ops')),
    index('position_samples_zone_id_idx').using('btree', table.zoneId.asc().nullsLast().op('int4_ops')),
    foreignKey({
      columns: [table.killId],
      foreignColumns: [kills.id],
      name: 'position_samples_kill_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.playerId],
      foreignColumns: [players.id],
      name: 'position_samples_player_id_fkey',
    }),
    foreignKey({
      columns: [table.zoneId],
      foreignColumns: [zones.id],
      name: 'position_samples_zone_fk',
    }).onDelete('set null'),
    primaryKey({ columns: [table.killId, table.playerId], name: 'position_samples_pkey' }),
    check('position_samples_side_check', sql`side = ANY (ARRAY['attack'::text, 'defense'::text])`),
  ],
)

export const roundPlayerStats = analytics.table(
  'round_player_stats',
  {
    roundId: bigint('round_id', { mode: 'number' }).notNull(),
    playerId: integer('player_id').notNull(),
    kills: smallint().notNull(),
    deaths: smallint().notNull(),
    assists: smallint().notNull(),
    kast: boolean().notNull(),
    firstKill: boolean('first_kill').notNull(),
    firstDeath: boolean('first_death').notNull(),
    tradeKills: smallint('trade_kills').notNull(),
    tradedDeath: boolean('traded_death').notNull(),
    clutchSize: smallint('clutch_size'),
    clutchWon: boolean('clutch_won'),
  },
  (table) => [
    foreignKey({
      columns: [table.playerId],
      foreignColumns: [players.id],
      name: 'round_player_stats_player_id_fkey',
    }),
    foreignKey({
      columns: [table.roundId],
      foreignColumns: [rounds.id],
      name: 'round_player_stats_round_id_fkey',
    }).onDelete('cascade'),
    primaryKey({ columns: [table.playerId, table.roundId], name: 'round_player_stats_pkey' }),
  ],
)

export const pressureStats = analytics.table(
  'pressure_stats',
  {
    playerId: integer('player_id').notNull(),
    teamId: integer('team_id').notNull(),
    mapId: smallint('map_id').notNull(),
    stageId: smallint('stage_id').notNull(),
    side: text().notNull(),
    context: text().notNull(),
    rounds: integer().notNull(),
    roundsWon: integer('rounds_won').notNull(),
    survived: integer().notNull(),
    kills: integer().notNull(),
    deaths: integer().notNull(),
    wpDelta: real('wp_delta').notNull(),
  },
  (table) => [
    index('pressure_stats_player_id_idx').using('btree', table.playerId.asc().nullsLast().op('int4_ops')),
    index('pressure_stats_team_id_idx').using('btree', table.teamId.asc().nullsLast().op('int4_ops')),
    foreignKey({
      columns: [table.mapId],
      foreignColumns: [maps.id],
      name: 'pressure_stats_map_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.playerId],
      foreignColumns: [players.id],
      name: 'pressure_stats_player_id_fkey',
    }),
    foreignKey({
      columns: [table.stageId],
      foreignColumns: [stages.id],
      name: 'pressure_stats_stage_id_fkey',
    }),
    foreignKey({
      columns: [table.teamId],
      foreignColumns: [teams.id],
      name: 'pressure_stats_team_id_fkey',
    }),
    primaryKey({
      columns: [table.context, table.mapId, table.playerId, table.side, table.stageId, table.teamId],
      name: 'pressure_stats_pkey',
    }),
    check('pressure_stats_side_check', sql`side = ANY (ARRAY['attack'::text, 'defense'::text])`),
  ],
)

export const rotations = analytics.table(
  'rotations',
  {
    roundId: bigint('round_id', { mode: 'number' }).notNull(),
    playerId: integer('player_id').notNull(),
    teamId: integer('team_id').notNull(),
    mapId: smallint('map_id').notNull(),
    side: text().notNull(),
    fromRegion: text('from_region').notNull(),
    toRegion: text('to_region').notNull(),
    leftAfterMs: integer('left_after_ms').notNull(),
    seenAtMs: integer('seen_at_ms').notNull(),
    informed: boolean().notNull(),
    sourceFell: boolean('source_fell').notNull(),
    roundWon: boolean('round_won').notNull(),
  },
  (table) => [
    index('rotations_player_id_idx').using('btree', table.playerId.asc().nullsLast().op('int4_ops')),
    index('rotations_team_id_idx').using('btree', table.teamId.asc().nullsLast().op('int4_ops')),
    foreignKey({
      columns: [table.mapId],
      foreignColumns: [maps.id],
      name: 'rotations_map_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.playerId],
      foreignColumns: [players.id],
      name: 'rotations_player_id_fkey',
    }),
    foreignKey({
      columns: [table.roundId],
      foreignColumns: [rounds.id],
      name: 'rotations_round_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.teamId],
      foreignColumns: [teams.id],
      name: 'rotations_team_id_fkey',
    }),
    primaryKey({ columns: [table.playerId, table.roundId, table.seenAtMs], name: 'rotations_pkey' }),
    check('rotations_side_check', sql`side = ANY (ARRAY['attack'::text, 'defense'::text])`),
  ],
)

export const heatmapZones = analytics.table(
  'heatmap_zones',
  {
    mapId: smallint('map_id').notNull(),
    stageId: smallint('stage_id').notNull(),
    teamId: integer('team_id').notNull(),
    playerId: integer('player_id').notNull(),
    agentId: smallint('agent_id').notNull(),
    side: text().notNull(),
    zoneId: integer('zone_id').notNull(),
    presence: integer().notNull(),
    kills: integer().notNull(),
    deaths: integer().notNull(),
    firstKills: integer('first_kills').notNull(),
    firstDeaths: integer('first_deaths').notNull(),
    tradedDeaths: integer('traded_deaths').notNull(),
  },
  (table) => [
    index('heatmap_zones_map_id_side_idx').using(
      'btree',
      table.mapId.asc().nullsLast().op('int2_ops'),
      table.side.asc().nullsLast().op('int2_ops'),
    ),
    index('heatmap_zones_player_id_idx').using('btree', table.playerId.asc().nullsLast().op('int4_ops')),
    index('heatmap_zones_team_id_idx').using('btree', table.teamId.asc().nullsLast().op('int4_ops')),
    foreignKey({
      columns: [table.agentId],
      foreignColumns: [agents.id],
      name: 'heatmap_zones_agent_id_fkey',
    }),
    foreignKey({
      columns: [table.mapId],
      foreignColumns: [maps.id],
      name: 'heatmap_zones_map_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.playerId],
      foreignColumns: [players.id],
      name: 'heatmap_zones_player_id_fkey',
    }),
    foreignKey({
      columns: [table.stageId],
      foreignColumns: [stages.id],
      name: 'heatmap_zones_stage_id_fkey',
    }),
    foreignKey({
      columns: [table.teamId],
      foreignColumns: [teams.id],
      name: 'heatmap_zones_team_id_fkey',
    }),
    foreignKey({
      columns: [table.zoneId],
      foreignColumns: [zones.id],
      name: 'heatmap_zones_zone_id_fkey',
    }).onDelete('cascade'),
    primaryKey({
      columns: [
        table.agentId,
        table.mapId,
        table.playerId,
        table.side,
        table.stageId,
        table.teamId,
        table.zoneId,
      ],
      name: 'heatmap_zones_pkey',
    }),
    check('heatmap_zones_side_check', sql`side = ANY (ARRAY['attack'::text, 'defense'::text])`),
  ],
)

export const combos = analytics.table(
  'combos',
  {
    teamId: integer('team_id').notNull(),
    mapId: smallint('map_id').notNull(),
    stageId: smallint('stage_id').notNull(),
    side: text().notNull(),
    kind: text().notNull(),
    playerA: integer('player_a').notNull(),
    playerB: integer('player_b').notNull(),
    agentA: smallint('agent_a').notNull(),
    agentB: smallint('agent_b').notNull(),
    occurrences: integer().notNull(),
    wpGain: real('wp_gain').notNull(),
    siteControl: integer('site_control').notNull(),
    occurrencesWon: integer('occurrences_won').notNull(),
  },
  (table) => [
    index('combos_agent_a_agent_b_idx').using(
      'btree',
      table.agentA.asc().nullsLast().op('int2_ops'),
      table.agentB.asc().nullsLast().op('int2_ops'),
    ),
    index('combos_team_id_idx').using('btree', table.teamId.asc().nullsLast().op('int4_ops')),
    foreignKey({
      columns: [table.agentA],
      foreignColumns: [agents.id],
      name: 'combos_agent_a_fkey',
    }),
    foreignKey({
      columns: [table.agentB],
      foreignColumns: [agents.id],
      name: 'combos_agent_b_fkey',
    }),
    foreignKey({
      columns: [table.mapId],
      foreignColumns: [maps.id],
      name: 'combos_map_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.playerA],
      foreignColumns: [players.id],
      name: 'combos_player_a_fkey',
    }),
    foreignKey({
      columns: [table.playerB],
      foreignColumns: [players.id],
      name: 'combos_player_b_fkey',
    }),
    foreignKey({
      columns: [table.stageId],
      foreignColumns: [stages.id],
      name: 'combos_stage_id_fkey',
    }),
    foreignKey({
      columns: [table.teamId],
      foreignColumns: [teams.id],
      name: 'combos_team_id_fkey',
    }),
    primaryKey({
      columns: [
        table.agentA,
        table.agentB,
        table.kind,
        table.mapId,
        table.playerA,
        table.playerB,
        table.side,
        table.stageId,
        table.teamId,
      ],
      name: 'combos_pkey',
    }),
    check('combos_kind_check', sql`kind = ANY (ARRAY['assist'::text, 'ability_followup'::text])`),
    check('combos_side_check', sql`side = ANY (ARRAY['attack'::text, 'defense'::text])`),
  ],
)

export const matchPlayers = analytics.table(
  'match_players',
  {
    matchId: integer('match_id').notNull(),
    playerId: integer('player_id').notNull(),
    teamId: integer('team_id').notNull(),
    agentId: smallint('agent_id').notNull(),
    firstSide: text('first_side').notNull(),
    score: integer().notNull(),
    kills: smallint().notNull(),
    deaths: smallint().notNull(),
    assists: smallint().notNull(),
    roundsPlayed: smallint('rounds_played').notNull(),
    castsGrenade: smallint('casts_grenade').notNull(),
    casts1: smallint('casts_1').notNull(),
    casts2: smallint('casts_2').notNull(),
    castsUlt: smallint('casts_ult').notNull(),
  },
  (table) => [
    index('match_players_player_id_idx').using('btree', table.playerId.asc().nullsLast().op('int4_ops')),
    index('match_players_team_id_idx').using('btree', table.teamId.asc().nullsLast().op('int4_ops')),
    foreignKey({
      columns: [table.agentId],
      foreignColumns: [agents.id],
      name: 'match_players_agent_id_fkey',
    }),
    foreignKey({
      columns: [table.matchId],
      foreignColumns: [matches.id],
      name: 'match_players_match_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.playerId],
      foreignColumns: [players.id],
      name: 'match_players_player_id_fkey',
    }),
    foreignKey({
      columns: [table.teamId],
      foreignColumns: [teams.id],
      name: 'match_players_team_id_fkey',
    }),
    primaryKey({ columns: [table.matchId, table.playerId], name: 'match_players_pkey' }),
    check('match_players_first_side_check', sql`first_side = ANY (ARRAY['attack'::text, 'defense'::text])`),
  ],
)

export const heatmapCells = analytics.table(
  'heatmap_cells',
  {
    mapId: smallint('map_id').notNull(),
    stageId: smallint('stage_id').notNull(),
    teamId: integer('team_id').notNull(),
    playerId: integer('player_id').notNull(),
    agentId: smallint('agent_id').notNull(),
    side: text().notNull(),
    cx: smallint().notNull(),
    cy: smallint().notNull(),
    presence: integer().notNull(),
    kills: integer().notNull(),
    deaths: integer().notNull(),
    firstKills: integer('first_kills').notNull(),
    firstDeaths: integer('first_deaths').notNull(),
    tradedDeaths: integer('traded_deaths').notNull(),
  },
  (table) => [
    index('heatmap_cells_map_id_side_idx').using(
      'btree',
      table.mapId.asc().nullsLast().op('int2_ops'),
      table.side.asc().nullsLast().op('int2_ops'),
    ),
    index('heatmap_cells_player_id_idx').using('btree', table.playerId.asc().nullsLast().op('int4_ops')),
    index('heatmap_cells_team_id_idx').using('btree', table.teamId.asc().nullsLast().op('int4_ops')),
    foreignKey({
      columns: [table.agentId],
      foreignColumns: [agents.id],
      name: 'heatmap_cells_agent_id_fkey',
    }),
    foreignKey({
      columns: [table.mapId],
      foreignColumns: [maps.id],
      name: 'heatmap_cells_map_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.playerId],
      foreignColumns: [players.id],
      name: 'heatmap_cells_player_id_fkey',
    }),
    foreignKey({
      columns: [table.stageId],
      foreignColumns: [stages.id],
      name: 'heatmap_cells_stage_id_fkey',
    }),
    foreignKey({
      columns: [table.teamId],
      foreignColumns: [teams.id],
      name: 'heatmap_cells_team_id_fkey',
    }),
    primaryKey({
      columns: [
        table.agentId,
        table.cx,
        table.cy,
        table.mapId,
        table.playerId,
        table.side,
        table.stageId,
        table.teamId,
      ],
      name: 'heatmap_cells_pkey',
    }),
    check('heatmap_cells_side_check', sql`side = ANY (ARRAY['attack'::text, 'defense'::text])`),
  ],
)

export const roundTeamEconomy = analytics.table(
  'round_team_economy',
  {
    roundId: bigint('round_id', { mode: 'number' }).notNull(),
    teamId: integer('team_id').notNull(),
    matchId: integer('match_id').notNull(),
    mapId: smallint('map_id').notNull(),
    stageId: smallint('stage_id').notNull(),
    number: smallint().notNull(),
    side: text().notNull(),
    buyType: text('buy_type').notNull(),
    opponentBuy: text('opponent_buy').notNull(),
    loadout: integer().notNull(),
    spent: integer().notNull(),
    bank: integer().notNull(),
    damage: integer().notNull(),
    won: boolean().notNull(),
    expectedWin: real('expected_win').notNull(),
  },
  (table) => [
    index('round_team_economy_map_id_idx').using('btree', table.mapId.asc().nullsLast().op('int2_ops')),
    index('round_team_economy_team_id_idx').using('btree', table.teamId.asc().nullsLast().op('int4_ops')),
    foreignKey({
      columns: [table.mapId],
      foreignColumns: [maps.id],
      name: 'round_team_economy_map_id_fkey',
    }),
    foreignKey({
      columns: [table.matchId],
      foreignColumns: [matches.id],
      name: 'round_team_economy_match_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.roundId],
      foreignColumns: [rounds.id],
      name: 'round_team_economy_round_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.stageId],
      foreignColumns: [stages.id],
      name: 'round_team_economy_stage_id_fkey',
    }),
    foreignKey({
      columns: [table.teamId],
      foreignColumns: [teams.id],
      name: 'round_team_economy_team_id_fkey',
    }),
    primaryKey({ columns: [table.roundId, table.teamId], name: 'round_team_economy_pkey' }),
    check(
      'round_team_economy_buy_type_check',
      sql`buy_type = ANY (ARRAY['pistol'::text, 'eco'::text, 'semi_eco'::text, 'half_buy'::text, 'full_buy'::text])`,
    ),
    check('round_team_economy_side_check', sql`side = ANY (ARRAY['attack'::text, 'defense'::text])`),
  ],
)

export const roundPlayers = analytics.table(
  'round_players',
  {
    roundId: bigint('round_id', { mode: 'number' }).notNull(),
    playerId: integer('player_id').notNull(),
    teamId: integer('team_id').notNull(),
    side: text().notNull(),
    score: integer().notNull(),
    loadoutValue: integer('loadout_value').notNull(),
    spent: integer().notNull(),
    remaining: integer().notNull(),
    weaponId: smallint('weapon_id'),
    armorId: smallint('armor_id'),
    damageDealt: integer('damage_dealt').notNull(),
    headshots: smallint().notNull(),
    bodyshots: smallint().notNull(),
    legshots: smallint().notNull(),
    kills: smallint().notNull(),
    died: boolean().notNull(),
  },
  (table) => [
    index('round_players_player_id_idx').using('btree', table.playerId.asc().nullsLast().op('int4_ops')),
    foreignKey({
      columns: [table.armorId],
      foreignColumns: [weapons.id],
      name: 'round_players_armor_id_fkey',
    }),
    foreignKey({
      columns: [table.playerId],
      foreignColumns: [players.id],
      name: 'round_players_player_id_fkey',
    }),
    foreignKey({
      columns: [table.roundId],
      foreignColumns: [rounds.id],
      name: 'round_players_round_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.teamId],
      foreignColumns: [teams.id],
      name: 'round_players_team_id_fkey',
    }),
    foreignKey({
      columns: [table.weaponId],
      foreignColumns: [weapons.id],
      name: 'round_players_weapon_id_fkey',
    }),
    primaryKey({ columns: [table.playerId, table.roundId], name: 'round_players_pkey' }),
    check('round_players_side_check', sql`side = ANY (ARRAY['attack'::text, 'defense'::text])`),
  ],
)

export const abilityUsage = analytics.table(
  'ability_usage',
  {
    matchId: integer('match_id').notNull(),
    playerId: integer('player_id').notNull(),
    teamId: integer('team_id').notNull(),
    agentId: smallint('agent_id').notNull(),
    mapId: smallint('map_id').notNull(),
    rounds: smallint().notNull(),
    casts: integer().notNull(),
    castsPerRound: real('casts_per_round').notNull(),
    castsPercentile: real('casts_percentile').notNull(),
    impactPerRound: real('impact_per_round').notNull(),
    impactPercentile: real('impact_percentile').notNull(),
    abilityKills: smallint('ability_kills').notNull(),
    ultCasts: smallint('ult_casts').notNull(),
    ultKills: smallint('ult_kills').notNull(),
    ultKillsDecided: smallint('ult_kills_decided').notNull(),
    likelyOveruse: boolean('likely_overuse').notNull(),
  },
  (table) => [
    index('ability_usage_player_id_idx').using('btree', table.playerId.asc().nullsLast().op('int4_ops')),
    foreignKey({
      columns: [table.agentId],
      foreignColumns: [agents.id],
      name: 'ability_usage_agent_id_fkey',
    }),
    foreignKey({
      columns: [table.mapId],
      foreignColumns: [maps.id],
      name: 'ability_usage_map_id_fkey',
    }),
    foreignKey({
      columns: [table.matchId],
      foreignColumns: [matches.id],
      name: 'ability_usage_match_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.playerId],
      foreignColumns: [players.id],
      name: 'ability_usage_player_id_fkey',
    }),
    foreignKey({
      columns: [table.teamId],
      foreignColumns: [teams.id],
      name: 'ability_usage_team_id_fkey',
    }),
    primaryKey({ columns: [table.matchId, table.playerId], name: 'ability_usage_pkey' }),
  ],
)

export const weaponStats = analytics.table(
  'weapon_stats',
  {
    matchId: integer('match_id').notNull(),
    playerId: integer('player_id').notNull(),
    side: text().notNull(),
    weaponId: smallint('weapon_id').notNull(),
    mapId: smallint('map_id').notNull(),
    stageId: smallint('stage_id').notNull(),
    teamId: integer('team_id').notNull(),
    agentId: smallint('agent_id').notNull(),
    roundsEquipped: smallint('rounds_equipped').notNull(),
    roundsWonEquipped: smallint('rounds_won_equipped').notNull(),
    damageEquipped: integer('damage_equipped').notNull(),
    headshotsEquipped: integer('headshots_equipped').notNull(),
    bodyshotsEquipped: integer('bodyshots_equipped').notNull(),
    legshotsEquipped: integer('legshots_equipped').notNull(),
    kills: smallint().notNull(),
    firstKills: smallint('first_kills').notNull(),
    kills010M: smallint('kills_0_10m').notNull(),
    kills1020M: smallint('kills_10_20m').notNull(),
    kills2030M: smallint('kills_20_30m').notNull(),
    kills30MPlus: smallint('kills_30m_plus').notNull(),
    distanceSumM: real('distance_sum_m').notNull(),
    distanceSamples: smallint('distance_samples').notNull(),
  },
  (table) => [
    index('weapon_stats_player_id_idx').using('btree', table.playerId.asc().nullsLast().op('int4_ops')),
    index('weapon_stats_weapon_id_idx').using('btree', table.weaponId.asc().nullsLast().op('int2_ops')),
    foreignKey({
      columns: [table.agentId],
      foreignColumns: [agents.id],
      name: 'weapon_stats_agent_id_fkey',
    }),
    foreignKey({
      columns: [table.mapId],
      foreignColumns: [maps.id],
      name: 'weapon_stats_map_id_fkey',
    }),
    foreignKey({
      columns: [table.matchId],
      foreignColumns: [matches.id],
      name: 'weapon_stats_match_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.playerId],
      foreignColumns: [players.id],
      name: 'weapon_stats_player_id_fkey',
    }),
    foreignKey({
      columns: [table.stageId],
      foreignColumns: [stages.id],
      name: 'weapon_stats_stage_id_fkey',
    }),
    foreignKey({
      columns: [table.teamId],
      foreignColumns: [teams.id],
      name: 'weapon_stats_team_id_fkey',
    }),
    foreignKey({
      columns: [table.weaponId],
      foreignColumns: [weapons.id],
      name: 'weapon_stats_weapon_id_fkey',
    }),
    primaryKey({
      columns: [table.matchId, table.playerId, table.side, table.weaponId],
      name: 'weapon_stats_pkey',
    }),
    check('weapon_stats_side_check', sql`side = ANY (ARRAY['attack'::text, 'defense'::text])`),
  ],
)

export const playerMatchStats = analytics.table(
  'player_match_stats',
  {
    matchId: integer('match_id').notNull(),
    playerId: integer('player_id').notNull(),
    side: text().notNull(),
    mapId: smallint('map_id').notNull(),
    stageId: smallint('stage_id').notNull(),
    teamId: integer('team_id').notNull(),
    agentId: smallint('agent_id').notNull(),
    rounds: smallint().notNull(),
    roundsWon: smallint('rounds_won').notNull(),
    score: integer().notNull(),
    kills: smallint().notNull(),
    deaths: smallint().notNull(),
    assists: smallint().notNull(),
    damage: integer().notNull(),
    headshots: integer().notNull(),
    bodyshots: integer().notNull(),
    legshots: integer().notNull(),
    kastRounds: smallint('kast_rounds').notNull(),
    firstKills: smallint('first_kills').notNull(),
    firstDeaths: smallint('first_deaths').notNull(),
    tradeKills: smallint('trade_kills').notNull(),
    tradedDeaths: smallint('traded_deaths').notNull(),
    multikills2: smallint('multikills_2').notNull(),
    multikills3: smallint('multikills_3').notNull(),
    multikills4: smallint('multikills_4').notNull(),
    multikills5: smallint('multikills_5').notNull(),
    clutchAttempts: smallint('clutch_attempts').notNull(),
    clutchWins: smallint('clutch_wins').notNull(),
    plants: smallint().notNull(),
    defuses: smallint().notNull(),
  },
  (table) => [
    index('player_match_stats_map_id_agent_id_idx').using(
      'btree',
      table.mapId.asc().nullsLast().op('int2_ops'),
      table.agentId.asc().nullsLast().op('int2_ops'),
    ),
    index('player_match_stats_player_id_idx').using('btree', table.playerId.asc().nullsLast().op('int4_ops')),
    index('player_match_stats_team_id_idx').using('btree', table.teamId.asc().nullsLast().op('int4_ops')),
    foreignKey({
      columns: [table.agentId],
      foreignColumns: [agents.id],
      name: 'player_match_stats_agent_id_fkey',
    }),
    foreignKey({
      columns: [table.mapId],
      foreignColumns: [maps.id],
      name: 'player_match_stats_map_id_fkey',
    }),
    foreignKey({
      columns: [table.matchId],
      foreignColumns: [matches.id],
      name: 'player_match_stats_match_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.playerId],
      foreignColumns: [players.id],
      name: 'player_match_stats_player_id_fkey',
    }),
    foreignKey({
      columns: [table.stageId],
      foreignColumns: [stages.id],
      name: 'player_match_stats_stage_id_fkey',
    }),
    foreignKey({
      columns: [table.teamId],
      foreignColumns: [teams.id],
      name: 'player_match_stats_team_id_fkey',
    }),
    primaryKey({ columns: [table.matchId, table.playerId, table.side], name: 'player_match_stats_pkey' }),
    check('player_match_stats_side_check', sql`side = ANY (ARRAY['attack'::text, 'defense'::text])`),
  ],
)
