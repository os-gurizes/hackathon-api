import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { desc } from 'drizzle-orm'
import { Type } from 'typebox'

import { ingestRuns } from '../../db/analytics/schema.js'
import { Literal } from '../../shared/schema.js'

const HealthResponse = Type.Object({
  status: Literal('ok'),
  pipelineVersion: Type.Union([Type.String(), Type.Null()]),
  lastIngestAt: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
})

export const healthRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.get('/health', { schema: { tags: ['health'], response: { 200: HealthResponse } } }, async () => {
    const [run] = await app.db
      .select({ version: ingestRuns.pipelineVersion, finishedAt: ingestRuns.finishedAt })
      .from(ingestRuns)
      .orderBy(desc(ingestRuns.id))
      .limit(1)
    return {
      status: 'ok' as const,
      pipelineVersion: run?.version ?? null,
      lastIngestAt: run?.finishedAt ? new Date(run.finishedAt).toISOString() : null,
    }
  })
}
