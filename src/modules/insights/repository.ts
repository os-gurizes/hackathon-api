import { sql } from 'drizzle-orm'

import type { Database } from '../../db/client.js'
import { pick, roundRefs } from '../../shared/rounds.js'
import { rows, where } from '../../shared/sql.js'
import type { Insight, InsightsQuery } from './schemas.js'

export async function listInsights(db: Database, query: InsightsQuery): Promise<Insight[]> {
  const data = await rows<{
    id: number
    kind: Insight['kind']
    polarity: Insight['polarity']
    severity: number
    title: string
    body: string
    map_id: number | null
    map_slug: string | null
    map_name: string | null
    side: 'attack' | 'defense' | null
    metric_value: number | null
    baseline_value: number | null
    sample_size: number
    confidence: number
    is_estimate: boolean
    evidence: string[]
  }>(
    db,
    sql`SELECT i.id, i.kind, i.polarity, i.severity, i.title, i.body, mp.id AS map_id, mp.slug AS map_slug,
               mp.name AS map_name, i.side, i.metric_value, i.baseline_value, i.sample_size, i.confidence,
               i.is_estimate, i.evidence_round_ids::text[] AS evidence
        FROM analytics.insights i LEFT JOIN analytics.maps mp ON mp.id = i.map_id
        WHERE ${where([
          sql`i.scope = ${query.scope}`,
          sql`i.scope_id = ${query.id}`,
          query.kind === undefined ? undefined : sql`i.kind = ${query.kind}`,
          query.map === undefined ? undefined : sql`i.map_id = ${query.map}`,
        ])}
        ORDER BY CASE i.polarity WHEN 'negative' THEN 0 WHEN 'neutral' THEN 1 ELSE 2 END,
                 i.severity DESC, i.confidence DESC, i.id`,
  )
  const refs = await roundRefs(
    db,
    data.flatMap((d) => d.evidence),
  )
  return data.map((d) => ({
    id: d.id,
    kind: d.kind,
    polarity: d.polarity,
    severity: d.severity,
    title: d.title,
    body: d.body,
    map:
      d.map_id === null || d.map_slug === null || d.map_name === null
        ? null
        : { id: d.map_id, slug: d.map_slug, name: d.map_name },
    side: d.side,
    metricValue: d.metric_value,
    baselineValue: d.baseline_value,
    sampleSize: d.sample_size,
    confidence: Math.min(1, Math.max(0, d.confidence)),
    isEstimate: d.is_estimate,
    examples: pick(refs, d.evidence),
  }))
}
