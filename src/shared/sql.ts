import { sql, type SQL } from 'drizzle-orm'

import type { QueryResultRow } from 'pg'

import type { Database } from '../db/client.js'

export async function rows<T extends QueryResultRow>(db: Database, query: SQL): Promise<T[]> {
  const result = await db.execute<T>(query)
  return result.rows as T[]
}

export async function one<T extends QueryResultRow>(db: Database, query: SQL): Promise<T | undefined> {
  const [row] = await rows<T>(db, query)
  return row
}

export function where(conditions: Array<SQL | undefined>): SQL {
  const present = conditions.filter((c): c is SQL => c !== undefined)
  return present.length === 0 ? sql`TRUE` : sql.join(present, sql` AND `)
}
