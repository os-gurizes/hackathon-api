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
