import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { Type } from 'typebox'

import { ErrorResponse, notFound } from '../../shared/errors.js'
import { IdParams } from '../../shared/ids.js'
import {
  playerAgents,
  playerExists,
  playerMatches,
  playerStats,
  playerWeapons,
  profile,
  ranking,
} from './repository.js'
import {
  PlayerAgent,
  PlayerMatchesPage,
  PlayerMatchesQuery,
  PlayerProfile,
  PlayersQuery,
  PlayerStats,
  PlayerStatsQuery,
  PlayerWeapon,
  RankingPage,
} from './schemas.js'

export const playerRoutes: FastifyPluginAsyncTypebox = async (app) => {
  const common = { tags: ['players'], security: [{ cookieAuth: [] }] }
  const byId = { ...common, params: IdParams }

  async function ensurePlayer(id: number): Promise<void> {
    if (!(await playerExists(app.db, id))) throw notFound('Jogador')
  }

  app.get(
    '/players',
    { schema: { ...common, querystring: PlayersQuery, response: { 200: RankingPage, 400: ErrorResponse } } },
    async (request) => ranking(app.db, request.query),
  )

  app.get(
    '/players/:id',
    { schema: { ...byId, response: { 200: PlayerProfile, 404: ErrorResponse } } },
    async (request) => {
      const found = await profile(app.db, request.params.id)
      if (!found) throw notFound('Jogador')
      return found
    },
  )

  app.get(
    '/players/:id/stats',
    {
      schema: { ...byId, querystring: PlayerStatsQuery, response: { 200: PlayerStats, 404: ErrorResponse } },
    },
    async (request) => {
      await ensurePlayer(request.params.id)
      return playerStats(app.db, request.params.id, request.query)
    },
  )

  app.get(
    '/players/:id/matches',
    {
      schema: {
        ...byId,
        querystring: PlayerMatchesQuery,
        response: { 200: PlayerMatchesPage, 404: ErrorResponse },
      },
    },
    async (request) => {
      await ensurePlayer(request.params.id)
      return playerMatches(app.db, request.params.id, request.query)
    },
  )

  app.get(
    '/players/:id/agents',
    {
      schema: {
        ...byId,
        querystring: PlayerStatsQuery,
        response: { 200: Type.Array(PlayerAgent), 404: ErrorResponse },
      },
    },
    async (request) => {
      await ensurePlayer(request.params.id)
      return playerAgents(app.db, request.params.id, request.query)
    },
  )

  app.get(
    '/players/:id/weapons',
    {
      schema: {
        ...byId,
        querystring: PlayerStatsQuery,
        response: { 200: Type.Array(PlayerWeapon), 404: ErrorResponse },
      },
    },
    async (request) => {
      await ensurePlayer(request.params.id)
      return playerWeapons(app.db, request.params.id, request.query)
    },
  )
}
