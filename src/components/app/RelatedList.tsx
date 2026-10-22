import { useQuery } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { sources } from '@/api/sources'
import { useRoles } from '@/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { canRead, formatDisplay, getPath, getResource, type RelatedManifest, type Resource } from '@/manifest'
import { DataState } from './DataState'
import { renderFieldValue } from './formatValue'

/** The manifest's `detail.related` of one record: a card per related resource the user can read. */
export function RelatedLists({ resource, id }: { resource: Resource; id: number }) {
  const roles = useRoles()
  const related = (resource.detail.related ?? []).filter((r) => canRead(roles, getResource(r.resource)))
  return related.map((entry) => <RelatedList key={`${entry.resource}-${entry.filter}`} entry={entry} id={id} />)
}

/** Up to `limit` records of another resource filtered by this record's id, with a link to the filtered list. */
function RelatedList({ entry, id }: { entry: RelatedManifest; id: number }) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage ?? i18n.language
  const related = getResource(entry.resource)
  const source = sources[entry.resource]
  const params = { [entry.filter]: id, size: entry.limit, sort: [related.list.defaultSort] }
  const query = useQuery({ queryKey: source.listKey(params), queryFn: () => source.list(params) })
  const rows = query.data?.content ?? []
  const total = query.data?.page?.totalElements ?? 0
  const subtitleFields = related.list.columns.filter((c) => c.mobile === 'subtitle').map((c) => c.field)
  const title = t(`${entry.resource}.title`)

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>
          <h2>{query.data ? t('common.detail.related', { title, count: total }) : title}</h2>
        </CardTitle>
        {total > 0 && (
          <Button asChild variant="link" className="-mr-3">
            <Link to={`${related.route}?${entry.filter}=${id}`}>
              {t('common.detail.showAll')}
              <span className="sr-only">: {title}</span>
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <DataState
          isLoading={query.isPending}
          isError={query.isError}
          onRetry={() => void query.refetch()}
          isEmpty={total === 0}
          loading={<Skeleton className="h-11 w-full" />}
          empty={t('common.detail.noRelated')}
        >
          <ul className="flex flex-col divide-y">
            {rows.map((row) => (
              <li key={row.id}>
                <Link
                  to={`${related.route}/${row.id}`}
                  className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 rounded-sm py-2 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring"
                >
                  <span className="font-medium break-words">{formatDisplay(related.display, row)}</span>
                  {subtitleFields.map((field) => (
                    <span key={field} className="text-sm text-muted-foreground">
                      {renderFieldValue(related, field, getPath(row, field), t, language, { link: false })}
                    </span>
                  ))}
                </Link>
              </li>
            ))}
          </ul>
        </DataState>
      </CardContent>
    </Card>
  )
}
