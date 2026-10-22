import { describe, expect, it } from 'vitest'

import { createUser, login, TEST_PASSWORD, useApp } from './helpers.js'

const PLAYER_ID = 1
const TEAM_ID = 1

describe('auth', () => {
  const app = useApp()

  it('faz login, devolve o perfil e grava os cookies httpOnly', async () => {
    await createUser(app(), {
      email: 'player@test.dev',
      role: 'player',
      playerId: PLAYER_ID,
      teamId: TEAM_ID,
    })
    const response = await app().inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'PLAYER@test.dev', password: TEST_PASSWORD },
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body).toMatchObject({
      email: 'player@test.dev',
      role: 'player',
      player: { id: PLAYER_ID },
      team: { id: TEAM_ID },
    })
    expect(body).not.toHaveProperty('passwordHash')
    const access = response.cookies.find((c) => c.name === 'access_token')
    expect(access).toMatchObject({ httpOnly: true, path: '/' })
    expect(response.cookies.find((c) => c.name === 'refresh_token')).toMatchObject({
      httpOnly: true,
      path: '/auth',
    })
  })

  it('recusa senha errada e e-mail desconhecido com a mesma mensagem', async () => {
    const wrong = await app().inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'player@test.dev', password: 'errada' },
    })
    const unknown = await app().inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'ninguem@test.dev', password: 'errada' },
    })
    expect(wrong.statusCode).toBe(401)
    expect(unknown.json()).toEqual(wrong.json())
  })

  it('valida o corpo do login', async () => {
    const response = await app().inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'nao-e-email' },
    })
    expect(response.statusCode).toBe(400)
    expect(response.json().error.code).toBe('VALIDATION')
  })

  it('exige login em /me', async () => {
    const anonymous = await app().inject({ method: 'GET', url: '/me' })
    expect(anonymous.statusCode).toBe(401)
    const session = await login(app(), 'player@test.dev')
    const response = await app().inject({
      method: 'GET',
      url: '/me',
      cookies: { access_token: session.access },
    })
    expect(response.statusCode).toBe(200)
    expect(response.json().role).toBe('player')
  })

  it('rotaciona o refresh token e recusa o antigo', async () => {
    const session = await login(app(), 'player@test.dev')
    const first = await app().inject({
      method: 'POST',
      url: '/auth/refresh',
      cookies: { refresh_token: session.refresh },
    })
    expect(first.statusCode).toBe(200)
    const reused = await app().inject({
      method: 'POST',
      url: '/auth/refresh',
      cookies: { refresh_token: session.refresh },
    })
    expect(reused.statusCode).toBe(401)
  })

  it('logout revoga o refresh token', async () => {
    const session = await login(app(), 'player@test.dev')
    const logout = await app().inject({
      method: 'POST',
      url: '/auth/logout',
      cookies: { refresh_token: session.refresh },
    })
    expect(logout.statusCode).toBe(204)
    const refresh = await app().inject({
      method: 'POST',
      url: '/auth/refresh',
      cookies: { refresh_token: session.refresh },
    })
    expect(refresh.statusCode).toBe(401)
  })
})
