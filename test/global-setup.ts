import { readFile } from 'node:fs/promises'

import pg from 'pg'

const testUrl = process.env.TEST_DATABASE_URL ?? 'postgresql://%2Fvar%2Frun%2Fpostgresql/vstats_api_test'

export async function setup(): Promise<void> {
  const url = new URL(testUrl)
  const database = url.pathname.slice(1)
  const admin = new pg.Client({
    connectionString: Object.assign(new URL(testUrl), { pathname: '/postgres' }).toString(),
  })
  await admin.connect()
  await admin.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`)
  await admin.query(`CREATE DATABASE "${database}"`)
  await admin.end()

  const client = new pg.Client({ connectionString: testUrl })
  await client.connect()
  await client.query(await readFile(new URL('./fixtures/analytics.sql', import.meta.url), 'utf8'))
  await client.end()
}
