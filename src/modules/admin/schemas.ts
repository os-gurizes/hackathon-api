import { Type, type Static } from 'typebox'

import { RoleSchema } from '../auth/schemas.js'

export const UserView = Type.Object({
  id: Type.Integer(),
  email: Type.String(),
  role: RoleSchema,
  playerId: Type.Union([Type.Integer(), Type.Null()]),
  teamId: Type.Union([Type.Integer(), Type.Null()]),
  createdAt: Type.String({ format: 'date-time' }),
})

export const CreateUserBody = Type.Object({
  email: Type.String({ format: 'email', maxLength: 200 }),
  password: Type.String({ minLength: 8, maxLength: 200 }),
  role: RoleSchema,
  playerId: Type.Optional(Type.Integer({ minimum: 1 })),
  teamId: Type.Optional(Type.Integer({ minimum: 1 })),
})

export const UpdateUserBody = Type.Object({
  password: Type.Optional(Type.String({ minLength: 8, maxLength: 200 })),
  role: Type.Optional(RoleSchema),
  playerId: Type.Optional(Type.Union([Type.Integer({ minimum: 1 }), Type.Null()])),
  teamId: Type.Optional(Type.Union([Type.Integer({ minimum: 1 }), Type.Null()])),
})

export type UserView = Static<typeof UserView>
export type CreateUserBody = Static<typeof CreateUserBody>
export type UpdateUserBody = Static<typeof UpdateUserBody>
