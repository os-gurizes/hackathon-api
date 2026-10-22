import { sql } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'

import { createUser, login, useApp } from './helpers.js'

describe('segurança da sessão', () => {
  const app = useApp()
  const refresh = (token: string) =>
    app().inject({ method: 'POST', url: '/auth/refresh', cookies: { refresh_token: token } })

  it('o papel vem do banco: rebaixar um admin corta o acesso na hora', async () => {
    await createUser(app(), { email: 'demote@sec.test', role: 'admin' })
    const session = await login(app(), 'demote@sec.test')
    const cookies = { access_token: session.access }
    expect((await app().inject({ method: 'GET', url: '/admin/users', cookies })).statusCode).toBe(200)
    await app().db.execute(sql`UPDATE app.users SET role = 'player' WHERE email = 'demote@sec.test'`)
    expect((await app().inject({ method: 'GET', url: '/admin/users', cookies })).statusCode).toBe(403)
  })

  it('usuário apagado perde o acesso mesmo com token válido', async () => {
    await createUser(app(), { email: 'gone@sec.test', role: 'admin' })
    const session = await login(app(), 'gone@sec.test')
    await app().db.execute(sql`DELETE FROM app.users WHERE email = 'gone@sec.test'`)
    const me = await app().inject({ method: 'GET', url: '/me', cookies: { access_token: session.access } })
    expect(me.statusCode).toBe(401)
  })

  it('trocar a senha pelo admin derruba as sessões do usuário', async () => {
    await createUser(app(), { email: 'admin@sec.test', role: 'admin' })
    await createUser(app(), { email: 'victim@sec.test', role: 'admin' })
    const admin = await login(app(), 'admin@sec.test')
    const victim = await login(app(), 'victim@sec.test')
    const list = await app().inject({
      method: 'GET',
      url: '/admin/users',
      cookies: { access_token: admin.access },
    })
    const target = list.json().find((u: { email: string }) => u.email === 'victim@sec.test')
    await app().inject({
      method: 'PATCH',
      url: `/admin/users/${target.id}`,
      cookies: { access_token: admin.access },
      payload: { password: 'nova-senha-longa' },
    })
    expect((await refresh(victim.refresh)).statusCode).toBe(401)
  })

  it('reuso de refresh token antigo revoga a sessão inteira', async () => {
    await createUser(app(), { email: 'reuse@sec.test', role: 'player', playerId: 1, teamId: 1 })
    const stolen = await login(app(), 'reuse@sec.test')
    const attacker = await refresh(stolen.refresh)
    const successor = attacker.cookies.find((c) => c.name === 'refresh_token')?.value ?? ''
    await app().db.execute(sql`UPDATE app.refresh_tokens SET revoked_at = now() - interval '1 minute'
                               WHERE revoked_at IS NOT NULL AND user_id = (SELECT id FROM app.users WHERE email = 'reuse@sec.test')`)
    expect((await refresh(stolen.refresh)).statusCode).toBe(401)
    expect((await refresh(successor)).statusCode).toBe(401)
  })

  it('duas abas renovando ao mesmo tempo não derrubam a sessão', async () => {
    await createUser(app(), { email: 'tabs@sec.test', role: 'player', playerId: 1, teamId: 1 })
    const session = await login(app(), 'tabs@sec.test')
    const [first, second] = await Promise.all([refresh(session.refresh), refresh(session.refresh)])
    const winner = [first, second].find((r) => r.statusCode === 200)
    expect(winner).toBeDefined()
    const next = winner?.cookies.find((c) => c.name === 'refresh_token')?.value ?? ''
    expect((await refresh(next)).statusCode).toBe(200)
  })

  it('PATCH sem nada para atualizar é rejeitado', async () => {
    await createUser(app(), { email: 'patch@sec.test', role: 'admin' })
    const admin = await login(app(), 'patch@sec.test')
    const response = await app().inject({
      method: 'PATCH',
      url: '/admin/users/1',
      cookies: { access_token: admin.access },
      payload: { bogus: 1 },
    })
    expect(response.statusCode).toBe(400)
  })
})
