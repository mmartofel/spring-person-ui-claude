import { useEffect, useRef } from 'react'
import { keepPreviousData } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useListPersons } from '@/api/generated/endpoints/persons/persons'
import { ListPersonsQueryParams } from '@/api/generated/endpoints/persons/persons.zod'
import { ListPersonsStatus } from '@/api/generated/model'
import { useRoles } from '@/auth'
import { DataState } from '@/components/app/DataState'
import { PageHeader } from '@/components/app/PageHeader'
import { DataTable } from '@/components/app/list/DataTable'
import { ListFilters } from '@/components/app/list/ListFilters'
import { ListSkeleton } from '@/components/app/list/ListSkeleton'
import { Pagination } from '@/components/app/list/Pagination'
import { SearchInput } from '@/components/app/list/SearchInput'
import { useListState } from '@/components/app/list/listState'
import { Button } from '@/components/ui/button'
import { canWrite, getResource } from '@/manifest'

const persons = getResource('persons')
const filterValues = { status: Object.values(ListPersonsStatus) }

export function PersonsListPage() {
  const { t } = useTranslation()
  const roles = useRoles()
  const { state, apiParams, setPage, setSize, setSort, setQuery, setFilter, clearFilters, clampPage } = useListState(
    persons,
    ListPersonsQueryParams,
  )
  const filtered = Object.keys(state.filters).length > 0
  const toolbarRef = useRef<HTMLDivElement>(null)
  // The empty state's button disappears with the filters: keep keyboard focus in the toolbar (the search box).
  const clearFiltersFromEmpty = () => {
    clearFilters()
    toolbarRef.current?.querySelector<HTMLElement>('input')?.focus()
  }
  const query = useListPersons(apiParams, { query: { placeholderData: keepPreviousData } })
  const rows = query.data?.content ?? []
  const page = query.data?.page
  const totalPages = page?.totalPages ?? 0

  useEffect(() => clampPage(totalPages), [clampPage, totalPages])

  return (
    <>
      <PageHeader
        title={t('persons.title')}
        actions={
          canWrite(roles, persons) && (
            <Button asChild>
              <Link to={`${persons.route}/new`}>
                <Plus aria-hidden />
                {t('common.actions.new')}
              </Link>
            </Button>
          )
        }
      />
      <div ref={toolbarRef} className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1 md:flex-none md:basis-full">
          <SearchInput value={state.q} onChange={setQuery} />
        </div>
        <ListFilters
          resource={persons}
          values={state.filters}
          onChange={setFilter}
          onClear={clearFilters}
          enumValues={filterValues}
        />
      </div>
      <DataState
        isLoading={query.isPending}
        isError={query.isError}
        onRetry={() => void query.refetch()}
        isEmpty={page?.totalElements === 0}
        loading={<ListSkeleton />}
        empty={
          filtered ? (
            <div className="flex flex-col items-center gap-2">
              {t('common.list.noFilterResults')}
              <Button variant="outline" size="sm" onClick={clearFiltersFromEmpty}>
                {t('common.list.clearFilters')}
              </Button>
            </div>
          ) : state.q ? (
            t('common.list.noResults', { q: state.q })
          ) : (
            t('persons.empty')
          )
        }
      >
        <div
          className="flex flex-col gap-4 transition-opacity aria-busy:opacity-60"
          aria-busy={query.isPlaceholderData}
        >
          <DataTable
            resource={persons}
            rows={rows}
            sort={state.sort}
            onSortChange={setSort}
            getRowHref={(person) => `${persons.route}/${person.id}`}
          />
          <Pagination
            page={state.page}
            size={state.size}
            pageSizes={persons.list.pageSizes}
            totalElements={page?.totalElements ?? 0}
            totalPages={totalPages}
            onPageChange={setPage}
            onSizeChange={setSize}
          />
        </div>
      </DataState>
    </>
  )
}
