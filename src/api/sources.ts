// The generated list/get functions of each resource, by manifest key, for generic components that read another
// resource: relation inputs and filters, embedded links and related lists. One line per resource.
import { getListPersonsQueryKey, getPerson, listPersons } from '@/api/generated/endpoints/persons/persons'
import { getListTasksQueryKey, getTask, listTasks } from '@/api/generated/endpoints/tasks/tasks'
import type { ResourceKey } from '@/manifest'

/** A record as generic code sees it: an id and fields read through the manifest. */
export type AnyRecord = { id: number } & object

export interface ResourceSource {
  /** The paged list endpoint (`q`, `page`, `size`, `sort` and the resource's filters). */
  list: (params: Record<string, unknown>) => Promise<{ content?: AnyRecord[]; page?: { totalElements?: number } }>
  get: (id: number) => Promise<AnyRecord>
  /** orval's list query key, so invalidating a resource's lists also refreshes these queries. */
  listKey: (params: Record<string, unknown>) => readonly unknown[]
}

export const sources: Record<ResourceKey, ResourceSource> = {
  persons: { list: listPersons, get: getPerson, listKey: getListPersonsQueryKey },
  tasks: { list: listTasks, get: getTask, listKey: getListTasksQueryKey },
}
