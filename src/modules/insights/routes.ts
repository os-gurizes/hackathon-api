import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { Type } from 'typebox'

import { assert, canViewPlayerPrivate, canViewTeamAnalytics, loadViewer } from '../../plugins/access.js'
import { ErrorResponse } from '../../shared/errors.js'
import { listInsights } from './repository.js'
import { Insight, InsightsQuery } from './schemas.js'

export const insightRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.get(
    '/insights',
    {
      schema: {
        tags: ['insights'],
        security: [{ cookieAuth: [] }],
        querystring: InsightsQuery,
        response: { 200: Type.Array(Insight), 403: ErrorResponse },
      },
    },
    async (request) => {
      const viewer = await loadViewer(app.db, request.user)
      const { scope, id } = request.query
      await assert(
        scope === 'player'
          ? canViewPlayerPrivate(app.db, viewer, id)
          : canViewTeamAnalytics(app.db, viewer, id),
      )
      return listInsights(app.db, request.query)
    },
  )
}
