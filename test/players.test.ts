import { beforeAll, describe, expect, it } from 'vitest'

import { useApp, viewerToken } from './helpers.js'

const TAEK = 10
const GOLDEN = 3

describe('jogadores', () => {
  const app = useApp()
  let token = ''
  const get = (url: string) => app().inject({ method: 'GET', url, cookies: { access_token: token } })

  beforeAll(async () => {
    token = await viewerToken(app())
  })

  it('ranqueia por ACS em ordem decrescente e pagina sem repetir', async () => {
    const all: number[] = []
    const values: number[] = []
    let cursor: string | null = null
    do {
      const page: { items: { player: { id: number }; sortValue: number }[]; nextCursor: string | null } = (
        await get(`/players?minRounds=20&limit=7${cursor ? `&cursor=${cursor}` : ''}`)
      ).json()
      all.push(...page.items.map((i: { player: { id: number } }) => i.player.id))
      values.push(...page.items.map((i: { sortValue: number }) => i.sortValue))
      cursor = page.nextCursor
    } while (cursor)
    expect(new Set(all).size).toBe(all.length)
    expect(values).toEqual([...values].sort((a, b) => b - a))
  })

  it('ordena por outras métricas, busca por nick e respeita o mínimo de rounds', async () => {
    const kd = (await get('/players?sort=kd&minRounds=100')).json()
    expect(kd.items.every((i: { stats: { rounds: number } }) => i.stats.rounds >= 100)).toBe(true)
    const search = (await get('/players?search=tae&minRounds=0')).json()
    expect(search.items.map((i: { player: { gameName: string } }) => i.player.gameName)).toContain('taek')
    expect((await get('/players?sort=nada')).statusCode).toBe(400)
  })

  it('mostra o perfil com times e agentes principais', async () => {
    const body = (await get(`/players/${TAEK}`)).json()
    expect(body.player.gameName).toBe('taek')
    expect(body.teams[0].team.id).toBe(GOLDEN)
    expect(body.totals.matches).toBe(9)
    expect(body.topAgents.length).toBeGreaterThan(0)
    expect((await get('/players/99999')).statusCode).toBe(404)
  })

  it('quebra as estatísticas por mapa, agente e lado de forma consistente', async () => {
    const stats = (await get(`/players/${TAEK}/stats`)).json()
    const sum = (items: { stats: { rounds: number } }[]) => items.reduce((n, i) => n + i.stats.rounds, 0)
    expect(sum(stats.byMap)).toBe(stats.overall.rounds)
    expect(sum(stats.bySide)).toBe(stats.overall.rounds)
    expect(stats.kdPerMatch.matches).toHaveLength(9)
    const ascent = (await get(`/players/${TAEK}/stats?map=1&side=attack`)).json()
    expect(ascent.byMap).toHaveLength(1)
    expect(ascent.bySide.map((s: { side: string }) => s.side)).toEqual(['attack'])
  })

  it('lista as partidas do jogador com o resultado do time', async () => {
    const page = (await get(`/players/${TAEK}/matches?limit=5`)).json()
    expect(page.items).toHaveLength(5)
    expect(page.nextCursor).not.toBeNull()
    expect(page.items[0].team.id).toBe(GOLDEN)
  })

  it('compara agentes e armas com a média', async () => {
    const agents = (await get(`/players/${TAEK}/agents`)).json()
    expect(agents[0].baselineAcs).toBeGreaterThan(0)
    const weapons = (await get(`/players/${TAEK}/weapons`)).json()
    const vandal = weapons.find((w: { weapon: { name: string } }) => w.weapon.name === 'Vandal')
    expect(vandal.kills).toBeGreaterThan(0)
    expect(vandal.baseline.headshotRateEquipped).toBeGreaterThan(0)
  })
})

describe('times e estatísticas gerais', () => {
  const app = useApp()
  let token = ''
  const get = (url: string) => app().inject({ method: 'GET', url, cookies: { access_token: token } })

  beforeAll(async () => {
    token = await viewerToken(app())
  })

  it('lista times e mostra o perfil com elenco e mapas', async () => {
    const teams = (await get('/teams')).json()
    expect(teams[0]).toMatchObject({ team: { id: GOLDEN }, matches: 9 })
    const profile = (await get(`/teams/${GOLDEN}`)).json()
    expect(profile.rosters.length).toBe(3)
    expect(profile.maps.reduce((n: number, m: { matches: number }) => n + m.matches, 0)).toBe(9)
    expect((await get('/teams/99999')).statusCode).toBe(404)
  })

  it('ranqueia armas por kills com custo por kill', async () => {
    const weapons = (await get('/weapons/stats')).json()
    const kills = weapons.map((w: { kills: number }) => w.kills)
    expect(kills).toEqual([...kills].sort((a: number, b: number) => b - a))
    expect(
      weapons.find((w: { weapon: { name: string } }) => w.weapon.name === 'Vandal').costPerKill,
    ).toBeGreaterThan(0)
  })

  it('pick rate dos agentes soma 5 por time e mapa', async () => {
    const agents = (await get('/agents/stats?map=1')).json()
    const total = agents.reduce((n: number, a: { pickRate: number }) => n + a.pickRate, 0)
    expect(total).toBeCloseTo(5, 1)
  })
})
