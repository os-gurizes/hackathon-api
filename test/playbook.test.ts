import { beforeAll, describe, expect, it } from 'vitest'

import { createUser, login, useApp } from './helpers.js'

const GOLDEN = 3
const OTHER_TEAM = 1
const TAEK = 10
const ASCENT = 1
const ATTACK_CLUSTER = 100

const arrow = (id: string) => ({
  id,
  kind: 'arrow',
  from: { x: 0.2, y: 0.3 },
  to: { x: 0.5, y: 0.6 },
  color: '#FF4655',
})

const strategy = (overrides: Record<string, unknown> = {}) => ({
  mapId: ASCENT,
  side: 'attack',
  title: 'Execução B rápida',
  notes: 'Smoke em Principal B e entrada em 2',
  linkedClusterId: ATTACK_CLUSTER,
  sharedWithPlayers: false,
  layers: [
    {
      id: 'setup',
      name: 'Setup',
      phase: 'setup',
      shapes: [
        arrow('a1'),
        { id: 'm1', kind: 'marker', at: { x: 0.4, y: 0.4 }, agentId: null, label: 'Entry' },
        { id: 't1', kind: 'text', at: { x: 0.1, y: 0.1 }, text: 'Esperar a smoke' },
        {
          id: 'p1',
          kind: 'path',
          points: [
            { x: 0.1, y: 0.1 },
            { x: 0.2, y: 0.2 },
          ],
          color: '#3CC8C8',
          width: 3,
        },
        {
          id: 'z1',
          kind: 'area',
          points: [
            { x: 0.1, y: 0.1 },
            { x: 0.2, y: 0.1 },
            { x: 0.2, y: 0.2 },
          ],
          color: '#ECE8E1',
          opacity: 0.3,
        },
      ],
    },
  ],
  ...overrides,
})

