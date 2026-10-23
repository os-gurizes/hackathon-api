import argon2 from 'argon2'
import { sql } from 'drizzle-orm'

import { loadConfig } from '../src/config.js'
import { users } from '../src/db/app/schema.js'
import { connectDatabase } from '../src/db/client.js'
import { parseWith } from '../src/shared/parse.js'
import { Type } from 'typebox'

const MIN_MATCHES = 5
const DOMAIN = 'vstats.local'

const { SEED_PASSWORD } = parseWith(
  Type.Object({ SEED_PASSWORD: Type.String({ minLength: 8 }) }),
  process.env,
)
const config = loadConfig()
const database = connectDatabase(config.DATABASE_URL)
const { db } = database

type TeamRow = { team_id: number; slug: string; player_id: number }

const teams = await db.execute<TeamRow>(sql`
  SELECT DISTINCT ON (mp.team_id) mp.team_id, t.slug, mp.player_id
  FROM analytics.match_players mp
  JOIN analytics.teams t ON t.id = mp.team_id
  WHERE mp.team_id IN (
    SELECT team_id FROM analytics.match_players GROUP BY team_id HAVING count(DISTINCT match_id) >= ${MIN_MATCHES}
  )
  GROUP BY mp.team_id, t.slug, mp.player_id
  ORDER BY mp.team_id, count(*) DESC, mp.player_id
`)

const passwordHash = await argon2.hash(SEED_PASSWORD)
const emailSlug = (slug: string) => slug.replaceAll('_', '-')
const accounts = [
  { email: `admin@${DOMAIN}`, role: 'admin' as const, playerId: null, teamId: null },
  ...teams.rows.flatMap((team) => [
    {
      email: `coach.${emailSlug(team.slug)}@${DOMAIN}`,
      role: 'coach' as const,
      playerId: null,
      teamId: team.team_id,
    },
    {
      email: `player.${emailSlug(team.slug)}@${DOMAIN}`,
      role: 'player' as const,
      playerId: team.player_id,
      teamId: team.team_id,
    },
  ]),
]

for (const account of accounts) {
  await db
    .insert(users)
    .values({ ...account, passwordHash })
    .onConflictDoUpdate({
      target: users.email,
      set: { role: account.role, playerId: account.playerId, teamId: account.teamId, passwordHash },
    })
}

console.log(`${accounts.length} contas (1 admin, ${teams.rows.length} coaches, ${teams.rows.length} players)`)
await database.close()
