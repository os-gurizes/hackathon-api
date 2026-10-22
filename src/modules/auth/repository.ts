import { and, eq, gt, isNull } from 'drizzle-orm'

import { players, teams } from '../../db/analytics/schema.js'
import { refreshTokens, users } from '../../db/app/schema.js'
import type { Database } from '../../db/client.js'
import type { Role } from '../../plugins/auth.js'
import type { UserId } from '../../shared/ids.js'
import type { Me } from './schemas.js'

export type UserRecord = {
  id: UserId
  email: string
  passwordHash: string
  role: Role
}

export async function findUserByEmail(db: Database, email: string): Promise<UserRecord | undefined> {
  const [user] = await db
    .select({ id: users.id, email: users.email, passwordHash: users.passwordHash, role: users.role })
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
  return user && { ...user, id: user.id as UserId }
}

export async function findMe(db: Database, userId: UserId): Promise<Me | undefined> {
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      playerId: players.id,
      gameName: players.gameName,
      tagLine: players.tagLine,
      teamId: teams.id,
      teamSlug: teams.slug,
      teamName: teams.displayName,
    })
    .from(users)
    .leftJoin(players, eq(players.id, users.playerId))
    .leftJoin(teams, eq(teams.id, users.teamId))
    .where(eq(users.id, userId))
  if (!row) return undefined
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    player:
      row.playerId === null || row.gameName === null || row.tagLine === null
        ? null
        : { id: row.playerId, gameName: row.gameName, tagLine: row.tagLine },
    team:
      row.teamId === null || row.teamSlug === null || row.teamName === null
        ? null
        : { id: row.teamId, slug: row.teamSlug, displayName: row.teamName },
  }
}

export async function saveRefreshToken(
  db: Database,
  userId: UserId,
  tokenHash: string,
  expiresAt: Date,
): Promise<void> {
  await db.insert(refreshTokens).values({ userId, tokenHash, expiresAt })
}

export const REUSE_GRACE_MS = 10_000

export async function revokeAllRefreshTokens(db: Database, userId: UserId): Promise<void> {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)))
}

export async function consumeRefreshToken(
  db: Database,
  tokenHash: string,
): Promise<{ userId: UserId; role: Role } | undefined> {
  const now = new Date()
  const [row] = await db
    .update(refreshTokens)
    .set({ revokedAt: now })
    .where(
      and(
        eq(refreshTokens.tokenHash, tokenHash),
        isNull(refreshTokens.revokedAt),
        gt(refreshTokens.expiresAt, now),
      ),
    )
    .returning({ userId: refreshTokens.userId })
  if (!row) {
    const [used] = await db
      .select({
        userId: refreshTokens.userId,
        revokedAt: refreshTokens.revokedAt,
        expiresAt: refreshTokens.expiresAt,
      })
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash))
    const reused =
      used?.revokedAt && used.expiresAt > now && now.getTime() - used.revokedAt.getTime() > REUSE_GRACE_MS
    if (used && reused) await revokeAllRefreshTokens(db, used.userId as UserId)
    return undefined
  }
  const [user] = await db.select({ role: users.role }).from(users).where(eq(users.id, row.userId))
  return user && { userId: row.userId as UserId, role: user.role }
}

export async function revokeRefreshToken(db: Database, tokenHash: string): Promise<void> {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.tokenHash, tokenHash), isNull(refreshTokens.revokedAt)))
}
