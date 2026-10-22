import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { getGetPersonQueryKey, getListPersonsQueryKey, useDeletePerson, useGetPerson } from '@/api/generated/endpoints/persons/persons'
import type { PersonResponse } from '@/api/generated/model'
import { isApiError } from '@/api/fetcher'
import { useRoles } from '@/auth'
import { ConfirmDialog } from '@/components/app/ConfirmDialog'
import { DataState } from '@/components/app/DataState'
import { DetailList } from '@/components/app/DetailList'
import { errorPageFor } from '@/components/app/errorPageFor'
import { NotFoundPage } from '@/components/app/NotFoundPage'
import { PageHeader } from '@/components/app/PageHeader'
import { useListHref } from '@/components/app/list/listState'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useIdParam } from '@/lib/ids'
import { canWrite, formatDisplay, getResource } from '@/manifest'

const persons = getResource('persons')

export function PersonDetailPage() {
  const id = useIdParam()
  return id === null ? <NotFoundPage /> : <PersonDetail id={id} />
}

function PersonDetail({ id }: { id: number }) {
  const query = useGetPerson(id)
  return (
    errorPageFor(query.error) ?? (
      <DataState isLoading={query.isPending} isError={query.isError} onRetry={() => void query.refetch()}>
        {query.data && <PersonDetailView person={query.data} />}
      </DataState>
    )
  )
}

function PersonDetailView({ person }: { person: PersonResponse }) {
  const { t } = useTranslation()
  const roles = useRoles()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const remove = useDeletePerson()
  const listHref = useListHref(persons)
  const name = formatDisplay(persons.display, person)

  const deleted = () => {
    queryClient.removeQueries({ queryKey: getGetPersonQueryKey(person.id) })
    void queryClient.invalidateQueries({ queryKey: getListPersonsQueryKey() })
    toast.success(t('common.toast.deleted', { name }))
    navigate(listHref, { replace: true })
  }

  const onDelete = () =>
    remove.mutate(
      { id: person.id },
      {
        onSuccess: deleted,
        onError: (error) => {
          // Someone else already deleted it: the outcome the user wanted.
          if (isApiError(error) && error.status === 404) return deleted()
          setConfirmOpen(false)
          // Still referenced by other records (409 `in-use`): say why.
          const inUse = isApiError(error) && error.errors.some((e) => e.code === 'in-use')
          toast.error(t('common.toast.deleteFailed', { name }), {
            description: inUse ? t('common.validation.in-use') : undefined,
          })
        },
      },
    )

  return (
    <>
      <Button asChild variant="link" className="mb-2 -ml-3 text-muted-foreground">
        <Link to={listHref}>
          <ArrowLeft aria-hidden />
          {t('common.actions.backToList')}
        </Link>
      </Button>
      <PageHeader
        title={name}
        actions={
          canWrite(roles, persons) && (
            <>
              <Button asChild variant="outline">
                <Link to={`${persons.route}/${person.id}/edit`}>
                  <Pencil aria-hidden />
                  {t('common.actions.edit')}
                </Link>
              </Button>
              <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
                <Trash2 aria-hidden />
                {t('common.actions.delete')}
              </Button>
            </>
          )
        }
      />
      <Card>
        <CardContent>
          <DetailList resource={persons} record={person} />
        </CardContent>
      </Card>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t('common.delete.title', { name })}
        description={t('common.delete.text')}
        confirmLabel={t('common.actions.delete')}
        destructive
        pending={remove.isPending}
        onConfirm={onDelete}
      />
    </>
  )
}
