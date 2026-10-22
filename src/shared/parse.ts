import type { Static, TSchema } from 'typebox'
import { Value } from 'typebox/value'

export class ParseError extends Error {}

export function parseWith<T extends TSchema>(schema: T, input: unknown): Static<T> {
  const copy = typeof input === 'object' && input !== null && !Array.isArray(input) ? { ...input } : input
  const value = Value.Default(schema, Value.Convert(schema, Value.Clean(schema, Value.Clone(copy))))
  if (Value.Check(schema, value)) return value
  const details = [...Value.Errors(schema, value)].map((e) => `${e.instancePath || '/'} ${e.message}`)
  throw new ParseError(details.join('; '))
}
