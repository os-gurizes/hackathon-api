import { Type, type Static } from 'typebox'

import { RoundRef } from '../../shared/rounds.js'
import { Literals, MapRef, Nullable, Rate, Side } from '../../shared/schema.js'

export const InsightKind = Literals([
  'repetitive_pattern',
  'economy',
  'pressure',
  'rotation',
  'ability_estimate',
  'combo',
  'strategy',
  'agent',
  'map',
  'summary',
])

export const InsightsQuery = Type.Object({
  scope: Literals(['player', 'team']),
  id: Type.Integer({ minimum: 1 }),
  kind: Type.Optional(InsightKind),
  map: Type.Optional(Type.Integer({ minimum: 1 })),
})

export const Insight = Type.Object({
  id: Type.Integer(),
  kind: InsightKind,
  polarity: Literals(['negative', 'positive', 'neutral']),
  severity: Type.Integer({ minimum: 1, maximum: 3 }),
  title: Type.String(),
  body: Type.String(),
  map: Nullable(MapRef),
  side: Nullable(Side),
  metricValue: Nullable(Type.Number()),
  baselineValue: Nullable(Type.Number()),
  sampleSize: Type.Integer(),
  confidence: Rate,
  isEstimate: Type.Boolean(),
  examples: Type.Array(RoundRef),
})

export type InsightsQuery = Static<typeof InsightsQuery>
export type Insight = Static<typeof Insight>
