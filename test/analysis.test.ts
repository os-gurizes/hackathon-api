import { sql } from 'drizzle-orm'
import { beforeAll, describe, expect, it } from 'vitest'

import { createUser, login, useApp, viewerToken } from './helpers.js'

const TAEK = 10
const GOLDEN = 3
const OTHER_PLAYER = 14
const OTHER_TEAM = 1
const ASCENT = 1

describe('análises do time e do jogador', () => {
  const app = useApp()
  let admin = ''
  const get = (url: string, token = admin) =>
    app().inject({ method: 'GET', url, cookies: { access_token: token } })

  beforeAll(async () => {
    admin = await viewerToken(app())
  })

  it('economia: compras somam os rounds do time e exemplos apontam para rounds reais', async () => {
    const economy = (await get(`/teams/${GOLDEN}/economy`)).json()
    const rounds = economy.byBuyType.reduce((n: number, b: { rounds: number }) => n + b.rounds, 0)
    const profile = (await get(`/teams/${GOLDEN}`)).json()
    const played = profile.maps.reduce((n: number, m: { matches: number }) => n + m.matches, 0)
    expect(played).toBe(9)
    expect(rounds).toBeGreaterThan(150)
    const matrixRounds = economy.matrix.reduce((n: number, m: { rounds: number }) => n + m.rounds, 0)
    expect(matrixRounds).toBe(rounds)
    for (const flag of economy.flags) {
      for (const example of flag.examples)
        expect(example).toEqual({ matchId: expect.any(Number), number: expect.any(Number) })
    }
  })

  it('estratégias trazem intervalo de confiança que contém a taxa', async () => {
    const strategies = (await get(`/teams/${GOLDEN}/strategies?map=${ASCENT}&side=attack`)).json()
    expect(strategies.length).toBeGreaterThan(0)
    for (const s of strategies) {
      expect(s.strategy.side).toBe('attack')
      expect(s.confidenceInterval[0]).toBeLessThanOrEqual(s.winRate)
      expect(s.confidenceInterval[1]).toBeGreaterThanOrEqual(s.winRate)
    }
  })

  it('rotações e combos vêm marcados como estimativa', async () => {
    const rotations = (await get(`/teams/${GOLDEN}/rotations`)).json()
    expect(rotations.isEstimate).toBe(true)
    expect(rotations.summary.length).toBeGreaterThan(0)
    const combos = (await get(`/teams/${GOLDEN}/combos`)).json()
    expect(combos.isEstimate).toBe(true)
    const occurrences = combos.combos.map((c: { occurrences: number }) => c.occurrences)
    expect(occurrences).toEqual([...occurrences].sort((a: number, b: number) => b - a))
  })

  it('pressão compara com a média de todos', async () => {
    const team = (await get(`/teams/${GOLDEN}/pressure`)).json()
    const player = (await get(`/players/${TAEK}/pressure`)).json()
    expect(team.map((p: { context: string }) => p.context)).toContain('post_plant')
    expect(player[0].baseline.kd).toBeGreaterThan(0)
  })

  it('padrões trazem exemplos convertidos em partida e round', async () => {
    const [round] = (
      await app().db.execute<{ id: string }>(sql`SELECT id FROM analytics.rounds ORDER BY id LIMIT 1`)
    ).rows
    await app().db.execute(sql`
      INSERT INTO analytics.player_patterns (player_id, map_id, side, pattern, zone_id, rounds, occurrences,
        expected, rate, baseline_rate, p_value, p_adjusted, cost_rounds, significant, tier, evidence_round_ids)
      VALUES (${TAEK}, ${ASCENT}, 'attack', 'isolated_death', NULL, 40, 12, 5, 0.3, 0.12, 0.001, 0.05, 1.4, true,
              'confirmed', ARRAY[${round?.id}]::bigint[])`)
    const patterns = (await get(`/players/${TAEK}/patterns`)).json()
    expect(patterns).toHaveLength(1)
    expect(patterns[0]).toMatchObject({ pattern: 'isolated_death', tier: 'confirmed', costRounds: 1.4 })
    expect(patterns[0].examples[0]).toEqual({ matchId: expect.any(Number), number: 0 })
  })

  it('habilidades vêm marcadas como estimativa', async () => {
    const abilities = (await get(`/players/${TAEK}/abilities`)).json()
    expect(abilities.isEstimate).toBe(true)
    expect(abilities.usage.matches).toBe(9)
  })

  it('insights ordenam alertas antes de pontos fortes', async () => {
    const insights = (await get(`/insights?scope=team&id=${GOLDEN}`)).json()
    const polarity = insights.map((i: { polarity: string }) => i.polarity)
    expect(polarity.indexOf('positive')).toBeGreaterThanOrEqual(polarity.lastIndexOf('negative'))
    expect((await get('/insights?scope=nada&id=1')).statusCode).toBe(400)
  })
})

