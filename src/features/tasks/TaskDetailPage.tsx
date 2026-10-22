import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { getGetTaskQueryKey, getListTasksQueryKey, useDeleteTask, useGetTask } from '@/api/generated/endpoints/tasks/tasks'
import type { TaskResponse } from '@/api/generated/model'
import { isApiError } from '@/api/fetcher'
import { useRoles } from '@/auth'
import { ConfirmDialog } from '@/components/app/ConfirmDialog'
import { DataState } from '@/components/app/DataState'
import { toastDeleteError } from '@/components/app/deleteError'
import { DetailList } from '@/components/app/DetailList'
import { errorPageFor } from '@/components/app/errorPageFor'
import { NotFoundPage } from '@/components/app/NotFoundPage'
import { PageHeader } from '@/components/app/PageHeader'
import { RelatedLists } from '@/components/app/RelatedList'
import { useListHref } from '@/components/app/list/listState'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useIdParam } from '@/lib/ids'
import { canWrite, formatDisplay, getResource } from '@/manifest'

const tasks = getResource('tasks')

export function TaskDetailPage() {
  const id = useIdParam()
  return id === null ? <NotFoundPage /> : <TaskDetail id={id} />
}

function TaskDetail({ id }: { id: number }) {
  const query = useGetTask(id)
  return (
    errorPageFor(query.error) ?? (
      <DataState isLoading={query.isPending} isError={query.isError} onRetry={() => void query.refetch()}>
        {query.data && <TaskDetailView task={query.data} />}
      </DataState>
    )
  )
}

function TaskDetailView({ task }: { task: TaskResponse }) {
  const { t } = useTranslation()
  const roles = useRoles()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const remove = useDeleteTask()
  const listHref = useListHref(tasks)
  const name = formatDisplay(tasks.display, task)

  const deleted = () => {
    queryClient.removeQueries({ queryKey: getGetTaskQueryKey(task.id) })
    void queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() })
    toast.success(t('common.toast.deleted', { name }))
    navigate(listHref, { replace: true })
  }

  const onDelete = () =>
    remove.mutate(
      { id: task.id },
      {
        onSuccess: deleted,
        onError: (error) => {
          // Someone else already deleted it: the outcome the user wanted.
          if (isApiError(error) && error.status === 404) return deleted()
          setConfirmOpen(false)
          toastDeleteError(t, error, name)
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
          canWrite(roles, tasks) && (
            <>
              <Button asChild variant="outline">
                <Link to={`${tasks.route}/${task.id}/edit`}>
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
          <DetailList resource={tasks} record={task} />
        </CardContent>
      </Card>
      <RelatedLists resource={tasks} id={task.id} />
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