describe('playbook', () => {
  const app = useApp()
  const tokens = { coach: '', otherCoach: '', player: '' }
  const call = (method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, token: string, payload?: object) =>
    app().inject({ method, url, cookies: { access_token: token }, ...(payload ? { payload } : {}) })

  beforeAll(async () => {
    await createUser(app(), { email: 'coach@playbook.test', role: 'coach', teamId: GOLDEN })
    await createUser(app(), { email: 'other@playbook.test', role: 'coach', teamId: OTHER_TEAM })
    await createUser(app(), { email: 'taek@playbook.test', role: 'player', playerId: TAEK, teamId: GOLDEN })
    tokens.coach = (await login(app(), 'coach@playbook.test')).access
    tokens.otherCoach = (await login(app(), 'other@playbook.test')).access
    tokens.player = (await login(app(), 'taek@playbook.test')).access
  })

  it('coach cria, lê, atualiza e apaga estratégias do próprio time', async () => {
    const created = await call('POST', `/teams/${GOLDEN}/playbook`, tokens.coach, strategy())
    expect(created.statusCode).toBe(201)
    const { id } = created.json()
    const read = (await call('GET', `/playbook/${id}`, tokens.coach)).json()
    expect(read.layers[0].shapes).toHaveLength(5)
    expect(read.layers[0].visible).toBe(true)

    const updated = await call(
      'PUT',
      `/playbook/${id}`,
      tokens.coach,
      strategy({ title: 'Execução B lenta' }),
    )
    expect(updated.json().title).toBe('Execução B lenta')

    const list = (await call('GET', `/teams/${GOLDEN}/playbook?map=${ASCENT}`, tokens.coach)).json()
    expect(list.find((s: { id: number }) => s.id === id)).toMatchObject({ shapes: 5, layers: 1 })

    expect((await call('DELETE', `/playbook/${id}`, tokens.coach)).statusCode).toBe(204)
    expect((await call('GET', `/playbook/${id}`, tokens.coach)).statusCode).toBe(404)
  })

  it('players do time veem só o que foi compartilhado e não editam', async () => {
    const hidden = (await call('POST', `/teams/${GOLDEN}/playbook`, tokens.coach, strategy())).json()
    const shared = (
      await call('POST', `/teams/${GOLDEN}/playbook`, tokens.coach, strategy({ sharedWithPlayers: true }))
    ).json()
    const list = (await call('GET', `/teams/${GOLDEN}/playbook`, tokens.player)).json()
    const ids = list.map((s: { id: number }) => s.id)
    expect(ids).toContain(shared.id)
    expect(ids).not.toContain(hidden.id)
    expect((await call('GET', `/playbook/${hidden.id}`, tokens.player)).statusCode).toBe(404)
    expect((await call('GET', `/playbook/${shared.id}`, tokens.player)).statusCode).toBe(200)
    expect((await call('PUT', `/playbook/${shared.id}`, tokens.player, strategy())).statusCode).toBe(403)
    expect((await call('POST', `/teams/${GOLDEN}/playbook`, tokens.player, strategy())).statusCode).toBe(403)
  })

  it('coach de outro time não vê nem edita', async () => {
    const own = (
      await call('POST', `/teams/${GOLDEN}/playbook`, tokens.coach, strategy({ sharedWithPlayers: true }))
    ).json()
    expect((await call('GET', `/teams/${GOLDEN}/playbook`, tokens.otherCoach)).statusCode).toBe(403)
    expect((await call('GET', `/playbook/${own.id}`, tokens.otherCoach)).statusCode).toBe(404)
    expect((await call('PUT', `/playbook/${own.id}`, tokens.otherCoach, strategy())).statusCode).toBe(404)
    expect((await call('POST', `/teams/${GOLDEN}/playbook`, tokens.otherCoach, strategy())).statusCode).toBe(
      403,
    )
  })

  it('valida formas, vínculo com estratégia detectada e limites', async () => {
    const post = (body: object) => call('POST', `/teams/${GOLDEN}/playbook`, tokens.coach, body)
    const badColor = strategy({
      layers: [{ id: 'l', name: 'L', phase: 'setup', shapes: [{ ...arrow('x'), color: 'red' }] }],
    })
    expect((await post(badColor)).statusCode).toBe(400)
    const badKind = strategy({
      layers: [{ id: 'l', name: 'L', phase: 'setup', shapes: [{ id: 'x', kind: 'circle' }] }],
    })
    expect((await post(badKind)).statusCode).toBe(400)
    expect((await post(strategy({ side: 'defense' }))).statusCode).toBe(400)
    const many = Array.from({ length: 1001 }, (_, i) => arrow(`s${i}`))
    const layer = (id: string) => ({ id, name: id, phase: 'execute', shapes: many })
    expect((await post(strategy({ layers: [layer('a'), layer('b')] }))).statusCode).toBe(400)
    const huge = strategy({ notes: 'x'.repeat(5000), layers: [layer('a'), layer('b'), layer('c')] })
    expect((await post(huge)).statusCode).toBe(413)
  })
})

describe('validação robusta do playbook', () => {
  const app = useApp()

  it('aceita forma com campos extras sem perder os campos certos e recusa ids fora da faixa', async () => {
    await createUser(app(), { email: 'coach@robust.test', role: 'coach', teamId: GOLDEN })
    const token = (await login(app(), 'coach@robust.test')).access
    const post = (body: object) =>
      app().inject({
        method: 'POST',
        url: `/teams/${GOLDEN}/playbook`,
        cookies: { access_token: token },
        payload: body,
      })
    const mixed = { ...arrow('m'), points: [{ x: 0, y: 0 }], width: 2, extra: true }
    const created = await post(
      strategy({ layers: [{ id: 'l', name: 'L', phase: 'setup', shapes: [mixed] }] }),
    )
    expect(created.statusCode).toBe(201)
    expect(created.json().layers[0].shapes[0]).toEqual(arrow('m'))
    expect((await post(strategy({ mapId: 40000 }))).statusCode).toBe(400)
    expect((await post(strategy({ linkedClusterId: 3000000000 }))).statusCode).toBe(400)
    const big = await app().inject({
      method: 'GET',
      url: '/playbook/3000000000',
      cookies: { access_token: token },
    })
    expect(big.statusCode).toBe(400)
  })
})
