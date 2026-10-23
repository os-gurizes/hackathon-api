import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/app/schema.ts',
  out: './drizzle/app',
  schemaFilter: ['app'],
})
