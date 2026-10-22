import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { fieldLabelKey, groupLabelKey, tDynamic } from '@/i18n/dynamic'
import { getPath, objectFields, type Resource } from '@/manifest'
import { renderFieldValue } from './formatValue'

/**
 * The manifest's `detail.fields` of one record as a description list. A nested object (a field with a form
 * fieldset) is one block: its label, then its sub-fields as a nested list.
 */
export function DetailList({ resource, record }: { resource: Resource; record: object }) {
  const { t } = useTranslation()

  return (
    <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
      {resource.detail.fields.map((field) => {
        const subFields = objectFields(resource, field)
        if (!subFields) return <DetailItem key={field} resource={resource} record={record} path={field} />
        const label = tDynamic(t, groupLabelKey(resource.key, field))
        // An object without any value is one "Not provided", not one per sub-field.
        const isEmpty = subFields.every((subField) => getPath(record, `${field}.${subField}`) == null)
        if (isEmpty) return <DetailEntry key={field} label={label} value="" />
        return (
          <div key={field} className="min-w-0 sm:col-span-2">
            <dt className="text-sm font-medium">{label}</dt>
            <dd className="mt-2">
              <dl className="grid gap-x-8 gap-y-5 border-l-2 pl-4 sm:grid-cols-2">
                {subFields.map((subField) => (
                  <DetailItem key={subField} resource={resource} record={record} path={`${field}.${subField}`} />
                ))}
              </dl>
            </dd>
          </div>
        )
      })}
    </dl>
  )
}

function DetailItem({ resource, record, path }: { resource: Resource; record: object; path: string }) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage ?? i18n.language
  const value = renderFieldValue(resource, path, getPath(record, path), t, language)
  return <DetailEntry label={tDynamic(t, fieldLabelKey(resource.key, path))} value={value} />
}

function DetailEntry({ label, value }: { label: string; value: ReactNode }) {
  const { t } = useTranslation()
  return (
    <div className="min-w-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      {/* pre-line keeps the line breaks of long text (a textarea's value). */}
      <dd className={value ? 'mt-1 break-words whitespace-pre-line' : 'mt-1 text-muted-foreground italic'}>
        {value || t('common.detail.empty')}
      </dd>
    </div>
  )
}
