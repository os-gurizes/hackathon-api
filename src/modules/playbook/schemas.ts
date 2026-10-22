import { Type, type Static } from 'typebox'

import { Literal, Literals, Nullable, Side } from '../../shared/schema.js'

export const MAX_SHAPES = 2000
export const MAX_BODY_BYTES = 256 * 1024

const Coordinate = Type.Number({ minimum: -0.1, maximum: 1.1 })
export const Point = Type.Object({ x: Coordinate, y: Coordinate })
const Color = Type.String({ pattern: '^#[0-9a-fA-F]{6}$' })
const ShapeId = Type.String({ minLength: 1, maxLength: 64 })

export const Shape = Type.Union([
  Type.Object({
    id: ShapeId,
    kind: Literal('path'),
    points: Type.Array(Point, { minItems: 2, maxItems: 2000 }),
    color: Color,
    width: Type.Number({ minimum: 0.5, maximum: 20 }),
  }),
  Type.Object({ id: ShapeId, kind: Literal('arrow'), from: Point, to: Point, color: Color }),
  Type.Object({
    id: ShapeId,
    kind: Literal('marker'),
    at: Point,
    agentId: Nullable(Type.Integer({ minimum: 1 })),
    label: Type.String({ maxLength: 40 }),
  }),
  Type.Object({
    id: ShapeId,
    kind: Literal('area'),
    points: Type.Array(Point, { minItems: 3, maxItems: 500 }),
    color: Color,
    opacity: Type.Number({ minimum: 0, maximum: 1 }),
  }),
  Type.Object({
    id: ShapeId,
    kind: Literal('text'),
    at: Point,
    text: Type.String({ minLength: 1, maxLength: 200 }),
  }),
])

export const DrawingLayer = Type.Object({
  id: Type.String({ minLength: 1, maxLength: 64 }),
  name: Type.String({ minLength: 1, maxLength: 60 }),
  phase: Literals(['setup', 'execute', 'post_plant', 'retake']),
  visible: Type.Boolean({ default: true }),
  shapes: Type.Array(Shape, { maxItems: MAX_SHAPES }),
})

export const StrategyInput = Type.Object({
  mapId: Type.Integer({ minimum: 1 }),
  side: Side,
  title: Type.String({ minLength: 1, maxLength: 120 }),
  notes: Type.String({ maxLength: 5000, default: '' }),
  layers: Type.Array(DrawingLayer, { maxItems: 12 }),
  linkedClusterId: Nullable(Type.Integer({ minimum: 1 })),
  sharedWithPlayers: Type.Boolean({ default: false }),
})

export const PlaybookStrategy = Type.Object({
  id: Type.Integer(),
  teamId: Type.Integer(),
  ...StrategyInput.properties,
  updatedAt: Type.String({ format: 'date-time' }),
})

export const PlaybookSummary = Type.Object({
  id: Type.Integer(),
  teamId: Type.Integer(),
  mapId: Type.Integer(),
  side: Side,
  title: Type.String(),
  sharedWithPlayers: Type.Boolean(),
  linkedClusterId: Nullable(Type.Integer()),
  layers: Type.Integer(),
  shapes: Type.Integer(),
  updatedAt: Type.String({ format: 'date-time' }),
})

export const PlaybookQuery = Type.Object({
  map: Type.Optional(Type.Integer({ minimum: 1 })),
  side: Type.Optional(Side),
})

export type Shape = Static<typeof Shape>
export type DrawingLayer = Static<typeof DrawingLayer>
export type StrategyInput = Static<typeof StrategyInput>
export type PlaybookStrategy = Static<typeof PlaybookStrategy>
export type PlaybookSummary = Static<typeof PlaybookSummary>
export type PlaybookQuery = Static<typeof PlaybookQuery>
