import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { Type } from 'typebox'

import { ErrorResponse, notFound } from '../../shared/errors.js'
import { IdParams } from '../../shared/ids.js'
import { listMatches, matchDetail, matchRounds, roundReplay } from './repository.js'
import { MatchDetail, MatchesPage, MatchesQuery, Replay, RoundParams, RoundSummary } from './schemas.js'

export const matchRoutes: FastifyPluginAsyncTypebox = async (app) => {
  const common = { tags: ['matches'], security: [{ cookieAuth: [] }] }

  app.get(
    '/matches',
    { schema: { ...common, querystring: MatchesQuery, response: { 200: MatchesPage, 400: ErrorResponse } } },
    async (request) => listMatches(app.db, request.query),
  )

  app.get(
    '/matches/:id',
    { schema: { ...common, params: IdParams, response: { 200: MatchDetail, 404: ErrorResponse } } },
    async (request) => {
      const found = await matchDetail(app.db, request.params.id)
      if (!found) throw notFound('Partida')
      return found
    },
  )

  app.get(
    '/matches/:id/rounds',
    {
      schema: {
        ...common,
        params: IdParams,
        response: { 200: Type.Array(RoundSummary), 404: ErrorResponse },
      },
    },
    async (request) => {
      const found = await matchRounds(app.db, request.params.id)
      if (!found) throw notFound('Partida')
      return found
    },
  )

  app.get(
    '/matches/:id/rounds/:n/replay',
    { schema: { ...common, params: RoundParams, response: { 200: Replay, 404: ErrorResponse } } },
    async (request) => {
      const found = await roundReplay(app.db, request.params.id, request.params.n)
      if (!found) throw notFound('Round')
      return found
    },
  )
}
