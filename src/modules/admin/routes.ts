import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { Type } from 'typebox'

import { ErrorResponse } from '../../shared/errors.js'
import { IdParams } from '../../shared/ids.js'
import { CreateUserBody, UpdateUserBody, UserView } from './schemas.js'
import { createUser, listUsers, updateUser } from './service.js'

export const adminRoutes: FastifyPluginAsyncTypebox = async (app) => {
  const guard = { onRequest: [app.requireRole('admin')] }
  const common = { tags: ['admin'], security: [{ cookieAuth: [] }] }

  app.get(
    '/admin/users',
    { ...guard, schema: { ...common, response: { 200: Type.Array(UserView), 403: ErrorResponse } } },
    async () => listUsers(app.db),
  )

  app.post(
    '/admin/users',
    {
      ...guard,
      schema: { ...common, body: CreateUserBody, response: { 201: UserView, 409: ErrorResponse } },
    },
    async (request, reply) => reply.status(201).send(await createUser(app.db, request.body)),
  )

  app.patch(
    '/admin/users/:id',
    {
      ...guard,
      schema: {
        ...common,
        params: IdParams,
        body: UpdateUserBody,
        response: { 200: UserView, 404: ErrorResponse },
      },
    },
    async (request) => updateUser(app.db, request.params.id, request.body),
  )
}
