import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { Type } from 'typebox'

import { ErrorResponse, notFound } from '../../shared/errors.js'
import { IdParams } from '../../shared/ids.js'
import {
  listAgents,
  listMaps,
  listTournaments,
  listWeapons,
  mapDetail,
  seriesDetail,
  standings,
  tournamentExists,
} from './repository.js'
import {
  Agent,
  MapDetail,
  MapSummary,
  SeriesDetail,
  StageStandings,
  StandingsQuery,
  Tournament,
  Weapon,
} from './schemas.js'

export const catalogRoutes: FastifyPluginAsyncTypebox = async (app) => {
  const common = { tags: ['catalog'], security: [{ cookieAuth: [] }] }

  app.get('/tournaments', { schema: { ...common, response: { 200: Type.Array(Tournament) } } }, async () =>
    listTournaments(app.db),
  )

  app.get(
    '/tournaments/:id/standings',
    {
      schema: {
        ...common,
        params: IdParams,
        querystring: StandingsQuery,
        response: { 200: Type.Array(StageStandings), 404: ErrorResponse },
      },
    },
    async (request) => {
      if (!(await tournamentExists(app.db, request.params.id))) throw notFound('Campeonato')
      return standings(app.db, request.params.id, request.query.stage)
    },
  )

  app.get(
    '/series/:id',
    { schema: { ...common, params: IdParams, response: { 200: SeriesDetail, 404: ErrorResponse } } },
    async (request) => {
      const found = await seriesDetail(app.db, request.params.id)
      if (!found) throw notFound('Série')
      return found
    },
  )

  app.get('/maps', { schema: { ...common, response: { 200: Type.Array(MapSummary) } } }, async () =>
    listMaps(app.db),
  )

  app.get(
    '/maps/:id',
    { schema: { ...common, params: IdParams, response: { 200: MapDetail, 404: ErrorResponse } } },
    async (request) => {
      const found = await mapDetail(app.db, request.params.id)
      if (!found) throw notFound('Mapa')
      return found
    },
  )

  app.get('/agents', { schema: { ...common, response: { 200: Type.Array(Agent) } } }, async () =>
    listAgents(app.db),
  )

  app.get('/weapons', { schema: { ...common, response: { 200: Type.Array(Weapon) } } }, async () =>
    listWeapons(app.db),
  )
}
