import { sql } from 'drizzle-orm'
import { index, integer, pgSchema, serial, text, timestamp } from 'drizzle-orm/pg-core'

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
