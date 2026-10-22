import { useMemo } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { FlexRender, rowSortingFeature, tableFeatures, useTable, type ColumnDef, type SortingState } from '@tanstack/react-table'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { fieldLabelKey, tDynamic } from '@/i18n/dynamic'
import { cn } from '@/lib/utils'
import { formatDisplay, type ColumnManifest, type Resource } from '@/manifest'
import { formatFieldValue } from '../formatValue'
import type { ListState } from './listState'

const features = tableFeatures({
  rowSortingFeature,
  columnMeta: {} as { mobile: ColumnManifest['mobile'] },
})

type Row = object

interface DataTableProps<T extends Row> {
  resource: Resource
  rows: T[]
  sort: ListState['sort']
  onSortChange: (sort: ListState['sort']) => void
  /** Detail URL of a row (`list.rowClick: detail`). */
  getRowHref: (row: T) => string
}

/** A manifest-driven list: a sortable table from `md`, cards below it. Sorting and paging are done by the API. */
export function DataTable<T extends Row>({ resource, rows, sort, onSortChange, getRowHref }: DataTableProps<T>) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const language = i18n.resolvedLanguage ?? i18n.language

  const columns = useMemo<ColumnDef<typeof features, T>[]>(
    () =>
      resource.list.columns.map((column) => ({
        id: column.field,
        accessorFn: (row: T) => (row as Record<string, unknown>)[column.field],
        header: tDynamic(t, fieldLabelKey(resource.key, column.field)),
        cell: (ctx) =>
          formatFieldValue(resource, column.field, ctx.getValue(), t, language) || (
            <>
              <span aria-hidden className="text-muted-foreground">
                —
              </span>
              <span className="sr-only">{t('common.detail.empty')}</span>
            </>
          ),
        enableSorting: !!column.sortable,
        meta: { mobile: column.mobile },
      })),
    [resource, t, language],
  )

  const sorting: SortingState = [{ id: sort.field, desc: sort.direction === 'desc' }]
  const table = useTable({
    features,
    columns,
    data: rows,
    state: { sorting },
    manualSorting: true,
    enableMultiSort: false,
    enableSortingRemoval: false,
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater
      if (next[0]) onSortChange({ field: next[0].id, direction: next[0].desc ? 'desc' : 'asc' })
    },
  })

  const primaryFields = resource.list.columns.filter((c) => c.mobile === 'primary').map((c) => c.field)
  const secondaryFields = resource.list.columns.filter((c) => c.mobile === 'secondary').map((c) => c.field)
  const linkColumn = primaryFields[0]
  const text = (row: T, fields: string[]) =>
    fields
      .map((field) => formatFieldValue(resource, field, (row as Record<string, unknown>)[field], t, language))
      .filter(Boolean)
      .join(' ')

  return (
    <>
      <div className="hidden rounded-md border md:block">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => {
                  const sorted = header.column.getIsSorted()
                  const label = tDynamic(t, fieldLabelKey(resource.key, header.column.id))
                  return (
                    <TableHead
                      key={header.id}
                      aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined}
                    >
                      {header.column.getCanSort() ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="-ml-2 inline-flex h-9 items-center gap-1 rounded-md px-2 font-medium hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none"
                        >
                          {label}
                          {sorted === 'asc' ? (
                            <ArrowUp className="size-4" aria-hidden />
                          ) : sorted === 'desc' ? (
                            <ArrowDown className="size-4" aria-hidden />
                          ) : (
                            <ArrowUpDown className="size-4 text-muted-foreground" aria-hidden />
                          )}
                          {sorted && (
                            <span className="sr-only">
                              {sorted === 'asc' ? t('common.list.sortedAsc') : t('common.list.sortedDesc')}
                            </span>
                          )}
                        </button>
                      ) : (
                        label
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => {
              const href = getRowHref(row.original)
              return (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={(event) => {
                    // Clicks on the link itself (or with modifier keys) are handled by the browser.
                    if ((event.target as HTMLElement).closest('a') || event.metaKey || event.ctrlKey) return
                    navigate(href)
                  }}
                >
                  {row.getAllCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {cell.column.id === linkColumn ? (
                        <Link
                          to={href}
                          className="rounded-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:underline focus-visible:ring-[3px] focus-visible:ring-ring"
                        >
                          <FlexRender cell={cell} />
                        </Link>
                      ) : (
                        <FlexRender cell={cell} />
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <ul className="flex flex-col gap-2 md:hidden">
        {rows.map((row) => (
          <li key={getRowHref(row)}>
            <Link
              to={getRowHref(row)}
              className={cn(
                'block rounded-xl focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none',
              )}
            >
              <Card className="gap-1 px-4 py-3 hover:bg-accent">
                <CardContent className="px-0">
                  <div className="font-medium break-words">{formatDisplay(resource.display, row)}</div>
                  {secondaryFields.length > 0 && (
                    <div className="text-sm break-words text-muted-foreground">{text(row, secondaryFields)}</div>
                  )}
                </CardContent>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
