import { loadConfig } from '../src/config.js'
import { connectDatabase } from '../src/db/client.js'
import { runMigrations } from '../src/db/migrate.js'

const config = loadConfig()
const database = connectDatabase(config.DATABASE_URL)
await runMigrations(database.db)
await database.close()
