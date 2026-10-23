import { Type, type Static } from 'typebox'

import { Filters } from '../../shared/filters.js'
import { AgentRef, Literals, Nullable, Rate, Side } from '../../shared/schema.js'

export const Metric = Literals(
  ['presence', 'kills', 'deaths', 'kd', 'first_kills', 'first_deaths', 'traded_deaths'],
  { default: 'presence' },
)

export const HeatmapQuery = Type.Object({
  metric: Metric,
  resolution: Literals(['cells', 'zones'], { default: 'cells' }),
  tournament: Filters.tournament,
  stage: Filters.stage,
  side: Filters.side,
  team: Filters.team,
  player: Filters.player,
  agent: Filters.agent,
})

const Counts = {
  presence: Type.Integer(),
  kills: Type.Integer(),
  deaths: Type.Integer(),
  firstKills: Type.Integer(),
  firstDeaths: Type.Integer(),
  tradedDeaths: Type.Integer(),
}

export const Heatmap = Type.Object({
  mapId: Type.Integer(),
  metric: Metric,
  resolution: Literals(['cells', 'zones']),
  grid: Type.Integer(),
  maxValue: Type.Number(),
  cells: Type.Array(
    Type.Object({ x: Type.Integer(), y: Type.Integer(), value: Type.Number(), sampleSize: Type.Integer() }),
  ),
  zones: Type.Array(
    Type.Object({
      zoneId: Type.Integer(),
      name: Type.String(),
      value: Type.Number(),
      sampleSize: Type.Integer(),
      tradeRate: Nullable(Rate),
      ...Counts,
    }),
  ),
})

export const MapStatsQuery = Type.Object({
  tournament: Filters.tournament,
  stage: Filters.stage,
  team: Filters.team,
})

export const MapStats = Type.Object({
  mapId: Type.Integer(),
  matches: Type.Integer(),
  rounds: Type.Integer(),
  sides: Type.Array(Type.Object({ side: Side, roundWinRate: Rate })),
  sites: Type.Array(
    Type.Object({
      site: Type.String(),
      plants: Type.Integer(),
      plantShare: Rate,
      attackWinRateAfterPlant: Rate,
    }),
  ),
  agents: Type.Array(Type.Object({ agent: AgentRef, picks: Type.Integer(), pickRate: Rate, winRate: Rate })),
})

export type Metric = Static<typeof Metric>
export type HeatmapQuery = Static<typeof HeatmapQuery>
export type Heatmap = Static<typeof Heatmap>
export type MapStatsQuery = Static<typeof MapStatsQuery>
export type MapStats = Static<typeof MapStats>
