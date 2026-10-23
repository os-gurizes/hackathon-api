import { Type, type TSchema } from 'typebox'

export const Nullable = <T extends TSchema>(schema: T) => Type.Union([schema, Type.Null()])

export const Side = Type.Union([Type.Literal('attack'), Type.Literal('defense')])

export const Rate = Type.Number({ minimum: 0, maximum: 1 })

export const Paginated = <T extends TSchema>(item: T) =>
  Type.Object({ items: Type.Array(item), nextCursor: Nullable(Type.String()) })

export const PageQuery = {
  cursor: Type.Optional(Type.String({ pattern: '^[A-Za-z0-9_-]+$', maxLength: 100 })),
  limit: Type.Integer({ minimum: 1, maximum: 100, default: 20 }),
}

export const TeamRef = Type.Object({ id: Type.Integer(), slug: Type.String(), displayName: Type.String() })
export const PlayerRef = Type.Object({ id: Type.Integer(), gameName: Type.String(), tagLine: Type.String() })
export const MapRef = Type.Object({ id: Type.Integer(), slug: Type.String(), name: Type.String() })
export const AgentRef = Type.Object({
  id: Type.Integer(),
  name: Type.String(),
  role: Nullable(Type.String()),
})
