import { Type, type Static } from 'typebox'

import { Literals } from './schema.js'

export type ErrorCode = 'VALIDATION' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT' | 'INTERNAL'

const STATUS: Record<ErrorCode, number> = {
  VALIDATION: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL: 500,
}

export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message)
  }

  get status(): number {
    return STATUS[this.code]
  }
}

export const notFound = (resource: string): AppError =>
  new AppError('NOT_FOUND', `${resource} não encontrado`)
export const forbidden = (): AppError => new AppError('FORBIDDEN', 'Acesso negado')
export const unauthorized = (): AppError => new AppError('UNAUTHORIZED', 'Login necessário')

export const ErrorResponse = Type.Object({
  error: Type.Object({
    code: Literals(['VALIDATION', 'UNAUTHORIZED', 'FORBIDDEN', 'NOT_FOUND', 'CONFLICT', 'INTERNAL']),
    message: Type.String(),
  }),
})

export type ErrorResponse = Static<typeof ErrorResponse>

export function errorBody(code: ErrorCode, message: string): ErrorResponse {
  return { error: { code, message } }
}
