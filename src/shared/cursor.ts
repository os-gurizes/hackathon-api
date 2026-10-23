import { AppError } from './errors.js'

export type Cursor = { sortKey: number; id: number }

export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(`${cursor.sortKey}:${cursor.id}`).toString('base64url')
}

export function decodeCursor(value: string): Cursor {
  const [sortKey, id] = Buffer.from(value, 'base64url').toString().split(':').map(Number)
  if (sortKey === undefined || id === undefined || !Number.isFinite(sortKey) || !Number.isInteger(id)) {
    throw new AppError('VALIDATION', 'Cursor inválido')
  }
  return { sortKey, id }
}
