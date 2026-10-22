import { beforeAll, describe, expect, it } from 'vitest'

import { createUser, login, useApp, viewerToken } from './helpers.js'

const ASCENT = 1
const TAEK = 10
const GOLDEN = 3
const OTHER_PLAYER = 14
const OTHER_TEAM = 1

describe('heatmap', () => {
  const app = useApp()
  let admin = ''
  const get = (url: string, token = admin) =>
    app().inject({ method: 'GET', url, cookies: { access_token: token } })

  beforeAll(async () => {
    admin = await viewerToken(app())
  })

  it('soma a presença de todas as células', async () => {
    const all = (await get(`/maps/${ASCENT}/heatmap`)).json()
    expect(all.grid).toBe(64)
    const total = all.cells.reduce((n: number, c: { value: number }) => n + c.value, 0)
    const attack = (await get(`/maps/${ASCENT}/heatmap?side=attack`)).json()
    const defense = (await get(`/maps/${ASCENT}/heatmap?side=defense`)).json()
    const sum = (h: { cells: { value: number }[] }) => h.cells.reduce((n, c) => n + c.value, 0)
    expect(sum(attack) + sum(defense)).toBe(total)
    expect(all.maxValue).toBe(Math.max(...all.cells.map((c: { value: number }) => c.value)))
  })

  it('suaviza o K/D por local', async () => {
    const kd = (await get(`/maps/${ASCENT}/heatmap?metric=kd`)).json()
    for (const cell of kd.cells) {
      expect(cell.value).toBeGreaterThan(0)
      expect(cell.value).toBeLessThan(10)
      expect(cell.sampleSize).toBeGreaterThan(0)
    }
  })

  it('agrega por zona com nome e taxa de troca', async () => {
    const zones = (await get(`/maps/${ASCENT}/heatmap?metric=deaths&resolution=zones`)).json()
    expect(zones.cells).toHaveLength(0)
    expect(zones.zones.length).toBeGreaterThan(5)
    const zone = zones.zones[0]
    expect(zone.value).toBe(zone.deaths)
    expect(typeof zone.name).toBe('string')
    if (zone.deaths > 0) expect(zone.tradeRate).toBeCloseTo(zone.tradedDeaths / zone.deaths, 2)
  })

  it('valida métrica e mapa', async () => {
    expect((await get(`/maps/${ASCENT}/heatmap?metric=nada`)).statusCode).toBe(400)
    expect((await get('/maps/999/heatmap')).statusCode).toBe(404)
  })

  it('aplica as regras de acesso aos filtros de jogador e time', async () => {
    await createUser(app(), { email: 'taek@heat.test', role: 'player', playerId: TAEK, teamId: GOLDEN })
    const taek = (await login(app(), 'taek@heat.test')).access
    expect((await get(`/maps/${ASCENT}/heatmap?player=${TAEK}`, taek)).statusCode).toBe(200)
    expect((await get(`/maps/${ASCENT}/heatmap?player=${OTHER_PLAYER}`, taek)).statusCode).toBe(403)
    expect((await get(`/maps/${ASCENT}/heatmap?team=${GOLDEN}`, taek)).statusCode).toBe(200)
    expect((await get(`/maps/${ASCENT}/heatmap?team=${OTHER_TEAM}`, taek)).statusCode).toBe(403)
    await createUser(app(), { email: 'coach@heat.test', role: 'coach', teamId: GOLDEN })
    const coach = (await login(app(), 'coach@heat.test')).access
    expect((await get(`/maps/${ASCENT}/heatmap?team=${OTHER_TEAM}`, coach)).statusCode).toBe(200)
  })
})

describe('estatísticas do mapa', () => {
  const app = useApp()
  let admin = ''
  const get = (url: string) => app().inject({ method: 'GET', url, cookies: { access_token: admin } })

  beforeAll(async () => {
    admin = await viewerToken(app())
  })

  it('traz lados, sites e agentes com taxas consistentes', async () => {
    const stats = (await get(`/maps/${ASCENT}/stats`)).json()
    expect(stats.matches).toBe(8)
    const [attack, defense] = stats.sides
    expect(attack.roundWinRate + defense.roundWinRate).toBeCloseTo(1, 2)
    expect(stats.sites.reduce((n: number, s: { plantShare: number }) => n + s.plantShare, 0)).toBeCloseTo(
      1,
      2,
    )
    expect(stats.agents.reduce((n: number, a: { pickRate: number }) => n + a.pickRate, 0)).toBeCloseTo(5, 1)
    const team = (await get(`/maps/${ASCENT}/stats?team=${GOLDEN}`)).json()
    expect(team.agents.reduce((n: number, a: { pickRate: number }) => n + a.pickRate, 0)).toBeCloseTo(5, 1)
  })
})
