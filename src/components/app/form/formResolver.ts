import { zodResolver } from '@hookform/resolvers/zod'
import type { FieldValues, Resolver } from 'react-hook-form'
import type { z } from 'zod'

/** Form inputs hold '' for "no value"; the API expects the field to be left out. */
export function emptyToUndefined<T extends Record<string, unknown>>(values: T): T {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value === '' ? undefined : value])) as T
}

/**
 * Validates form values with a generated Zod body schema. Empty strings become `undefined` first, so an emptied
 * optional field is omitted (PUT then clears it). Messages come from the global Zod error map.
 */
export function formResolver<TValues extends FieldValues, TBody extends FieldValues>(
  schema: z.ZodType<TBody>,
): Resolver<TValues, unknown, TBody> {
  const resolver = zodResolver(schema as never) as unknown as Resolver<TValues, unknown, TBody>
  return (values, context, options) => resolver(emptyToUndefined(values), context, options)
}

/** True when the schema rejects a missing value, i.e. the field is required. */
export function isRequired(schema: z.ZodObject, field: string): boolean {
  const fieldSchema = schema.shape[field]
  return !!fieldSchema && !fieldSchema.safeParse(undefined).success
}
