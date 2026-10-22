import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { FlexRender, rowSortingFeature, tableFeatures, useTable, type ColumnDef, type SortingState } from '@tanstack/react-table'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { fieldLabelKey, tDynamic } from '@/i18n/dynamic'
import { cn } from '@/lib/utils'
import { formatDisplay, getPath, type ColumnManifest, type Resource } from '@/manifest'
import { renderFieldValue } from '../formatValue'
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
  /** Detail URL of a row; the first column links to it. */
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
        accessorFn: (row: T) => getPath(row, column.field),
        header: tDynamic(t, fieldLabelKey(resource.key, column.field)),
        cell: (ctx) =>
          renderFieldValue(resource, column.field, ctx.getValue(), t, language) || (
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

  const { frameRef, overflow } = useHorizontalOverflow()
  const subtitleFields = resource.list.columns.filter((c) => c.mobile === 'subtitle').map((c) => c.field)
  const linkColumn = resource.list.columns[0]?.field
  const subtitle = (row: T) =>
    subtitleFields
      // The card is a link: no links inside it.
      .map((field) => ({ field, value: renderFieldValue(resource, field, getPath(row, field), t, language, { link: false }) }))
      .filter(({ value }) => value)

  return (
    <>
      <div ref={frameRef} className="relative hidden overflow-hidden rounded-md border md:block">
        <ScrollHint side="left" visible={overflow.left} />
        <ScrollHint side="right" visible={overflow.right} />
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
                    // The link column holds free text (a title can be long): it wraps instead of widening the table.
                    <TableCell
                      key={cell.id}
                      className={cell.column.id === linkColumn ? 'max-w-96 min-w-48 whitespace-normal break-words' : undefined}
                    >
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
                  {subtitleFields.length > 0 && (
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm break-words text-muted-foreground">
                      {subtitle(row).map(({ field, value }) => (
                        <span key={field} className="min-w-0">
                          {value}
                        </span>
                      ))}
                    </div>
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

/**
 * Which sides of the table's scroll container (`ui/table`) have more columns to scroll to. A table wider than the
 * screen scrolls inside its frame, and the fades below show that columns are out of view.
 */
function useHorizontalOverflow() {
  const frameRef = useRef<HTMLDivElement>(null)
  const [overflow, setOverflow] = useState({ left: false, right: false })

  useEffect(() => {
    const scroller = frameRef.current?.querySelector<HTMLElement>('[data-slot=table-container]')
    if (!scroller || typeof ResizeObserver === 'undefined') return
    const update = () => {
      // When the table fits, scrollLeft may still hold an old value until the browser clamps it.
      const overflows = scroller.scrollWidth - scroller.clientWidth > 1
      const left = overflows && scroller.scrollLeft > 0
      const right = overflows && scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 1
      setOverflow((prev) => (prev.left === left && prev.right === right ? prev : { left, right }))
    }
    // The observer also reports the first size, and rows changing the table's width.
    const observer = new ResizeObserver(update)
    observer.observe(scroller)
    if (scroller.firstElementChild) observer.observe(scroller.firstElementChild)
    scroller.addEventListener('scroll', update, { passive: true })
    return () => {
      observer.disconnect()
      scroller.removeEventListener('scroll', update)
    }
  }, [])

  return { frameRef, overflow }
}

/** A fade over the edge of the table where more columns are out of view; decorative, the table still scrolls. */
function ScrollHint({ side, visible }: { side: 'left' | 'right'; visible: boolean }) {
  return (
    <div
      aria-hidden
      data-slot="scroll-hint"
      data-side={side}
      className={cn(
        'pointer-events-none absolute inset-y-0 z-10 w-10 from-background to-transparent transition-opacity',
        side === 'right' ? 'right-0 bg-linear-to-l' : 'left-0 bg-linear-to-r',
        visible ? 'opacity-100' : 'opacity-0',
      )}
    />
  )
}
