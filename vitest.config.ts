import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globalSetup: ['./test/global-setup.ts'],
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgresql://%2Fvar%2Frun%2Fpostgresql/vstats_api_test',
      JWT_SECRET: 'test-secret-with-enough-length',
      COOKIE_SECRET: 'test-cookie-secret-long-enough',
    },
  },
})
