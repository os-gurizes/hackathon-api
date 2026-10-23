import { Type, type Static } from 'typebox'

import { RoundRef } from '../../shared/rounds.js'
import { AgentRef, Literals, MapRef, Nullable, PlayerRef, Rate, Side } from '../../shared/schema.js'

export const AnalysisQuery = Type.Object({
  tournament: Type.Optional(Type.Integer({ minimum: 1 })),
  stage: Type.Optional(Type.Integer({ minimum: 1 })),
  map: Type.Optional(Type.Integer({ minimum: 1 })),
  side: Type.Optional(Side),
})

export const PatternsQuery = Type.Object({
  map: AnalysisQuery.properties.map,
  side: AnalysisQuery.properties.side,
})

export const AbilitiesQuery = Type.Object({
  tournament: AnalysisQuery.properties.tournament,
  stage: AnalysisQuery.properties.stage,
  map: AnalysisQuery.properties.map,
})

export const BuyType = Literals(['pistol', 'eco', 'semi_eco', 'half_buy', 'full_buy'])

export const TeamEconomy = Type.Object({
  byBuyType: Type.Array(
    Type.Object({
      buyType: BuyType,
      rounds: Type.Integer(),
      winRate: Rate,
      averageLoadout: Type.Number(),
      averageSpent: Type.Number(),
      averageBank: Type.Number(),
    }),
  ),
  matrix: Type.Array(
    Type.Object({
      buyType: BuyType,
      opponentBuy: BuyType,
      rounds: Type.Integer(),
      winRate: Rate,
      expectedWinRate: Rate,
    }),
  ),
  flags: Type.Array(
    Type.Object({
      flag: Type.String(),
      scope: Literals(['team', 'player']),
      player: Nullable(PlayerRef),
      count: Type.Integer(),
      winRate: Rate,
      expectedWinRate: Rate,
      examples: Type.Array(RoundRef),
    }),
  ),
})

export const StrategyUsage = Type.Object({
  strategy: Type.Object({
    id: Type.Integer(),
    map: MapRef,
    side: Side,
    title: Type.String(),
    description: Type.String(),
    isNoise: Type.Boolean(),
    regionCounts: Type.Record(Type.String(), Type.Integer()),
    topZones: Type.Array(Type.Object({ zoneId: Type.Integer(), name: Type.String(), share: Type.Number() })),
    plantSites: Type.Record(Type.String(), Type.Number()),
    plantTimeSeconds: Nullable(Type.Number()),
    overallWinRate: Rate,
    overallRounds: Type.Integer(),
  }),
  rounds: Type.Integer(),
  wins: Type.Integer(),
  winRate: Rate,
  confidenceInterval: Type.Tuple([Rate, Rate]),
  examples: Type.Array(RoundRef),
})

export const Rotations = Type.Object({
  isEstimate: Type.Boolean(),
  summary: Type.Array(
    Type.Object({
      side: Side,
      informed: Type.Boolean(),
      rotations: Type.Integer(),
      sourceFellRate: Rate,
      roundWinRate: Rate,
    }),
  ),
  byPlayer: Type.Array(
    Type.Object({
      player: PlayerRef,
      rotations: Type.Integer(),
      uninformed: Type.Integer(),
      uninformedSourceFellRate: Nullable(Rate),
    }),
  ),
  examples: Type.Array(
    Type.Object({
      round: RoundRef,
      player: PlayerRef,
      from: Type.String(),
      to: Type.String(),
      leftAfterMs: Type.Integer(),
      seenAtMs: Type.Integer(),
      sourceFell: Type.Boolean(),
    }),
  ),
})

export const Combo = Type.Object({
  kind: Literals(['assist', 'ability_followup']),
  playerA: PlayerRef,
  playerB: PlayerRef,
  agentA: AgentRef,
  agentB: AgentRef,
  occurrences: Type.Integer(),
  averageWpGain: Type.Number(),
  siteControlRate: Rate,
  winRate: Rate,
})

export const Combos = Type.Object({ isEstimate: Type.Boolean(), combos: Type.Array(Combo) })

export const PressureLine = Type.Object({
  context: Type.String(),
  playerRounds: Type.Integer(),
  winRate: Rate,
  survivalRate: Rate,
  kd: Type.Number(),
  wpDeltaPerRound: Type.Number(),
  baseline: Type.Object({ winRate: Rate, survivalRate: Rate, kd: Type.Number() }),
})

export const PlayerPattern = Type.Object({
  pattern: Literals(['first_death_zone', 'isolated_death', 'repeat_after_first_death', 'predictable_route']),
  tier: Literals(['confirmed', 'watch']),
  map: MapRef,
  side: Side,
  zone: Nullable(Type.Object({ id: Type.Integer(), name: Type.String() })),
  rounds: Type.Integer(),
  occurrences: Type.Integer(),
  expected: Type.Number(),
  rate: Rate,
  baselineRate: Rate,
  costRounds: Type.Number(),
  examples: Type.Array(RoundRef),
})

export const PlayerAbilities = Type.Object({
  isEstimate: Type.Boolean(),
  abilityKills: Type.Array(
    Type.Object({
      agent: AgentRef,
      slot: Type.String(),
      abilityName: Nullable(Type.String()),
      kills: Type.Integer(),
      averageWpGain: Type.Number(),
    }),
  ),
  usage: Type.Object({
    matches: Type.Integer(),
    likelyOveruseMatches: Type.Integer(),
    castsPerRound: Type.Number(),
    ultimateCasts: Type.Integer(),
    ultimateKills: Type.Integer(),
    ultimateKillsInDecidedRounds: Type.Integer(),
  }),
})

export type AnalysisQuery = Static<typeof AnalysisQuery>
export type PatternsQuery = Static<typeof PatternsQuery>
export type AbilitiesQuery = Static<typeof AbilitiesQuery>
export type TeamEconomy = Static<typeof TeamEconomy>
export type StrategyUsage = Static<typeof StrategyUsage>
export type Rotations = Static<typeof Rotations>
export type Combos = Static<typeof Combos>
export type PressureLine = Static<typeof PressureLine>
export type PlayerPattern = Static<typeof PlayerPattern>
export type PlayerAbilities = Static<typeof PlayerAbilities>
