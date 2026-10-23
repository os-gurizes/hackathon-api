import { Type, type Static } from 'typebox'

import { Filters } from '../../shared/filters.js'
import {
  AgentRef,
  MapRef,
  Nullable,
  PageQuery,
  Paginated,
  PlayerRef,
  Rate,
  Side,
  TeamRef,
} from '../../shared/schema.js'
import { SortQuery, StatLine } from '../../shared/stats.js'

export const PlayersQuery = Type.Object({
  ...Filters,
  search: Type.Optional(Type.String({ minLength: 2, maxLength: 50 })),
  sort: SortQuery,
  minRounds: Type.Integer({ minimum: 0, maximum: 2000, default: 40 }),
  ...PageQuery,
})

export const RankingItem = Type.Object({ player: PlayerRef, stats: StatLine, sortValue: Type.Number() })
export const RankingPage = Paginated(RankingItem)

export const PlayerProfile = Type.Object({
  player: PlayerRef,
  teams: Type.Array(
    Type.Object({ team: TeamRef, matches: Type.Integer(), lastPlayedOn: Type.String({ format: 'date' }) }),
  ),
  totals: StatLine,
  topAgents: Type.Array(Type.Object({ agent: AgentRef, matches: Type.Integer() })),
})

export const PlayerStatsQuery = Type.Object({
  tournament: Filters.tournament,
  stage: Filters.stage,
  map: Filters.map,
  side: Filters.side,
  team: Filters.team,
  agent: Filters.agent,
})

export const PlayerStats = Type.Object({
  overall: StatLine,
  byMap: Type.Array(Type.Object({ map: MapRef, stats: StatLine })),
  byAgent: Type.Array(Type.Object({ agent: AgentRef, stats: StatLine })),
  bySide: Type.Array(Type.Object({ side: Side, stats: StatLine })),
  kdPerMatch: Type.Object({
    mean: Type.Number(),
    median: Type.Number(),
    stdDev: Type.Number(),
    matches: Type.Array(
      Type.Object({ matchId: Type.Integer(), playedOn: Type.String({ format: 'date' }), kd: Type.Number() }),
    ),
  }),
})

export const PlayerMatchesQuery = Type.Object({ map: Filters.map, ...PageQuery })

export const PlayerMatch = Type.Object({
  matchId: Type.Integer(),
  playedOn: Type.String({ format: 'date' }),
  map: MapRef,
  team: TeamRef,
  opponent: TeamRef,
  teamScore: Type.Integer(),
  opponentScore: Type.Integer(),
  won: Type.Boolean(),
  agent: AgentRef,
  acs: Type.Number(),
  kills: Type.Integer(),
  deaths: Type.Integer(),
  assists: Type.Integer(),
  kd: Type.Number(),
})

export const PlayerMatchesPage = Paginated(PlayerMatch)

export const PlayerAgent = Type.Object({
  agent: AgentRef,
  stats: StatLine,
  baselineAcs: Nullable(Type.Number()),
})

export const PlayerWeapon = Type.Object({
  weapon: Type.Object({ id: Type.Integer(), name: Type.String(), category: Nullable(Type.String()) }),
  kills: Type.Integer(),
  firstKills: Type.Integer(),
  roundsEquipped: Type.Integer(),
  winRateEquipped: Rate,
  headshotRateEquipped: Rate,
  averageDistance: Nullable(Type.Number()),
  killsByDistance: Type.Object({
    under10: Type.Integer(),
    from10to20: Type.Integer(),
    from20to30: Type.Integer(),
    over30: Type.Integer(),
  }),
  baseline: Type.Object({
    winRateEquipped: Rate,
    headshotRateEquipped: Rate,
    averageDistance: Nullable(Type.Number()),
  }),
})

export type PlayersQuery = Static<typeof PlayersQuery>
export type RankingItem = Static<typeof RankingItem>
export type PlayerProfile = Static<typeof PlayerProfile>
export type PlayerStats = Static<typeof PlayerStats>
export type PlayerFilters = Static<typeof PlayerStatsQuery>
export type PlayerMatchesQuery = Static<typeof PlayerMatchesQuery>
export type PlayerMatch = Static<typeof PlayerMatch>
export type PlayerAgent = Static<typeof PlayerAgent>
export type PlayerWeapon = Static<typeof PlayerWeapon>
