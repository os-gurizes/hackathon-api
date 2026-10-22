import { afterAll, beforeAll } from 'vitest'

import { buildApp, type App } from '../src/app.js'
import { loadConfig } from '../src/config.js'
import { connectDatabase } from '../src/db/client.js'

export function useApp(): () => App {
  let app: App | undefined
  let close: (() => Promise<void>) | undefined

  beforeAll(async () => {
    const config = loadConfig()
    const database = connectDatabase(config.DATABASE_URL)
    close = database.close
    app = await buildApp({ config, db: database.db })
    await app.ready()
  })

  afterAll(async () => {
    await app?.close()
    await close?.()
  })

  return () => {
    if (!app) throw new Error('app ainda não iniciado')
    return app
  }
}

export type Session = { access: string; refresh: string }

export async function createUser(
  app: App,
  user: { email: string; role: 'player' | 'coach' | 'admin'; playerId?: number; teamId?: number },
): Promise<void> {
  const { users } = await import('../src/db/app/schema.js')
  const argon2 = (await import('argon2')).default
  await app.db
    .insert(users)
    .values({
      email: user.email.toLowerCase(),
      role: user.role,
      playerId: user.playerId ?? null,
      teamId: user.teamId ?? null,
      passwordHash: await argon2.hash(TEST_PASSWORD),
    })
    .onConflictDoNothing()
}

export const TEST_PASSWORD = 'senha-de-teste-123'

export async function login(app: App, email: string): Promise<Session> {
  const response = await app.inject({
    method: 'POST',
    url: '/auth/login',
    payload: { email, password: TEST_PASSWORD },
  })
  if (response.statusCode !== 200) throw new Error(`login falhou: ${response.body}`)
  const cookie = (name: string) => response.cookies.find((c) => c.name === name)?.value ?? ''
  return { access: cookie('access_token'), refresh: cookie('refresh_token') }
}

export async function viewerToken(app: App): Promise<string> {
  await createUser(app, { email: 'viewer@test.dev', role: 'admin' })
  return (await login(app, 'viewer@test.dev')).access
}
