import { useEffect } from 'react'
import { keepPreviousData } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useListPersons } from '@/api/generated/endpoints/persons/persons'
import { useRoles } from '@/auth'
import { DataState } from '@/components/app/DataState'
import { PageHeader } from '@/components/app/PageHeader'
import { DataTable } from '@/components/app/list/DataTable'
import { ListSkeleton } from '@/components/app/list/ListSkeleton'
import { Pagination } from '@/components/app/list/Pagination'
import { SearchInput } from '@/components/app/list/SearchInput'
import { useListState } from '@/components/app/list/listState'
import { Button } from '@/components/ui/button'
import { canWrite, getResource } from '@/manifest'

const persons = getResource('persons')

export function PersonsListPage() {
  const { t } = useTranslation()
  const roles = useRoles()
  const { state, apiParams, setPage, setSize, setSort, setQuery, clampPage } = useListState(persons)
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
      <div className="mb-4">
        <SearchInput value={state.q} onChange={setQuery} />
      </div>
      <DataState
        isLoading={query.isPending}
        isError={query.isError}
        onRetry={() => void query.refetch()}
        isEmpty={page?.totalElements === 0}
        loading={<ListSkeleton />}
        empty={state.q ? t('common.list.noResults', { q: state.q }) : t('persons.empty')}
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
