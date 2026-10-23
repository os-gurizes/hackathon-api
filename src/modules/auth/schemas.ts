import { Type, type Static } from 'typebox'

import { Literals } from '../../shared/schema.js'

export const RoleSchema = Literals(['player', 'coach', 'admin'])

export const LoginBody = Type.Object({
  email: Type.String({ format: 'email', maxLength: 200 }),
  password: Type.String({ minLength: 1, maxLength: 200 }),
})

export const LinkedPlayer = Type.Object({
  id: Type.Integer(),
  gameName: Type.String(),
  tagLine: Type.String(),
})

export const LinkedTeam = Type.Object({
  id: Type.Integer(),
  slug: Type.String(),
  displayName: Type.String(),
})

export const Me = Type.Object({
  id: Type.Integer(),
  email: Type.String(),
  role: RoleSchema,
  player: Type.Union([LinkedPlayer, Type.Null()]),
  team: Type.Union([LinkedTeam, Type.Null()]),
})

export type LoginBody = Static<typeof LoginBody>
export type Me = Static<typeof Me>
