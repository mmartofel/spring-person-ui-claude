import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  getGetPersonQueryKey,
  getListPersonsQueryKey,
  useCreatePerson,
  useGetPerson,
  useUpdatePerson,
} from '@/api/generated/endpoints/persons/persons'
import { CreatePersonBody, UpdatePersonBody } from '@/api/generated/endpoints/persons/persons.zod'
import { PersonCreateRequestGender, PersonCreateRequestStatus, type PersonResponse } from '@/api/generated/model'
import { DataState } from '@/components/app/DataState'
import { errorPageFor } from '@/components/app/errorPageFor'
import { ResourceForm } from '@/components/app/form/ResourceForm'
import { NotFoundPage } from '@/components/app/NotFoundPage'
import { PageHeader } from '@/components/app/PageHeader'
import { useListHref } from '@/components/app/list/listState'
import { useIdParam } from '@/lib/ids'
import { formatDisplay, getResource } from '@/manifest'

const persons = getResource('persons')
const enumValues = {
  gender: Object.values(PersonCreateRequestGender),
  status: Object.values(PersonCreateRequestStatus),
}
const UpdateFormBody = UpdatePersonBody.omit({ version: true })

/** Keeps the cache in step after a save: the detail is replaced, lists are refetched. */
function useOnSaved() {
  const queryClient = useQueryClient()
  return (saved: PersonResponse) => {
    queryClient.setQueryData(getGetPersonQueryKey(saved.id), saved)
    void queryClient.invalidateQueries({ queryKey: getListPersonsQueryKey() })
  }
}

export function PersonCreatePage() {
  const { t } = useTranslation()
  const create = useCreatePerson()
  const onSaved = useOnSaved()
  return (
    <>
      <PageHeader title={t('persons.newTitle')} />
      <ResourceForm
        resource={persons}
        schema={CreatePersonBody}
        enumValues={enumValues}
        save={(data) => create.mutateAsync({ data })}
        onSaved={onSaved}
        cancelHref={useListHref(persons)}
      />
    </>
  )
}

export function PersonEditPage() {
  const id = useIdParam()
  return id === null ? <NotFoundPage /> : <PersonEdit id={id} />
}

function PersonEdit({ id }: { id: number }) {
  const { t } = useTranslation()
  const query = useGetPerson(id)
  const update = useUpdatePerson()
  const onSaved = useOnSaved()
  return (
    errorPageFor(query.error) ?? (
      <DataState isLoading={query.isPending} isError={query.isError} onRetry={() => void query.refetch()}>
        {query.data && (
          <>
            <PageHeader title={t('persons.editTitle', { name: formatDisplay(persons.display, query.data) })} />
            <ResourceForm
              resource={persons}
              schema={UpdateFormBody}
              record={query.data}
              enumValues={enumValues}
              // PUT replaces the record: every field plus the version the user started from.
              save={(data, version) => update.mutateAsync({ id, data: { ...data, version: version! } })}
              onSaved={onSaved}
              reload={async () => (await query.refetch()).data}
              cancelHref={`${persons.route}/${id}`}
            />
          </>
        )}
      </DataState>
    )
  )
}
