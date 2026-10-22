import { Type, type Static } from 'typebox'

import { parseWith } from './shared/parse.js'

const ConfigSchema = Type.Object({
  DATABASE_URL: Type.String({ minLength: 1 }),
  HOST: Type.String({ default: '0.0.0.0' }),
  PORT: Type.Integer({ minimum: 1, maximum: 65535, default: 3333 }),
  JWT_SECRET: Type.String({ minLength: 16 }),
  COOKIE_SECRET: Type.String({ minLength: 16 }),
  CORS_ORIGIN: Type.String({ default: 'http://localhost:5173' }),
  NODE_ENV: Type.Union([Type.Literal('development'), Type.Literal('test'), Type.Literal('production')], {
    default: 'development',
  }),
})

export type Config = Static<typeof ConfigSchema>

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const defined = Object.fromEntries(
    Object.entries(env).filter(([, value]) => value !== undefined && value !== ''),
  )
  return parseWith(ConfigSchema, defined)
}
