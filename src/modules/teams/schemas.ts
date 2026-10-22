import { Type, type Static } from 'typebox'

import { MapRef, PlayerRef, Rate, TeamRef } from '../../shared/schema.js'

export const TeamsQuery = Type.Object({ tournament: Type.Optional(Type.Integer({ minimum: 1 })) })

export const TeamSummary = Type.Object({
  team: TeamRef,
  matches: Type.Integer(),
  wins: Type.Integer(),
  winRate: Rate,
})

export const TeamProfile = Type.Object({
  ...TeamSummary.properties,
  rosters: Type.Array(
    Type.Object({
      tournament: Type.Object({ id: Type.Integer(), name: Type.String() }),
      players: Type.Array(Type.Object({ player: PlayerRef, matches: Type.Integer() })),
    }),
  ),
  maps: Type.Array(
    Type.Object({
      map: MapRef,
      matches: Type.Integer(),
      wins: Type.Integer(),
      attackRoundWinRate: Rate,
      defenseRoundWinRate: Rate,
    }),
  ),
})

export type TeamsQuery = Static<typeof TeamsQuery>
export type TeamSummary = Static<typeof TeamSummary>
export type TeamProfile = Static<typeof TeamProfile>
