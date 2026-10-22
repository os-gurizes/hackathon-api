import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import argon2 from 'argon2'
import type { FastifyReply } from 'fastify'
import { Type } from 'typebox'

import { ACCESS_COOKIE, type Role } from '../../plugins/auth.js'
import { AppError, ErrorResponse, unauthorized } from '../../shared/errors.js'
import type { UserId } from '../../shared/ids.js'
import {
  consumeRefreshToken,
  findMe,
  findUserByEmail,
  revokeRefreshToken,
  saveRefreshToken,
} from './repository.js'
import { LoginBody, Me } from './schemas.js'
import {
  REFRESH_COOKIE,
  REFRESH_TTL_SECONDS,
  accessCookie,
  hashToken,
  newRefreshToken,
  refreshCookie,
} from './tokens.js'

export const authRoutes: FastifyPluginAsyncTypebox = async (app) => {
  const dummyHash = await argon2.hash('senha-que-nao-existe')

  async function issueSession(reply: FastifyReply, userId: UserId, role: Role): Promise<void> {
    const access = await reply.jwtSign({ sub: userId, role })
    const refresh = newRefreshToken()
    await saveRefreshToken(
      app.db,
      userId,
      hashToken(refresh),
      new Date(Date.now() + REFRESH_TTL_SECONDS * 1000),
    )
    reply.setCookie(ACCESS_COOKIE, access, accessCookie(app.config))
    reply.setCookie(REFRESH_COOKIE, refresh, refreshCookie(app.config))
  }

  async function me(userId: UserId) {
    const found = await findMe(app.db, userId)
    if (!found) throw unauthorized()
    return found
  }

  app.post(
    '/auth/login',
    { schema: { tags: ['auth'], body: LoginBody, response: { 200: Me, 401: ErrorResponse } } },
    async (request, reply) => {
      const user = await findUserByEmail(app.db, request.body.email)
      const valid = await argon2.verify(user?.passwordHash ?? dummyHash, request.body.password)
      if (!user || !valid) throw new AppError('UNAUTHORIZED', 'E-mail ou senha inválidos')
      await issueSession(reply, user.id, user.role)
      return me(user.id)
    },
  )

  app.post(
    '/auth/refresh',
    { schema: { tags: ['auth'], response: { 200: Me, 401: ErrorResponse } } },
    async (request, reply) => {
      const token = request.cookies[REFRESH_COOKIE]
      const session = token ? await consumeRefreshToken(app.db, hashToken(token)) : undefined
      if (!session) throw unauthorized()
      await issueSession(reply, session.userId, session.role)
      return me(session.userId)
    },
  )

  app.post(
    '/auth/logout',
    { schema: { tags: ['auth'], response: { 204: Type.Null() } } },
    async (request, reply) => {
      const token = request.cookies[REFRESH_COOKIE]
      if (token) await revokeRefreshToken(app.db, hashToken(token))
      reply.clearCookie(ACCESS_COOKIE, { path: '/' })
      reply.clearCookie(REFRESH_COOKIE, { path: '/auth' })
      return reply.status(204).send(null)
    },
  )

  app.get(
    '/me',
    {
      onRequest: [app.authenticate],
      schema: { tags: ['auth'], security: [{ cookieAuth: [] }], response: { 200: Me, 401: ErrorResponse } },
    },
    async (request) => me(request.user.id),
  )
}
