import type { TFunction } from 'i18next'
import { enumLabelKey, tDynamic } from '@/i18n/dynamic'
import { formatDate } from '@/i18n/format'
import { fieldFormat, type Resource } from '@/manifest'

/** A record field formatted for display per the manifest (date, enum label or text); '' when empty. */
export function formatFieldValue(resource: Resource, field: string, value: unknown, t: TFunction, language: string) {
  if (value == null || value === '') return ''
  const { format, enum: enumName } = fieldFormat(resource, field)
  if (format === 'date') return formatDate(String(value), language)
  if (format === 'enum' && enumName) return tDynamic(t, enumLabelKey(enumName, String(value)))
  return String(value)
}
