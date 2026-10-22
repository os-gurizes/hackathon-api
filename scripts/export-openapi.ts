import { writeFile } from 'node:fs/promises'

import { buildApp } from '../src/app.js'
import { loadConfig } from '../src/config.js'
import { connectDatabase } from '../src/db/client.js'

const config = loadConfig({
  ...process.env,
  NODE_ENV: 'test',
  DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://localhost/unused',
  JWT_SECRET: process.env.JWT_SECRET ?? 'openapi-export-secret',
  COOKIE_SECRET: process.env.COOKIE_SECRET ?? 'openapi-export-secret',
})
const database = connectDatabase(config.DATABASE_URL)
const app = await buildApp({ config, db: database.db })
await app.ready()
await writeFile('openapi.json', `${JSON.stringify(app.swagger(), null, 2)}\n`)
await app.close()
await database.close()
