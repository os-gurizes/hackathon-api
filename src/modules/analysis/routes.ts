import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import type { FastifyRequest } from 'fastify'
import { Type } from 'typebox'

import { assert, canViewPlayerPrivate, canViewTeamAnalytics, loadViewer } from '../../plugins/access.js'
import { ErrorResponse, notFound } from '../../shared/errors.js'
import { IdParams } from '../../shared/ids.js'
import { playerExists } from '../players/repository.js'
import { teamExists } from '../teams/repository.js'
import {
  playerAbilities,
  playerPatterns,
  pressure,
  teamCombos,
  teamEconomy,
  teamRotations,
  teamStrategies,
} from './repository.js'
import {
  AnalysisQuery,
  Combos,
  PlayerAbilities,
  PlayerPattern,
  PressureLine,
  Rotations,
  StrategyUsage,
  TeamEconomy,
} from './schemas.js'

export const analysisRoutes: FastifyPluginAsyncTypebox = async (app) => {
  const errors = { 403: ErrorResponse, 404: ErrorResponse }
  const team = {
    tags: ['team analysis'],
    security: [{ cookieAuth: [] }],
    params: IdParams,
    querystring: AnalysisQuery,
  }
  const player = { ...team, tags: ['player analysis'] }

  async function allowTeam(request: FastifyRequest, id: number): Promise<void> {
    if (!(await teamExists(app.db, id))) throw notFound('Time')
    const viewer = await loadViewer(app.db, request.user)
    await assert(canViewTeamAnalytics(app.db, viewer, id))
  }

  async function allowPlayer(request: FastifyRequest, id: number): Promise<void> {
    if (!(await playerExists(app.db, id))) throw notFound('Jogador')
    const viewer = await loadViewer(app.db, request.user)
    await assert(canViewPlayerPrivate(app.db, viewer, id))
  }

  app.get(
    '/teams/:id/economy',
    { schema: { ...team, response: { 200: TeamEconomy, ...errors } } },
    async (request) => {
      await allowTeam(request, request.params.id)
      return teamEconomy(app.db, request.params.id, request.query)
    },
  )

  app.get(
    '/teams/:id/strategies',
    { schema: { ...team, response: { 200: Type.Array(StrategyUsage), ...errors } } },
    async (request) => {
      await allowTeam(request, request.params.id)
      return teamStrategies(app.db, request.params.id, request.query)
    },
  )

  app.get(
    '/teams/:id/rotations',
    { schema: { ...team, response: { 200: Rotations, ...errors } } },
    async (request) => {
      await allowTeam(request, request.params.id)
      return teamRotations(app.db, request.params.id, request.query)
    },
  )

  app.get(
    '/teams/:id/combos',
    { schema: { ...team, response: { 200: Combos, ...errors } } },
    async (request) => {
      await allowTeam(request, request.params.id)
      return teamCombos(app.db, request.params.id, request.query)
    },
  )

  app.get(
    '/teams/:id/pressure',
    { schema: { ...team, response: { 200: Type.Array(PressureLine), ...errors } } },
    async (request) => {
      await allowTeam(request, request.params.id)
      return pressure(app.db, { column: 'team_id', id: request.params.id }, request.query)
    },
  )

  app.get(
    '/players/:id/patterns',
    { schema: { ...player, response: { 200: Type.Array(PlayerPattern), ...errors } } },
    async (request) => {
      await allowPlayer(request, request.params.id)
      return playerPatterns(app.db, request.params.id, request.query)
    },
  )

  app.get(
    '/players/:id/pressure',
    { schema: { ...player, response: { 200: Type.Array(PressureLine), ...errors } } },
    async (request) => {
      await allowPlayer(request, request.params.id)
      return pressure(app.db, { column: 'player_id', id: request.params.id }, request.query)
    },
  )

  app.get(
    '/players/:id/abilities',
    { schema: { ...player, response: { 200: PlayerAbilities, ...errors } } },
    async (request) => {
      await allowPlayer(request, request.params.id)
      return playerAbilities(app.db, request.params.id, request.query)
    },
  )
}
