import { describe, expect, it } from 'vitest'

import { loadConfig } from '../src/config.js'
import { ParseError } from '../src/shared/parse.js'

const base = { DATABASE_URL: 'postgresql:///x', JWT_SECRET: 'a'.repeat(16), COOKIE_SECRET: 'b'.repeat(16) }

describe('loadConfig', () => {
  it('converte tipos e aplica padrões', () => {
    const config = loadConfig({ ...base, PORT: '8080' })
    expect(config.PORT).toBe(8080)
    expect(config.HOST).toBe('0.0.0.0')
    expect(config.NODE_ENV).toBe('development')
  })

  it('rejeita segredo curto', () => {
    expect(() => loadConfig({ ...base, JWT_SECRET: 'curto' })).toThrow(ParseError)
  })
})
