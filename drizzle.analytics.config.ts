import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schemaFilter: ['analytics'],
  out: './src/db/analytics',
  dbCredentials: { url: process.env.DATABASE_URL ?? 'postgresql://%2Fvar%2Frun%2Fpostgresql/vstats' },
})
