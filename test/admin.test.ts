import { describe, expect, it } from 'vitest'

import { createUser, login, useApp } from './helpers.js'

describe('admin', () => {
  const app = useApp()

  async function as(email: string, role: 'player' | 'coach' | 'admin') {
    await createUser(app(), { email, role, playerId: 1, teamId: 1 })
    return (await login(app(), email)).access
  }

  it('bloqueia quem não é admin', async () => {
    const token = await as('coach@admin.test', 'coach')
    const response = await app().inject({
      method: 'GET',
      url: '/admin/users',
      cookies: { access_token: token },
    })
    expect(response.statusCode).toBe(403)
    expect(response.json().error.code).toBe('FORBIDDEN')
  })

  it('cria, lista e atualiza usuários', async () => {
    const token = await as('admin@admin.test', 'admin')
    const created = await app().inject({
      method: 'POST',
      url: '/admin/users',
      cookies: { access_token: token },
      payload: { email: 'Novo.Coach@admin.test', password: 'senha-longa-1', role: 'coach', teamId: 1 },
    })
    expect(created.statusCode).toBe(201)
    const user = created.json()
    expect(user).toMatchObject({ email: 'novo.coach@admin.test', role: 'coach', teamId: 1, playerId: null })
    expect(user).not.toHaveProperty('passwordHash')

    const updated = await app().inject({
      method: 'PATCH',
      url: `/admin/users/${user.id}`,
      cookies: { access_token: token },
      payload: { teamId: 2 },
    })
    expect(updated.json().teamId).toBe(2)

    const list = await app().inject({ method: 'GET', url: '/admin/users', cookies: { access_token: token } })
    expect(list.json().map((u: { email: string }) => u.email)).toContain('novo.coach@admin.test')
  })

  it('valida vínculos e duplicidade', async () => {
    const token = await as('admin2@admin.test', 'admin')
    const post = (payload: object) =>
      app().inject({ method: 'POST', url: '/admin/users', cookies: { access_token: token }, payload })
    expect((await post({ email: 'c@admin.test', password: 'senha-longa-1', role: 'coach' })).statusCode).toBe(
      400,
    )
    expect(
      (await post({ email: 'p@admin.test', password: 'senha-longa-1', role: 'player', playerId: 99999 }))
        .statusCode,
    ).toBe(404)
    expect(
      (await post({ email: 'admin2@admin.test', password: 'senha-longa-1', role: 'admin' })).statusCode,
    ).toBe(409)
    expect((await post({ email: 'x@admin.test', password: 'curta', role: 'admin' })).statusCode).toBe(400)
  })
})
