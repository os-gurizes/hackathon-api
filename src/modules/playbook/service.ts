import { and, desc, eq, sql, type SQL } from 'drizzle-orm'

import { playbookStrategies } from '../../db/app/schema.js'
import type { Database } from '../../db/client.js'
import type { PlaybookAccess } from '../../plugins/access.js'
import { AppError, notFound } from '../../shared/errors.js'
import { one } from '../../shared/sql.js'
import {
  MAX_SHAPES,
  type PlaybookQuery,
  type PlaybookStrategy,
  type PlaybookSummary,
  type StrategyInput,
} from './schemas.js'

type Row = typeof playbookStrategies.$inferSelect

function toStrategy(row: Row): PlaybookStrategy {
  return {
    id: row.id,
    teamId: row.teamId,
    mapId: row.mapId,
    side: row.side,
    title: row.title,
    notes: row.notes,
    layers: row.layers,
    linkedClusterId: row.linkedClusterId,
    sharedWithPlayers: row.sharedWithPlayers,
    updatedAt: row.updatedAt.toISOString(),
  }
}

function toSummary(row: Row): PlaybookSummary {
  return {
    id: row.id,
    teamId: row.teamId,
    mapId: row.mapId,
    side: row.side,
    title: row.title,
    sharedWithPlayers: row.sharedWithPlayers,
    linkedClusterId: row.linkedClusterId,
    layers: row.layers.length,
    shapes: row.layers.reduce((n, layer) => n + layer.shapes.length, 0),
    updatedAt: row.updatedAt.toISOString(),
  }
}

async function validate(db: Database, input: StrategyInput): Promise<void> {
  const shapes = input.layers.reduce((n, layer) => n + layer.shapes.length, 0)
  if (shapes > MAX_SHAPES) throw new AppError('VALIDATION', `No máximo ${MAX_SHAPES} formas por estratégia`)
  const map = await one(db, sql`SELECT 1 AS ok FROM analytics.maps WHERE id = ${input.mapId}`)
  if (!map) throw notFound('Mapa')
  if (input.linkedClusterId !== null) {
    const cluster = await one(
      db,
      sql`SELECT 1 AS ok FROM analytics.strategies
          WHERE id = ${input.linkedClusterId} AND map_id = ${input.mapId} AND side = ${input.side}`,
    )
    if (!cluster)
      throw new AppError('VALIDATION', 'A estratégia detectada vinculada precisa ser do mesmo mapa e lado')
  }
}

export async function listPlaybook(
  db: Database,
  teamId: number,
  access: PlaybookAccess,
  query: PlaybookQuery,
): Promise<PlaybookSummary[]> {
  const conditions: SQL[] = [eq(playbookStrategies.teamId, teamId)]
  if (access === 'shared') conditions.push(eq(playbookStrategies.sharedWithPlayers, true))
  if (query.map !== undefined) conditions.push(eq(playbookStrategies.mapId, query.map))
  if (query.side !== undefined) conditions.push(eq(playbookStrategies.side, query.side))
  const data = await db
    .select()
    .from(playbookStrategies)
    .where(and(...conditions))
    .orderBy(desc(playbookStrategies.updatedAt))
  return data.map(toSummary)
}

export async function findStrategy(db: Database, id: number): Promise<Row | undefined> {
  const [row] = await db.select().from(playbookStrategies).where(eq(playbookStrategies.id, id))
  return row
}

export function visibleStrategy(row: Row, access: PlaybookAccess): PlaybookStrategy {
  if (access === 'none' || (access === 'shared' && !row.sharedWithPlayers)) throw notFound('Estratégia')
  return toStrategy(row)
}

export async function createStrategy(
  db: Database,
  teamId: number,
  userId: number,
  input: StrategyInput,
): Promise<PlaybookStrategy> {
  await validate(db, input)
  const [row] = await db
    .insert(playbookStrategies)
    .values({ ...input, teamId, createdBy: userId })
    .returning()
  if (!row) throw new AppError('INTERNAL', 'Falha ao salvar a estratégia')
  return toStrategy(row)
}

export async function updateStrategy(
  db: Database,
  id: number,
  input: StrategyInput,
): Promise<PlaybookStrategy> {
  await validate(db, input)
  const [row] = await db
    .update(playbookStrategies)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(playbookStrategies.id, id))
    .returning()
  if (!row) throw notFound('Estratégia')
  return toStrategy(row)
}

export async function deleteStrategy(db: Database, id: number): Promise<void> {
  await db.delete(playbookStrategies).where(eq(playbookStrategies.id, id))
}
