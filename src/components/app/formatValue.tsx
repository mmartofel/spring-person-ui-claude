import type { ReactNode } from 'react'
import type { TFunction } from 'i18next'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { enumLabelKey, tDynamic } from '@/i18n/dynamic'
import { formatDate, formatDateTime, formatNumber } from '@/i18n/format'
import { countryName } from '@/lib/countries'
import { fieldFormat, getResource, type Resource } from '@/manifest'

/** An embedded reference to another record, as the API returns it (`assignee: { id, label }`). */
const isReference = (value: unknown): value is { id: number; label: string } =>
  typeof value === 'object' && value !== null && 'id' in value && 'label' in value

/**
 * A record field formatted as text per the manifest (date, date-time, number, enum label, country name, a
 * reference's label or text); '' when empty.
 */
export function formatFieldValue(resource: Resource, field: string, value: unknown, t: TFunction, language: string) {
  if (value == null || value === '') return ''
  const { format, enum: enumName } = fieldFormat(resource, field)
  if (format === 'date') return formatDate(String(value), language)
  if (format === 'dateTime') return formatDateTime(String(value), language)
  if (format === 'number' && typeof value === 'number') return formatNumber(value, language)
  if (format === 'relation') return isReference(value) ? value.label : ''
  if ((format === 'enum' || format === 'badge') && enumName) return tDynamic(t, enumLabelKey(enumName, String(value)))
  if (format === 'country') return countryName(String(value), language)
  return String(value)
}

/**
 * Like `formatFieldValue`, but a `format: badge` field is a Badge in its manifest variant and a `format: relation`
 * field links to the related record (unless `link` is false, e.g. inside a card that is a link itself); '' when empty.
 */
export function renderFieldValue(
  resource: Resource,
  field: string,
  value: unknown,
  t: TFunction,
  language: string,
  { link = true }: { link?: boolean } = {},
): ReactNode {
  const text = formatFieldValue(resource, field, value, t, language)
  const { format, badge, resource: related } = fieldFormat(resource, field)
  if (!text) return text
  if (format === 'badge') return <Badge variant={badge?.[String(value)] ?? 'outline'}>{text}</Badge>
  if (format === 'relation' && link && related && isReference(value)) {
    return (
      <Link
        to={`${getResource(related).route}/${value.id}`}
        className="rounded-sm underline underline-offset-4 outline-none hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring"
      >
        {text}
      </Link>
    )
  }
  return text
}
