import { useCallback, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import type { Resource } from '@/manifest'

export type SortDirection = 'asc' | 'desc'

export interface ListState {
  page: number
  size: number
  sort: { field: string; direction: SortDirection }
  q: string
}

type ListManifest = Resource['list']

function parseSort(value: string | null, list: ListManifest): ListState['sort'] | undefined {
  const [field, direction] = (value ?? '').split(',')
  const sortable = list.columns.some((c) => c.field === field && c.sortable)
  return sortable && (direction === 'asc' || direction === 'desc') ? { field, direction } : undefined
}

/** Reads list state from URL search params; anything missing or invalid falls back to the manifest defaults. */
export function parseListState(params: URLSearchParams, list: ListManifest): ListState {
  const page = Number(params.get('page'))
  const size = Number(params.get('size'))
  return {
    page: Number.isInteger(page) && page > 0 ? page : 0,
    size: list.pageSizes.includes(size) ? size : list.pageSize,
    sort: parseSort(params.get('sort'), list) ?? parseSort(list.defaultSort, list)!,
    q: params.get('q')?.trim() ?? '',
  }
}

/** Writes list state into URL search params, leaving out defaults so URLs stay short. */
export function writeListState(params: URLSearchParams, state: ListState, list: ListManifest): URLSearchParams {
  const next = new URLSearchParams(params)
  const sort = `${state.sort.field},${state.sort.direction}`
  const set = (key: string, value: string, isDefault: boolean) =>
    isDefault ? next.delete(key) : next.set(key, value)
  set('page', String(state.page), state.page === 0)
  set('size', String(state.size), state.size === list.pageSize)
  set('sort', sort, sort === list.defaultSort)
  set('q', state.q, state.q === '')
  return next
}

/** Query params for a paged list endpoint (`page`, `size`, `sort=field,dir`, `q`). */
export function toApiParams(state: ListState) {
  return {
    page: state.page,
    size: state.size,
    sort: [`${state.sort.field},${state.sort.direction}`],
    ...(state.q ? { q: state.q } : {}),
  }
}

/**
 * List state (page, size, sort, q) kept in the URL so it survives reload and back navigation.
 * Changing the search, sort or page size goes back to the first page.
 */
export function useListState(resource: Resource) {
  const [params, setParams] = useSearchParams()
  const { list } = resource
  const state = useMemo(() => parseListState(params, list), [params, list])

  // Remembered so detail, form and delete can return to the list as the user left it.
  const search = writeListState(new URLSearchParams(), state, list).toString()
  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey(resource), search)
    } catch {
      // Ignore: "back to list" then opens the default list.
    }
  }, [resource, search])

  const update = useCallback(
    (changes: Partial<ListState>, options?: { replace?: boolean }) =>
      setParams(
        (prev) => {
          const current = parseListState(prev, list)
          const resetPage = 'q' in changes || 'sort' in changes || 'size' in changes
          return writeListState(prev, { ...current, ...(resetPage ? { page: 0 } : {}), ...changes }, list)
        },
        { replace: options?.replace },
      ),
    [list, setParams],
  )

  return {
    state,
    apiParams: useMemo(() => toApiParams(state), [state]),
    setPage: useCallback((page: number) => update({ page }), [update]),
    setSize: useCallback((size: number) => update({ size }), [update]),
    setSort: useCallback((sort: ListState['sort']) => update({ sort }), [update]),
    // Typing must not flood the history: search changes replace the current entry.
    setQuery: useCallback((q: string) => update({ q: q.trim() }, { replace: true }), [update]),
    /** Moves to the last page when the URL points past it (old link, records deleted elsewhere). */
    clampPage: useCallback(
      (totalPages: number) => {
        if (totalPages > 0 && state.page > totalPages - 1) update({ page: totalPages - 1 }, { replace: true })
      },
      [state.page, update],
    ),
  }
}

const storageKey = (resource: Resource) => `list:${resource.key}`

/** Link to the resource list with the page, sort, size and search the user last had. */
export function useListHref(resource: Resource): string {
  let search = ''
  try {
    search = sessionStorage.getItem(storageKey(resource)) ?? ''
  } catch {
    // Ignore: the default list.
  }
  return search ? `${resource.route}?${search}` : resource.route
}
