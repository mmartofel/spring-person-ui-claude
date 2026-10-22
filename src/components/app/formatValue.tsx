import type { ReactNode } from 'react'
import type { TFunction } from 'i18next'
import { Badge } from '@/components/ui/badge'
import { enumLabelKey, tDynamic } from '@/i18n/dynamic'
import { formatDate } from '@/i18n/format'
import { countryName } from '@/lib/countries'
import { fieldFormat, type Resource } from '@/manifest'

/** A record field formatted as text per the manifest (date, enum label, country name or text); '' when empty. */
export function formatFieldValue(resource: Resource, field: string, value: unknown, t: TFunction, language: string) {
  if (value == null || value === '') return ''
  const { format, enum: enumName } = fieldFormat(resource, field)
  if (format === 'date') return formatDate(String(value), language)
  if ((format === 'enum' || format === 'badge') && enumName) return tDynamic(t, enumLabelKey(enumName, String(value)))
  if (format === 'country') return countryName(String(value), language)
  return String(value)
}

/** Like `formatFieldValue`, but a `format: badge` field is a Badge in its manifest variant; '' when empty. */
export function renderFieldValue(
  resource: Resource,
  field: string,
  value: unknown,
  t: TFunction,
  language: string,
): ReactNode {
  const text = formatFieldValue(resource, field, value, t, language)
  const { format, badge } = fieldFormat(resource, field)
  if (!text || format !== 'badge') return text
  return <Badge variant={badge?.[String(value)] ?? 'outline'}>{text}</Badge>
}
