import { buildApp } from './app.js'
import { loadConfig } from './config.js'
import { connectDatabase } from './db/client.js'

const config = loadConfig()
const database = connectDatabase(config.DATABASE_URL)
const app = await buildApp({ config, db: database.db })

const shutdown = async () => {
  await app.close()
  await database.close()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

await app.listen({ host: config.HOST, port: config.PORT })
