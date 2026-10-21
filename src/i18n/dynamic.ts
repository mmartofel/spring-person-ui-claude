import type { TFunction } from 'i18next'

/**
 * Translates a key built at runtime from the manifest (`<resource>.fields.<field>`, `enums.<Enum>.<VALUE>`),
 * which the typed `t()` cannot check. `src/i18n/locales.test.ts` checks that every manifest key exists.
 */
export function tDynamic(t: TFunction, key: string, options?: Record<string, unknown>): string {
  return (t as unknown as (key: string, options?: Record<string, unknown>) => string)(key, options)
}

export const fieldLabelKey = (resourceKey: string, field: string) => `${resourceKey}.fields.${field}`
export const enumLabelKey = (enumName: string, value: string) => `enums.${enumName}.${value}`
