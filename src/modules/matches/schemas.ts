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

export const MatchesQuery = Type.Object({
  tournament: Filters.tournament,
  stage: Filters.stage,
  map: Filters.map,
  team: Filters.team,
  player: Filters.player,
  ...PageQuery,
})

const TeamScore = Type.Object({ team: TeamRef, score: Type.Integer() })

export const MatchSummary = Type.Object({
  id: Type.Integer(),
  seriesId: Type.Integer(),
  game: Type.String(),
  playedOn: Type.String({ format: 'date' }),
  startedAt: Type.String({ format: 'date-time' }),
  durationMs: Type.Integer(),
  tournament: Type.String(),
  stage: Type.Object({ id: Type.Integer(), name: Type.String() }),
  map: MapRef,
  red: TeamScore,
  blue: TeamScore,
  winnerTeamId: Type.Integer(),
})

export const MatchesPage = Paginated(MatchSummary)

export const ScoreboardLine = Type.Object({
  player: PlayerRef,
  teamId: Type.Integer(),
  agent: AgentRef,
  rounds: Type.Integer(),
  acs: Type.Number(),
  kills: Type.Integer(),
  deaths: Type.Integer(),
  assists: Type.Integer(),
  kd: Type.Number(),
  adr: Type.Number(),
  headshotRate: Rate,
  kast: Rate,
  firstKills: Type.Integer(),
  firstDeaths: Type.Integer(),
  plants: Type.Integer(),
  defuses: Type.Integer(),
})

export const MatchDetail = Type.Object({
  ...MatchSummary.properties,
  gameVersion: Type.String(),
  scoreboard: Type.Array(ScoreboardLine),
})

const BuyType = Type.Union([
  Type.Literal('pistol'),
  Type.Literal('eco'),
  Type.Literal('semi_eco'),
  Type.Literal('half_buy'),
  Type.Literal('full_buy'),
])

export const RoundSummary = Type.Object({
  number: Type.Integer(),
  winnerTeamId: Type.Integer(),
  winnerSide: Side,
  attackTeamId: Type.Integer(),
  defenseTeamId: Type.Integer(),
  resultCode: Type.String(),
  plantSite: Nullable(Type.String()),
  plantTimeMs: Nullable(Type.Integer()),
  buys: Type.Array(Type.Object({ teamId: Type.Integer(), buyType: BuyType, loadout: Type.Integer() })),
  winProbability: Type.Array(
    Type.Object({
      tMs: Type.Integer(),
      event: Type.Union([Type.Literal('start'), Type.Literal('kill'), Type.Literal('plant')]),
      attack: Rate,
    }),
  ),
})

export const RoundParams = Type.Object({ id: Type.Integer({ minimum: 1 }), n: Type.Integer({ minimum: 0 }) })

const Position = Type.Object({
  playerId: Type.Integer(),
  side: Side,
  x: Type.Number(),
  y: Type.Number(),
  view: Type.Number(),
})

export const ReplayEvent = Type.Union([
  Type.Object({
    type: Type.Literal('kill'),
    tMs: Type.Integer(),
    killerId: Nullable(Type.Integer()),
    victimId: Type.Integer(),
    kind: Type.Union([Type.Literal('enemy'), Type.Literal('team'), Type.Literal('self')]),
    damageType: Type.String(),
    weaponId: Nullable(Type.Integer()),
    abilitySlot: Nullable(Type.String()),
    isFirstKill: Type.Boolean(),
    isTrade: Type.Boolean(),
    killerAt: Nullable(Type.Object({ x: Type.Number(), y: Type.Number() })),
    victimAt: Nullable(Type.Object({ x: Type.Number(), y: Type.Number() })),
    assistIds: Type.Array(Type.Integer()),
    positions: Type.Array(Position),
  }),
  Type.Object({
    type: Type.Union([Type.Literal('plant'), Type.Literal('defuse')]),
    tMs: Type.Integer(),
    playerId: Nullable(Type.Integer()),
    site: Nullable(Type.String()),
    at: Nullable(Type.Object({ x: Type.Number(), y: Type.Number() })),
  }),
])

export const Replay = Type.Object({
  matchId: Type.Integer(),
  number: Type.Integer(),
  mapId: Type.Integer(),
  winnerTeamId: Type.Integer(),
  resultCode: Type.String(),
  players: Type.Array(
    Type.Object({
      player: PlayerRef,
      teamId: Type.Integer(),
      side: Side,
      agent: AgentRef,
      loadout: Type.Integer(),
    }),
  ),
  events: Type.Array(ReplayEvent),
})

export type MatchesQuery = Static<typeof MatchesQuery>
export type MatchSummary = Static<typeof MatchSummary>
export type MatchDetail = Static<typeof MatchDetail>
export type RoundSummary = Static<typeof RoundSummary>
export type Replay = Static<typeof Replay>
export type ReplayEvent = Static<typeof ReplayEvent>
