import { sql } from 'drizzle-orm'
import { boolean, index, integer, jsonb, pgSchema, serial, text, timestamp } from 'drizzle-orm/pg-core'

import type { DrawingLayer } from '../../modules/playbook/schemas.js'

export const app = pgSchema('app')

export const userRole = app.enum('user_role', ['player', 'coach', 'admin'])

export const users = app.table('users', {
  id: serial().primaryKey(),
  email: text().notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: userRole().notNull(),
  playerId: integer('player_id'),
  teamId: integer('team_id'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
})

export const refreshTokens = app.table(
  'refresh_tokens',
  {
    id: serial().primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [index('refresh_tokens_user_idx').on(table.userId)],
)

export const playbookSide = app.enum('playbook_side', ['attack', 'defense'])

export const playbookStrategies = app.table(
  'playbook_strategies',
  {
    id: serial().primaryKey(),
    teamId: integer('team_id').notNull(),
    mapId: integer('map_id').notNull(),
    side: playbookSide().notNull(),
    title: text().notNull(),
    notes: text().notNull().default(''),
    layers: jsonb().$type<DrawingLayer[]>().notNull(),
    linkedClusterId: integer('linked_cluster_id'),
    sharedWithPlayers: boolean('shared_with_players').notNull().default(false),
    createdBy: integer('created_by')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [index('playbook_team_map_idx').on(table.teamId, table.mapId)],
)
