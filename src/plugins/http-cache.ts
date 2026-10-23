import { createHash } from 'node:crypto'

import fp from 'fastify-plugin'

const CACHEABLE_METHODS = new Set(['GET', 'HEAD'])

const weakTag = (payload: string | Buffer): string =>
  `W/"${createHash('sha1').update(payload).digest('base64url')}"`

export const httpCachePlugin = fp(async (app) => {
  app.addHook('onSend', async (request, reply, payload) => {
    if (!CACHEABLE_METHODS.has(request.method) || reply.statusCode !== 200) return payload
    if (!reply.hasHeader('cache-control')) reply.header('cache-control', 'private, no-cache')
    if (typeof payload !== 'string' && !Buffer.isBuffer(payload)) return payload
    const tag = weakTag(payload)
    reply.header('etag', tag)
    reply.header('vary', 'Cookie')
    if (request.headers['if-none-match'] === tag) {
      reply.code(304)
      return ''
    }
    return payload
  })
})
