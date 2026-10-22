import { beforeAll, describe, expect, it } from 'vitest'

import { useApp, viewerToken } from './helpers.js'

describe('cache HTTP', () => {
  const app = useApp()
  let token = ''

  beforeAll(async () => {
    token = await viewerToken(app())
  })

  it('responde 304 quando o ETag não mudou', async () => {
    const first = await app().inject({ method: 'GET', url: '/maps/1', cookies: { access_token: token } })
    expect(first.headers['cache-control']).toBe('private, no-cache')
    const tag = first.headers.etag
    expect(tag).toBeDefined()
    const second = await app().inject({
      method: 'GET',
      url: '/maps/1',
      cookies: { access_token: token },
      headers: { 'if-none-match': String(tag) },
    })
    expect(second.statusCode).toBe(304)
    expect(second.body).toBe('')
  })
})
