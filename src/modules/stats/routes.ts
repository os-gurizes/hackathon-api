import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { Type } from 'typebox'

import { FiltersQuery } from '../../shared/filters.js'
import { AgentStat, AgentStatsQuery, agentStats } from './agents.js'
import { WeaponStat, weaponStats } from './weapons.js'

export const statsRoutes: FastifyPluginAsyncTypebox = async (app) => {
  const common = { tags: ['stats'], security: [{ cookieAuth: [] }] }

  app.get(
    '/weapons/stats',
    { schema: { ...common, querystring: FiltersQuery, response: { 200: Type.Array(WeaponStat) } } },
    async (request) => weaponStats(app.db, request.query),
  )

  app.get(
    '/agents/stats',
    { schema: { ...common, querystring: AgentStatsQuery, response: { 200: Type.Array(AgentStat) } } },
    async (request) => agentStats(app.db, request.query.map),
  )
}
