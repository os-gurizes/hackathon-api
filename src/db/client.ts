import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import pg from 'pg'

import * as analyticsRelations from './analytics/relations.js'
import * as analytics from './analytics/schema.js'

export const schema = { ...analytics, ...analyticsRelations }

export type Database = NodePgDatabase<typeof schema>

export type DatabaseConnection = {
  db: Database
  close: () => Promise<void>
}

export function connectDatabase(url: string): DatabaseConnection {
  const pool = new pg.Pool({ connectionString: url, max: 10 })
  return { db: drizzle(pool, { schema }), close: () => pool.end() }
}
