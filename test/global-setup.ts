import { readFile } from 'node:fs/promises'

import pg from 'pg'

import { connectDatabase } from '../src/db/client.js'
import { runMigrations } from '../src/db/migrate.js'

const testUrl = process.env.TEST_DATABASE_URL ?? 'postgresql://%2Fvar%2Frun%2Fpostgresql/vstats_api_test'

const SAFE_TEST_DATABASE = /(_test|_review_[a-z0-9]+)$/

export async function setup(): Promise<void> {
  const url = new URL(testUrl)
  const databaseName = url.pathname.slice(1)
  if (!SAFE_TEST_DATABASE.test(databaseName)) {
    throw new Error(
      `TEST_DATABASE_URL precisa apontar para um banco de teste (_test), recebido: ${databaseName}`,
    )
  }
  const admin = new pg.Client({
    connectionString: Object.assign(new URL(testUrl), { pathname: '/postgres' }).toString(),
  })
  await admin.connect()
  await admin.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`)
  await admin.query(`CREATE DATABASE "${databaseName}"`)
  await admin.end()

  const client = new pg.Client({ connectionString: testUrl })
  await client.connect()
  await client.query(await readFile(new URL('./fixtures/analytics.sql', import.meta.url), 'utf8'))
  await client.end()

  const database = connectDatabase(testUrl)
  await runMigrations(database.db)
  await database.close()
}
