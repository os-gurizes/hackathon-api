import { beforeAll, describe, expect, it } from 'vitest'

import { useApp, viewerToken } from './helpers.js'

const ASCENT = 1

describe('catálogo', () => {
  const app = useApp()
  let token = ''
  const get = (url: string) => app().inject({ method: 'GET', url, cookies: { access_token: token } })

  beforeAll(async () => {
    token = await viewerToken(app())
  })

  it('exige login', async () => {
    expect((await app().inject({ method: 'GET', url: '/tournaments' })).statusCode).toBe(401)
  })

  it('lista campeonatos com etapas e partidas', async () => {
    const body = (await get('/tournaments')).json()
    expect(body).toHaveLength(3)
    const total = body
      .flatMap((t: { stages: { matches: number }[] }) => t.stages)
      .reduce((n: number, s: { matches: number }) => n + s.matches, 0)
    expect(total).toBe(9)
  })

  it('monta a classificação por etapa', async () => {
    const response = await get('/tournaments/3/standings')
    expect(response.statusCode).toBe(200)
    const [stage] = response.json()
    const leader = stage.standings[0]
    expect(leader.team.slug).toBe('azure_bears_golden')
    expect(leader.mapsWon + leader.mapsLost).toBeGreaterThan(0)
    expect((await get('/tournaments/999/standings')).statusCode).toBe(404)
  })

  it('devolve a série com os mapas', async () => {
    const matches = (await get('/matches?limit=1')).json()
    const series = (await get(`/series/${matches.items[0].seriesId}`)).json()
    expect(series.maps.length).toBeGreaterThan(0)
    expect([series.teamA.id, series.teamB.id]).toContain(series.maps[0].winnerTeamId)
  })

  it('lista mapas e entrega a geometria completa', async () => {
    const maps = (await get('/maps')).json()
    expect(maps[0]).toMatchObject({ id: ASCENT, matches: 8 })
    const detail = (await get(`/maps/${ASCENT}`)).json()
    expect(detail.viewBox).toEqual([0, 0, 1000, 1000])
    expect(detail.silhouette).toMatch(/^M/)
    expect(detail.sites.map((s: { site: string }) => s.site)).toEqual(['A', 'B'])
    expect(detail.zones.length).toBeGreaterThan(10)
    expect((await get('/maps/999')).statusCode).toBe(404)
  })

  it('lista agentes com habilidades e armas', async () => {
    const agents = (await get('/agents')).json()
    expect(agents.find((a: { name: string }) => a.name === 'Jett').abilities.ultimate).toBe('Tormenta de Aço')
    const weapons = (await get('/weapons')).json()
    expect(weapons.find((w: { name: string }) => w.name === 'Vandal')).toMatchObject({
      cost: 2900,
      isArmor: false,
    })
  })
})
