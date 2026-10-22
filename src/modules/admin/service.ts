import argon2 from 'argon2'
import { asc, eq } from 'drizzle-orm'

import { players, teams } from '../../db/analytics/schema.js'
import { users } from '../../db/app/schema.js'
import { revokeAllRefreshTokens } from '../auth/repository.js'
import type { UserId } from '../../shared/ids.js'
import type { Database } from '../../db/client.js'
import type { Role } from '../../plugins/auth.js'
import { AppError, notFound } from '../../shared/errors.js'
import type { CreateUserBody, UpdateUserBody, UserView } from './schemas.js'

type Link = { role: Role; playerId: number | null; teamId: number | null }

const columns = {
  id: users.id,
  email: users.email,
  role: users.role,
  playerId: users.playerId,
  teamId: users.teamId,
  createdAt: users.createdAt,
}

function toView(row: { createdAt: Date } & Omit<UserView, 'createdAt'>): UserView {
  return { ...row, createdAt: row.createdAt.toISOString() }
}

async function validateLink(db: Database, link: Link): Promise<void> {
  if (link.role === 'player' && link.playerId === null) {
    throw new AppError('VALIDATION', 'Conta de player precisa de playerId')
  }
  if (link.role === 'coach' && link.teamId === null) {
    throw new AppError('VALIDATION', 'Conta de coach precisa de teamId')
  }
  if (link.playerId !== null) {
    const [player] = await db.select({ id: players.id }).from(players).where(eq(players.id, link.playerId))
    if (!player) throw notFound('Jogador')
  }
  if (link.teamId !== null) {
    const [team] = await db.select({ id: teams.id }).from(teams).where(eq(teams.id, link.teamId))
    if (!team) throw notFound('Time')
  }
}

export async function listUsers(db: Database): Promise<UserView[]> {
  const rows = await db.select(columns).from(users).orderBy(asc(users.id))
  return rows.map(toView)
}

export async function createUser(db: Database, body: CreateUserBody): Promise<UserView> {
  const link: Link = { role: body.role, playerId: body.playerId ?? null, teamId: body.teamId ?? null }
  await validateLink(db, link)
  const email = body.email.toLowerCase()
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email))
  if (existing) throw new AppError('CONFLICT', 'E-mail já cadastrado')
  const [row] = await db
    .insert(users)
    .values({ email, passwordHash: await argon2.hash(body.password), ...link })
    .onConflictDoNothing({ target: users.email })
    .returning(columns)
  if (!row) throw new AppError('CONFLICT', 'E-mail já cadastrado')
  return toView(row)
}

export async function updateUser(db: Database, id: number, body: UpdateUserBody): Promise<UserView> {
  if (Object.keys(body).length === 0) throw new AppError('VALIDATION', 'Nada para atualizar')
  const [current] = await db.select(columns).from(users).where(eq(users.id, id))
  if (!current) throw notFound('Usuário')
  const link: Link = {
    role: body.role ?? current.role,
    playerId: body.playerId === undefined ? current.playerId : body.playerId,
    teamId: body.teamId === undefined ? current.teamId : body.teamId,
  }
  await validateLink(db, link)
  const [row] = await db
    .update(users)
    .set({ ...link, ...(body.password ? { passwordHash: await argon2.hash(body.password) } : {}) })
    .where(eq(users.id, id))
    .returning(columns)
  if (!row) throw notFound('Usuário')
  if (body.password !== undefined || link.role !== current.role)
    await revokeAllRefreshTokens(db, id as UserId)
  return toView(row)
}
