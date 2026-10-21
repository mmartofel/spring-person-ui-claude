import { useTranslation } from 'react-i18next'
import { fieldLabelKey, tDynamic } from '@/i18n/dynamic'
import type { Resource } from '@/manifest'
import { formatFieldValue } from './formatValue'

/** The manifest's `detail.fields` of one record as a description list. */
export function DetailList({ resource, record }: { resource: Resource; record: object }) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage ?? i18n.language
  const values = record as Record<string, unknown>

  return (
    <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
      {resource.detail.fields.map((field) => {
        const value = formatFieldValue(resource, field, values[field], t, language)
        return (
          <div key={field} className="min-w-0">
            <dt className="text-sm text-muted-foreground">{tDynamic(t, fieldLabelKey(resource.key, field))}</dt>
            <dd className={value ? 'mt-1 break-words' : 'mt-1 text-muted-foreground italic'}>
              {value || t('common.detail.empty')}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}
