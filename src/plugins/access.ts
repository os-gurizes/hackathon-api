import { eq, sql } from 'drizzle-orm'

import { users } from '../db/app/schema.js'
import type { Database } from '../db/client.js'
import { forbidden, unauthorized } from '../shared/errors.js'
import { one } from '../shared/sql.js'
import type { AuthUser, Role } from './auth.js'

export type Viewer = {
  id: number
  role: Role
  playerId: number | null
  teamId: number | null
}

export async function loadViewer(db: Database, user: AuthUser): Promise<Viewer> {
  const [row] = await db
    .select({ id: users.id, role: users.role, playerId: users.playerId, teamId: users.teamId })
    .from(users)
    .where(eq(users.id, user.id))
  if (!row) throw unauthorized()
  return row
}

async function playedFor(db: Database, playerId: number, teamId: number): Promise<boolean> {
  const row = await one(
    db,
    sql`SELECT 1 AS ok FROM analytics.match_players WHERE player_id = ${playerId} AND team_id = ${teamId} LIMIT 1`,
  )
  return row !== undefined
}

export async function canViewPlayerPrivate(db: Database, viewer: Viewer, playerId: number): Promise<boolean> {
  if (viewer.role === 'admin') return true
  if (viewer.role === 'player') return viewer.playerId === playerId
  return viewer.teamId !== null && playedFor(db, playerId, viewer.teamId)
}

export async function canViewTeamAnalytics(db: Database, viewer: Viewer, teamId: number): Promise<boolean> {
  if (viewer.role !== 'player') return true
  return viewer.playerId !== null && playedFor(db, viewer.playerId, teamId)
}

export type PlaybookAccess = 'all' | 'shared' | 'none'

export async function playbookAccess(db: Database, viewer: Viewer, teamId: number): Promise<PlaybookAccess> {
  if (canEditTeam(viewer, teamId)) return 'all'
  if (
    viewer.role === 'player' &&
    viewer.playerId !== null &&
    (await playedFor(db, viewer.playerId, teamId))
  ) {
    return 'shared'
  }
  return 'none'
}

export function canEditTeam(viewer: Viewer, teamId: number): boolean {
  return viewer.role === 'admin' || (viewer.role === 'coach' && viewer.teamId === teamId)
}

export async function assert(allowed: Promise<boolean> | boolean): Promise<void> {
  if (!(await allowed)) throw forbidden()
}
