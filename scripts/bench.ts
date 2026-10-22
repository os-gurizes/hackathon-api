import autocannon from 'autocannon'

const base = process.env.BENCH_URL ?? 'http://localhost:3333'
const email = process.env.BENCH_EMAIL ?? 'admin@vstats.local'
const password = process.env.BENCH_PASSWORD
if (!password) throw new Error('defina BENCH_PASSWORD')

const login = await fetch(`${base}/auth/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email, password }),
})
if (!login.ok) throw new Error(`login falhou: ${login.status}`)
const cookie = login.headers
  .getSetCookie()
  .map((c) => c.split(';')[0])
  .join('; ')

async function first<T>(path: string, select: (body: unknown) => T): Promise<T> {
  const response = await fetch(`${base}${path}`, { headers: { cookie } })
  if (!response.ok) throw new Error(`${path} respondeu ${response.status}`)
  return select(await response.json())
}

type Page<T> = { items: T[] }
const match = await first('/matches?limit=1', (b) => (b as Page<{ id: number }>).items[0]?.id ?? 1)
const player = await first(
  '/players?limit=1',
  (b) => (b as Page<{ player: { id: number } }>).items[0]?.player.id ?? 1,
)
const team = await first('/teams', (b) => (b as Array<{ team: { id: number } }>)[0]?.team.id ?? 1)
const map = await first('/maps', (b) => (b as Array<{ id: number }>)[0]?.id ?? 1)

const paths = [
  '/tournaments',
  `/maps/${map}`,
  '/matches?limit=20',
  `/matches/${match}`,
  `/matches/${match}/rounds`,
  `/matches/${match}/rounds/5/replay`,
  '/players?limit=20',
  `/players/${player}/stats`,
  `/players/${player}/weapons`,
  `/maps/${map}/heatmap`,
  `/maps/${map}/heatmap?metric=kd&resolution=zones`,
  `/teams/${team}/economy`,
  `/teams/${team}/strategies`,
  `/teams/${team}/rotations`,
  `/insights?scope=team&id=${team}`,
]

console.log('rota'.padEnd(48), 'req/s'.padStart(7), 'p50'.padStart(6), 'p97.5'.padStart(7), 'p99'.padStart(6))
for (const path of paths) {
  const result = await autocannon({
    url: `${base}${path}`,
    connections: 10,
    duration: 5,
    headers: { cookie },
  })
  const failed = result.non2xx + result.errors
  console.log(
    path.padEnd(48),
    String(Math.round(result.requests.average)).padStart(7),
    `${result.latency.p50}ms`.padStart(6),
    `${result.latency.p97_5}ms`.padStart(7),
    `${result.latency.p99}ms`.padStart(6),
    failed > 0 ? `  ${failed} falhas` : '',
  )
}
