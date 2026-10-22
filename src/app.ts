import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import Fastify, { type FastifyError, type FastifyInstance } from 'fastify'

import type { Config } from './config.js'
import type { Database } from './db/client.js'
import { adminRoutes } from './modules/admin/routes.js'
import { authRoutes } from './modules/auth/routes.js'
import { catalogRoutes } from './modules/catalog/routes.js'
import { healthRoutes } from './modules/health/routes.js'
import { matchRoutes } from './modules/matches/routes.js'
import { playerRoutes } from './modules/players/routes.js'
import { statsRoutes } from './modules/stats/routes.js'
import { teamRoutes } from './modules/teams/routes.js'
import { authPlugin } from './plugins/auth.js'
import { AppError, errorBody } from './shared/errors.js'

declare module 'fastify' {
  interface FastifyInstance {
    db: Database
    config: Config
  }
}

export type AppOptions = {
  config: Config
  db: Database
}

export type App = FastifyInstance

export async function buildApp({ config, db }: AppOptions): Promise<App> {
  const app = Fastify({
    logger:
      config.NODE_ENV === 'test' ? false : { level: config.NODE_ENV === 'production' ? 'info' : 'debug' },
    ajv: { customOptions: { removeAdditional: 'all', coerceTypes: true, useDefaults: true } },
  }).withTypeProvider<TypeBoxTypeProvider>()

  app.decorate('db', db)
  app.decorate('config', config)

  await app.register(cors, { origin: config.CORS_ORIGIN, credentials: true })
  await app.register(cookie, { secret: config.COOKIE_SECRET })
  await app.register(swagger, {
    openapi: {
      info: { title: 'Valorant Analytics API', version: '0.1.0' },
      components: { securitySchemes: { cookieAuth: { type: 'apiKey', in: 'cookie', name: 'access_token' } } },
    },
  })
  await app.register(swaggerUi, { routePrefix: '/docs' })

  app.setErrorHandler((error: FastifyError | AppError, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.status).send(errorBody(error.code, error.message))
    }
    if ('validation' in error && error.validation) {
      return reply.status(400).send(errorBody('VALIDATION', error.message))
    }
    if (typeof error.statusCode === 'number' && error.statusCode < 500) {
      return reply.status(error.statusCode).send(errorBody('VALIDATION', error.message))
    }
    request.log.error(error)
    return reply.status(500).send(errorBody('INTERNAL', 'Erro interno'))
  })

  app.setNotFoundHandler((request, reply) =>
    reply.status(404).send(errorBody('NOT_FOUND', `Rota não encontrada: ${request.method} ${request.url}`)),
  )

  await app.register(authPlugin)
  await app.register(healthRoutes)
  await app.register(authRoutes)
  await app.register(adminRoutes)
  await app.register(async (data) => {
    data.addHook('onRequest', app.authenticate)
    await data.register(catalogRoutes)
    await data.register(matchRoutes)
    await data.register(playerRoutes)
    await data.register(teamRoutes)
    await data.register(statsRoutes)
  })

  return app
}
