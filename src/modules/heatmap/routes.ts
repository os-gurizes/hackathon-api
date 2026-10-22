import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { sql } from 'drizzle-orm'

import { assert, canViewPlayerPrivate, canViewTeamAnalytics, loadViewer } from '../../plugins/access.js'
import { ErrorResponse, notFound } from '../../shared/errors.js'
import { IdParams } from '../../shared/ids.js'
import { one } from '../../shared/sql.js'
import { heatmap, mapStats } from './repository.js'
import { Heatmap, HeatmapQuery, MapStats, MapStatsQuery } from './schemas.js'

export const heatmapRoutes: FastifyPluginAsyncTypebox = async (app) => {
  const common = { tags: ['maps'], security: [{ cookieAuth: [] }], params: IdParams }

  async function ensureMap(id: number): Promise<void> {
    const found = await one(app.db, sql`SELECT 1 AS ok FROM analytics.maps WHERE id = ${id}`)
    if (!found) throw notFound('Mapa')
  }

  app.get(
    '/maps/:id/heatmap',
    {
      schema: {
        ...common,
        querystring: HeatmapQuery,
        response: { 200: Heatmap, 403: ErrorResponse, 404: ErrorResponse },
      },
    },
    async (request) => {
      await ensureMap(request.params.id)
      const viewer = await loadViewer(app.db, request.user)
      if (request.query.player !== undefined) {
        await assert(canViewPlayerPrivate(app.db, viewer, request.query.player))
      }
      if (request.query.team !== undefined) {
        await assert(canViewTeamAnalytics(app.db, viewer, request.query.team))
      }
      return heatmap(app.db, request.params.id, request.query)
    },
  )

  app.get(
    '/maps/:id/stats',
    { schema: { ...common, querystring: MapStatsQuery, response: { 200: MapStats, 404: ErrorResponse } } },
    async (request) => {
      await ensureMap(request.params.id)
      return mapStats(app.db, request.params.id, request.query)
    },
  )
}
