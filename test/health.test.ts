import { describe, expect, it } from 'vitest'

import { useApp } from './helpers.js'

describe('GET /health', () => {
  const app = useApp()

  it('responde ok com a versão do pipeline', async () => {
    const response = await app().inject({ method: 'GET', url: '/health' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({ status: 'ok', pipelineVersion: '0.1.0' })
  })

  it('responde 404 no formato de erro padrão', async () => {
    const response = await app().inject({ method: 'GET', url: '/nao-existe' })
    expect(response.statusCode).toBe(404)
    expect(response.json()).toEqual({
      error: { code: 'NOT_FOUND', message: 'Rota não encontrada: GET /nao-existe' },
    })
  })
})

describe('GET /docs/json', () => {
  const app = useApp()

  it('publica o OpenAPI', async () => {
    const response = await app().inject({ method: 'GET', url: '/docs/json' })
    expect(response.statusCode).toBe(200)
    expect(response.json().paths).toHaveProperty('/health')
  })
})
