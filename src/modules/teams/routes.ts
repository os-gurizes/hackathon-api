import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { Type } from 'typebox'

import { ErrorResponse, notFound } from '../../shared/errors.js'
import { IdParams } from '../../shared/ids.js'
import { listTeams, teamProfile } from './repository.js'
import { TeamProfile, TeamsQuery, TeamSummary } from './schemas.js'

export const teamRoutes: FastifyPluginAsyncTypebox = async (app) => {
  const common = { tags: ['teams'], security: [{ cookieAuth: [] }] }

  app.get(
    '/teams',
    { schema: { ...common, querystring: TeamsQuery, response: { 200: Type.Array(TeamSummary) } } },
    async (request) => listTeams(app.db, request.query),
  )

  app.get(
    '/teams/:id',
    { schema: { ...common, params: IdParams, response: { 200: TeamProfile, 404: ErrorResponse } } },
    async (request) => {
      const found = await teamProfile(app.db, request.params.id)
      if (!found) throw notFound('Time')
      return found
    },
  )
}
