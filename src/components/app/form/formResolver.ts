import { zodResolver } from '@hookform/resolvers/zod'
import type { FieldValues, Resolver } from 'react-hook-form'
import type { z } from 'zod'

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Form inputs hold '' for "no value"; the API expects the field to be left out. Applies to nested objects too,
 * and a nested object with no values left is left out as a whole.
 */
export function emptyToUndefined<T extends Record<string, unknown>>(values: T): T {
  const entries = Object.entries(values).map(([key, value]) => {
    if (value === '') return [key, undefined]
    if (isPlainObject(value)) {
      const nested = emptyToUndefined(value)
      return [key, Object.values(nested).some((v) => v !== undefined) ? nested : undefined]
    }
    return [key, value]
  })
  return Object.fromEntries(entries) as T
}

/** A cross-field rule: `field` must not be earlier than `notBefore` (ISO dates compare as strings). */
export interface NotBeforeRule {
  field: string
  notBefore: string
}

const valueAt = (values: unknown, path: string) =>
  path.split('.').reduce<unknown>((value, key) => (isPlainObject(value) ? value[key] : undefined), values)

/** Text inputs hold strings: number and relation (id) fields become numbers; a non-number stays text for Zod to reject. */
function toNumbers(values: Record<string, unknown>, paths: readonly string[]) {
  const result = structuredClone(values)
  for (const path of paths) {
    const keys = path.split('.')
    const parent = keys.slice(0, -1).reduce<unknown>((node, key) => (isPlainObject(node) ? node[key] : undefined), result)
    const key = keys.at(-1)!
    if (!isPlainObject(parent) || typeof parent[key] !== 'string' || parent[key] === '') continue
    const number = Number(parent[key])
    if (!Number.isNaN(number)) parent[key] = number
  }
  return result
}

interface FormResolverOptions {
  /** Cross-field rules from the manifest (`notBefore`). */
  rules?: readonly NotBeforeRule[]
  /** Paths of number and relation inputs, whose text values are sent as numbers. */
  numbers?: readonly string[]
}

/**
 * Validates form values with a generated Zod body schema plus the manifest's cross-field rules. Empty strings become
 * `undefined` first, so an emptied optional field is omitted (PUT then clears it). Messages come from the global Zod
 * error map; a broken `notBefore` rule has the API's code `date-range`.
 */
export function formResolver<TValues extends FieldValues, TBody extends FieldValues>(
  schema: z.ZodType<TBody>,
  { rules = [], numbers = [] }: FormResolverOptions = {},
): Resolver<TValues, unknown, TBody> {
  // `when`: run even when other fields are invalid, so every error shows at once (Zod skips refinements otherwise).
  const checked = rules.reduce<z.ZodType<TBody>>(
    (current, { field, notBefore }) =>
      current.refine(
        (body) => {
          const value = valueAt(body, field)
          const earliest = valueAt(body, notBefore)
          return !(typeof value === 'string' && typeof earliest === 'string' && value < earliest)
        },
        { path: field.split('.'), params: { code: 'date-range' }, when: () => true },
      ),
    schema,
  )
  const resolver = zodResolver(checked as never) as unknown as Resolver<TValues, unknown, TBody>
  return (values, context, options) =>
    resolver(emptyToUndefined(toNumbers(values, numbers)) as TValues, context, options)
}

type AnySchema = z.ZodType & { unwrap?: () => z.ZodType; shape?: Record<string, z.ZodType> }

/** The schema at a dot path (`address.city`), through optional and default wrappers; undefined when absent. */
function schemaAt(schema: z.ZodObject, path: string): z.ZodType | undefined {
  let current: AnySchema | undefined = schema as AnySchema
  for (const key of path.split('.')) {
    while (current?.unwrap && !current.shape) current = current.unwrap() as AnySchema
    current = current?.shape?.[key] as AnySchema | undefined
  }
  return current
}

/** True when the schema rejects a missing value at the path (and at every object above it): the field is required. */
export function isRequired(schema: z.ZodObject, path: string): boolean {
  const keys = path.split('.')
  return keys.every((_, i) => {
    const fieldSchema = schemaAt(schema, keys.slice(0, i + 1).join('.'))
    return !!fieldSchema && !fieldSchema.safeParse(undefined).success
  })
}

/** The schema's default value at the path (e.g. a contract `default: AVAILABLE`); undefined when it has none. */
export function defaultValue(schema: z.ZodObject, path: string): unknown {
  const result = schemaAt(schema, path)?.safeParse(undefined)
  return result?.success ? result.data : undefined
}

/** `min`, `max` and `step` of a number field, from the schema (the contract's minimum, maximum and multipleOf). */
export function numberLimits(schema: z.ZodObject, path: string): { min?: number; max?: number; step?: number } {
  let current = schemaAt(schema, path) as AnySchema | undefined
  while (current?.unwrap) current = current.unwrap() as AnySchema
  const number = current as
    | { minValue?: number | null; maxValue?: number | null; _zod: { def: { checks?: { _zod: { def: Record<string, unknown> } }[] } } }
    | undefined
  const finite = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : undefined)
  const multipleOf = number?._zod.def.checks?.find((check) => check._zod.def.check === 'multiple_of')?._zod.def.value
  return { min: finite(number?.minValue), max: finite(number?.maxValue), step: finite(multipleOf) }
}
