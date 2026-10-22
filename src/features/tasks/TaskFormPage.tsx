import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  getGetTaskQueryKey,
  getListTasksQueryKey,
  useCreateTask,
  useGetTask,
  useUpdateTask,
} from '@/api/generated/endpoints/tasks/tasks'
import { CreateTaskBody, UpdateTaskBody } from '@/api/generated/endpoints/tasks/tasks.zod'
import { TaskCreateRequestPriority, type TaskResponse } from '@/api/generated/model'
import { DataState } from '@/components/app/DataState'
import { errorPageFor } from '@/components/app/errorPageFor'
import { ResourceForm } from '@/components/app/form/ResourceForm'
import { NotFoundPage } from '@/components/app/NotFoundPage'
import { PageHeader } from '@/components/app/PageHeader'
import { useListHref } from '@/components/app/list/listState'
import { useIdParam } from '@/lib/ids'
import { formatDisplay, getResource } from '@/manifest'

const tasks = getResource('tasks')
const enumValues = { priority: Object.values(TaskCreateRequestPriority) }
const UpdateFormBody = UpdateTaskBody.omit({ version: true })

/** Keeps the cache in step after a save: the detail is replaced, lists are refetched. */
function useOnSaved() {
  const queryClient = useQueryClient()
  return (saved: TaskResponse) => {
    queryClient.setQueryData(getGetTaskQueryKey(saved.id), saved)
    void queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() })
  }
}

export function TaskCreatePage() {
  const { t } = useTranslation()
  const create = useCreateTask()
  const onSaved = useOnSaved()
  return (
    <>
      <PageHeader title={t('tasks.newTitle')} />
      <ResourceForm
        resource={tasks}
        schema={CreateTaskBody}
        enumValues={enumValues}
        save={(data) => create.mutateAsync({ data })}
        onSaved={onSaved}
        cancelHref={useListHref(tasks)}
      />
    </>
  )
}

export function TaskEditPage() {
  const id = useIdParam()
  return id === null ? <NotFoundPage /> : <TaskEdit id={id} />
}

function TaskEdit({ id }: { id: number }) {
  const { t } = useTranslation()
  const query = useGetTask(id)
  const update = useUpdateTask()
  const onSaved = useOnSaved()
  return (
    errorPageFor(query.error) ?? (
      <DataState isLoading={query.isPending} isError={query.isError} onRetry={() => void query.refetch()}>
        {query.data && (
          <>
            <PageHeader title={t('tasks.editTitle', { name: formatDisplay(tasks.display, query.data) })} />
            <ResourceForm
              resource={tasks}
              schema={UpdateFormBody}
              record={query.data}
              enumValues={enumValues}
              // PUT replaces the record: every field plus the version the user started from.
              save={(data, version) => update.mutateAsync({ id, data: { ...data, version: version! } })}
              onSaved={onSaved}
              reload={async () => (await query.refetch()).data}
              cancelHref={`${tasks.route}/${id}`}
            />
          </>
        )}
      </DataState>
    )
  )
}