describe('acesso às análises', () => {
  const app = useApp()
  const get = (url: string, token: string) =>
    app().inject({ method: 'GET', url, cookies: { access_token: token } })

  it('player não vê dados individuais de outro jogador nem a análise de outro time', async () => {
    await createUser(app(), { email: 'taek@analysis.test', role: 'player', playerId: TAEK, teamId: GOLDEN })
    const taek = (await login(app(), 'taek@analysis.test')).access
    expect((await get(`/players/${TAEK}/patterns`, taek)).statusCode).toBe(200)
    expect((await get(`/players/${OTHER_PLAYER}/patterns`, taek)).statusCode).toBe(403)
    expect((await get(`/insights?scope=player&id=${OTHER_PLAYER}`, taek)).statusCode).toBe(403)
    expect((await get(`/teams/${OTHER_TEAM}/economy`, taek)).statusCode).toBe(403)
    expect((await get(`/teams/${GOLDEN}/economy`, taek)).statusCode).toBe(200)
  })

  it('coach analisa qualquer time mas só vê individuais do próprio elenco', async () => {
    await createUser(app(), { email: 'coach@analysis.test', role: 'coach', teamId: GOLDEN })
    const coach = (await login(app(), 'coach@analysis.test')).access
    expect((await get(`/teams/${OTHER_TEAM}/strategies`, coach)).statusCode).toBe(200)
    expect((await get(`/players/${TAEK}/pressure`, coach)).statusCode).toBe(200)
    expect((await get(`/players/${OTHER_PLAYER}/pressure`, coach)).statusCode).toBe(403)
  })

  it('responde 404 para time ou jogador inexistente', async () => {
    await createUser(app(), { email: 'admin@analysis.test', role: 'admin' })
    const token = (await login(app(), 'admin@analysis.test')).access
    expect((await get('/teams/99999/economy', token)).statusCode).toBe(404)
    expect((await get('/players/99999/patterns', token)).statusCode).toBe(404)
  })
})

describe('detalhamento por jogador na análise do time', () => {
  const app = useApp()
  const get = (url: string, token: string) =>
    app().inject({ method: 'GET', url, cookies: { access_token: token } })

  it('player vê só as próprias linhas; coach vê o elenco inteiro', async () => {
    await createUser(app(), { email: 'taek@rows.test', role: 'player', playerId: TAEK, teamId: GOLDEN })
    await createUser(app(), { email: 'coach@rows.test', role: 'coach', teamId: GOLDEN })
    const player = (await login(app(), 'taek@rows.test')).access
    const coach = (await login(app(), 'coach@rows.test')).access

    const asPlayer = (await get(`/teams/${GOLDEN}/rotations`, player)).json()
    const asCoach = (await get(`/teams/${GOLDEN}/rotations`, coach)).json()
    expect(asPlayer.byPlayer.every((r: { player: { id: number } }) => r.player.id === TAEK)).toBe(true)
    expect(asCoach.byPlayer.length).toBeGreaterThan(1)
    expect(asPlayer.summary).toEqual(asCoach.summary)

    const combos = (await get(`/teams/${GOLDEN}/combos`, player)).json()
    for (const c of combos.combos) expect([c.playerA.id, c.playerB.id]).toContain(TAEK)
  })

  it('habilidades respeitam o filtro de etapa', async () => {
    await createUser(app(), { email: 'admin@rows.test', role: 'admin' })
    const admin = (await login(app(), 'admin@rows.test')).access
    const all = (await get(`/players/${TAEK}/abilities`, admin)).json()
    const stage = (await get(`/players/${TAEK}/abilities?tournament=3`, admin)).json()
    expect(stage.usage.matches).toBeLessThan(all.usage.matches)
  })
})
