import jwt from '@fastify/jwt'
import type { FastifyReply, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'

import { forbidden, unauthorized } from '../shared/errors.js'
import { asUserId, type UserId } from '../shared/ids.js'

export type Role = 'player' | 'coach' | 'admin'

export type AuthUser = {
  id: UserId
  role: Role
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: number; role: Role }
    user: AuthUser
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    requireRole: (...roles: Role[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

export const ACCESS_COOKIE = 'access_token'
export const ACCESS_TTL_SECONDS = 15 * 60

export const authPlugin = fp(async (app) => {
  await app.register(jwt, {
    secret: app.config.JWT_SECRET,
    cookie: { cookieName: ACCESS_COOKIE, signed: false },
    sign: { expiresIn: ACCESS_TTL_SECONDS },
    formatUser: (payload) => ({ id: asUserId(payload.sub), role: payload.role }),
  })

  app.decorate('authenticate', async (request: FastifyRequest) => {
    try {
      await request.jwtVerify()
    } catch {
      throw unauthorized()
    }
  })

  app.decorate('requireRole', (...roles: Role[]) => async (request: FastifyRequest, reply: FastifyReply) => {
    await app.authenticate(request, reply)
    if (!roles.includes(request.user.role)) throw forbidden()
  })
})
