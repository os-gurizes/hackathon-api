import { Type, type Static } from 'typebox'

import { Literals, Nullable, TeamRef } from '../../shared/schema.js'

export const Stage = Type.Object({
  id: Type.Integer(),
  slug: Type.String(),
  name: Type.String(),
  order: Type.Integer(),
  matches: Type.Integer(),
})

export const Tournament = Type.Object({
  id: Type.Integer(),
  slug: Type.String(),
  name: Type.String(),
  stages: Type.Array(Stage),
})

export const Standing = Type.Object({
  team: TeamRef,
  seriesPlayed: Type.Integer(),
  seriesWon: Type.Integer(),
  mapsWon: Type.Integer(),
  mapsLost: Type.Integer(),
  roundDiff: Type.Integer(),
})

export const StageStandings = Type.Object({
  stage: Type.Object({ id: Type.Integer(), name: Type.String() }),
  standings: Type.Array(Standing),
})

export const StandingsQuery = Type.Object({ stage: Type.Optional(Type.Integer({ minimum: 1 })) })

export const MapSummary = Type.Object({
  id: Type.Integer(),
  slug: Type.String(),
  name: Type.String(),
  matches: Type.Integer(),
  silhouetteQuality: Nullable(Literals(['ok', 'low'])),
})

export const Point = Type.Object({ x: Type.Number(), y: Type.Number() })

export const MapDetail = Type.Object({
  id: Type.Integer(),
  slug: Type.String(),
  name: Type.String(),
  viewBox: Type.Array(Type.Number(), { minItems: 4, maxItems: 4 }),
  silhouette: Nullable(Type.String()),
  silhouetteQuality: Nullable(Literals(['ok', 'low'])),
  sites: Type.Array(Type.Object({ site: Type.String(), at: Point, plants: Type.Integer() })),
  zones: Type.Array(
    Type.Object({
      id: Type.Integer(),
      name: Type.String(),
      region: Type.String(),
      superRegion: Type.String(),
      label: Point,
      path: Type.String(),
    }),
  ),
})

export const Agent = Type.Object({
  id: Type.Integer(),
  name: Type.String(),
  role: Nullable(Type.String()),
  abilities: Type.Object({
    grenade: Nullable(Type.String()),
    ability1: Nullable(Type.String()),
    ability2: Nullable(Type.String()),
    ultimate: Nullable(Type.String()),
  }),
})

export const Weapon = Type.Object({
  id: Type.Integer(),
  name: Type.String(),
  category: Nullable(Type.String()),
  cost: Nullable(Type.Integer()),
  isArmor: Type.Boolean(),
})

export const SeriesDetail = Type.Object({
  id: Type.Integer(),
  number: Type.Integer(),
  stage: Type.Object({ id: Type.Integer(), name: Type.String(), tournament: Type.String() }),
  teamA: TeamRef,
  teamB: TeamRef,
  winner: Nullable(TeamRef),
  maps: Type.Array(
    Type.Object({
      matchId: Type.Integer(),
      game: Type.String(),
      map: Type.String(),
      scoreA: Type.Integer(),
      scoreB: Type.Integer(),
      winnerTeamId: Type.Integer(),
    }),
  ),
})

export type Tournament = Static<typeof Tournament>
export type StageStandings = Static<typeof StageStandings>
export type MapSummary = Static<typeof MapSummary>
export type MapDetail = Static<typeof MapDetail>
export type Agent = Static<typeof Agent>
export type Weapon = Static<typeof Weapon>
export type SeriesDetail = Static<typeof SeriesDetail>
