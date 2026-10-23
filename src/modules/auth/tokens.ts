import { createHash, randomBytes } from 'node:crypto'

import type { CookieSerializeOptions } from '@fastify/cookie'

import type { Config } from '../../config.js'
import { ACCESS_TTL_SECONDS } from '../../plugins/auth.js'

export const REFRESH_COOKIE = 'refresh_token'
export const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60

export const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex')

export const newRefreshToken = (): string => randomBytes(32).toString('base64url')

function baseCookie(config: Config): CookieSerializeOptions {
  return { httpOnly: true, sameSite: 'lax', secure: config.COOKIE_SECURE ?? config.NODE_ENV === 'production' }
}

export function accessCookie(config: Config): CookieSerializeOptions {
  return { ...baseCookie(config), path: '/', maxAge: ACCESS_TTL_SECONDS }
}

export function refreshCookie(config: Config): CookieSerializeOptions {
  return { ...baseCookie(config), path: '/auth', maxAge: REFRESH_TTL_SECONDS }
}
