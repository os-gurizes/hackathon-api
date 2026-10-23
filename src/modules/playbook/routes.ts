import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import type { FastifyRequest } from 'fastify'
import { Type } from 'typebox'

import { assert, canEditTeam, loadViewer, playbookAccess } from '../../plugins/access.js'
import { ErrorResponse, forbidden, notFound } from '../../shared/errors.js'
import { IdParams } from '../../shared/ids.js'
import { teamExists } from '../teams/repository.js'
import { MAX_BODY_BYTES, PlaybookQuery, PlaybookStrategy, PlaybookSummary, StrategyInput } from './schemas.js'
import {
  createStrategy,
  deleteStrategy,
  findStrategy,
  listPlaybook,
  updateStrategy,
  visibleStrategy,
} from './service.js'

export const playbookRoutes: FastifyPluginAsyncTypebox = async (app) => {
  const common = { tags: ['playbook'], security: [{ cookieAuth: [] }], params: IdParams }
  const errors = { 400: ErrorResponse, 403: ErrorResponse, 404: ErrorResponse }

  async function viewerFor(request: FastifyRequest) {
    return loadViewer(app.db, request.user)
  }

  async function ensureTeam(id: number): Promise<void> {
    if (!(await teamExists(app.db, id))) throw notFound('Time')
  }

  async function editable(request: FastifyRequest, strategyId: number) {
    const row = await findStrategy(app.db, strategyId)
    if (!row) throw notFound('Estratégia')
    const viewer = await viewerFor(request)
    if (!canEditTeam(viewer, row.teamId)) {
      throw (await playbookAccess(app.db, viewer, row.teamId)) === 'none'
        ? notFound('Estratégia')
        : forbidden()
    }
    return row
  }

  app.get(
    '/teams/:id/playbook',
    {
      schema: {
        ...common,
        querystring: PlaybookQuery,
        response: { 200: Type.Array(PlaybookSummary), ...errors },
      },
    },
    async (request) => {
      await ensureTeam(request.params.id)
      const access = await playbookAccess(app.db, await viewerFor(request), request.params.id)
      if (access === 'none') throw forbidden()
      return listPlaybook(app.db, request.params.id, access, request.query)
    },
  )

  app.post(
    '/teams/:id/playbook',
    {
      bodyLimit: MAX_BODY_BYTES,
      schema: { ...common, body: StrategyInput, response: { 201: PlaybookStrategy, ...errors } },
    },
    async (request, reply) => {
      await ensureTeam(request.params.id)
      await assert(canEditTeam(await viewerFor(request), request.params.id))
      return reply
        .status(201)
        .send(await createStrategy(app.db, request.params.id, request.user.id, request.body))
    },
  )

  app.get(
    '/playbook/:id',
    { schema: { ...common, response: { 200: PlaybookStrategy, ...errors } } },
    async (request) => {
      const row = await findStrategy(app.db, request.params.id)
      if (!row) throw notFound('Estratégia')
      return visibleStrategy(row, await playbookAccess(app.db, await viewerFor(request), row.teamId))
    },
  )

  app.put(
    '/playbook/:id',
    {
      bodyLimit: MAX_BODY_BYTES,
      schema: { ...common, body: StrategyInput, response: { 200: PlaybookStrategy, ...errors } },
    },
    async (request) => {
      await editable(request, request.params.id)
      return updateStrategy(app.db, request.params.id, request.body)
    },
  )

  app.delete(
    '/playbook/:id',
    { schema: { ...common, response: { 204: Type.Null(), ...errors } } },
    async (request, reply) => {
      await editable(request, request.params.id)
      await deleteStrategy(app.db, request.params.id)
      return reply.status(204).send(null)
    },
  )
}
