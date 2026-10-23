import { beforeAll, describe, expect, it } from 'vitest'

import { useApp, viewerToken } from './helpers.js'

const LOTUS = 2

describe('partidas', () => {
  const app = useApp()
  let token = ''
  const get = (url: string) => app().inject({ method: 'GET', url, cookies: { access_token: token } })

  beforeAll(async () => {
    token = await viewerToken(app())
  })

  it('pagina por cursor sem repetir nem pular partidas', async () => {
    const seen: number[] = []
    let cursor: string | null = null
    do {
      const query: string = cursor ? `&cursor=${cursor}` : ''
      const page = (await get(`/matches?limit=4${query}`)).json()
      seen.push(...page.items.map((m: { id: number }) => m.id))
      cursor = page.nextCursor
    } while (cursor)
    expect(seen).toHaveLength(9)
    expect(new Set(seen).size).toBe(9)
  })

  it('ordena da mais recente para a mais antiga', async () => {
    const items = (await get('/matches?limit=100')).json().items
    const dates = items.map((m: { startedAt: string }) => m.startedAt)
    expect(dates).toEqual([...dates].sort().reverse())
  })

  it('filtra por mapa e rejeita filtro inválido', async () => {
    const lotus = (await get(`/matches?map=${LOTUS}`)).json()
    expect(lotus.items).toHaveLength(1)
    expect((await get('/matches?map=abc')).statusCode).toBe(400)
    expect((await get('/matches?cursor=!!')).statusCode).toBe(400)
  })

  it('monta o scoreboard com 10 jogadores e números consistentes', async () => {
    const [first] = (await get('/matches?limit=1')).json().items
    const detail = (await get(`/matches/${first.id}`)).json()
    expect(detail.scoreboard).toHaveLength(10)
    const totalRounds = detail.red.score + detail.blue.score
    for (const line of detail.scoreboard) {
      expect(line.rounds).toBe(totalRounds)
      expect(line.kast).toBeGreaterThanOrEqual(0)
      expect(line.kast).toBeLessThanOrEqual(1)
    }
    expect((await get('/matches/999999')).statusCode).toBe(404)
  })

  it('traz a timeline de rounds com compra e curva de vitória', async () => {
    const [first] = (await get('/matches?limit=1')).json().items
    const rounds = (await get(`/matches/${first.id}/rounds`)).json()
    expect(rounds).toHaveLength(first.red.score + first.blue.score)
    expect(rounds[0].buys[0].buyType).toBe('pistol')
    expect(rounds[0].winProbability[0]).toMatchObject({ tMs: 0, event: 'start' })
  })

  it('entrega o replay do round em ordem de tempo', async () => {
    const [first] = (await get('/matches?limit=1')).json().items
    const replay = (await get(`/matches/${first.id}/rounds/3/replay`)).json()
    expect(replay.players).toHaveLength(10)
    const times = replay.events.map((e: { tMs: number }) => e.tMs)
    expect(times).toEqual([...times].sort((a: number, b: number) => a - b))
    const kill = replay.events.find((e: { type: string }) => e.type === 'kill')
    expect(kill.positions.length).toBeGreaterThan(0)
    expect((await get(`/matches/${first.id}/rounds/99/replay`)).statusCode).toBe(404)
  })
})
