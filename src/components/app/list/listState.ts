import { useCallback, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import type { z } from 'zod'
import { COUNTRY_CODES } from '@/lib/countries'
import type { Resource } from '@/manifest'

export type SortDirection = 'asc' | 'desc'

export interface ListState {
  page: number
  size: number
  sort: { field: string; direction: SortDirection }
  q: string
  /** The manifest's list filters that are set, by query param name. */
  filters: Record<string, string>
}

type ListManifest = Resource['list']

/** The generated query params schema of the list endpoint (e.g. `ListPersonsQueryParams`). */
export type QuerySchema = z.ZodObject

/** Filter values from the URL; a value the contract rejects (old link, typo) is dropped instead of failing with 400. */
function parseFilters(params: URLSearchParams, list: ListManifest, schema?: QuerySchema): Record<string, string> {
  const filters: Record<string, string> = {}
  for (const { param, input } of list.filters ?? []) {
    const value = params.get(param)?.trim()
    const valid =
      (!schema?.shape[param] || schema.shape[param].safeParse(value).success) &&
      (input !== 'country' || (COUNTRY_CODES as readonly string[]).includes(value ?? ''))
    if (value && valid) filters[param] = value
  }
  return filters
}

function parseSort(value: string | null, list: ListManifest): ListState['sort'] | undefined {
  const [field, direction] = (value ?? '').split(',')
  const sortable = list.columns.some((c) => c.field === field && c.sortable)
  return sortable && (direction === 'asc' || direction === 'desc') ? { field, direction } : undefined
}

/** Reads list state from URL search params; anything missing or invalid falls back to the manifest defaults. */
export function parseListState(params: URLSearchParams, list: ListManifest, schema?: QuerySchema): ListState {
  const page = Number(params.get('page'))
  const size = Number(params.get('size'))
  return {
    page: Number.isInteger(page) && page > 0 ? page : 0,
    size: list.pageSizes.includes(size) ? size : list.pageSize,
    sort: parseSort(params.get('sort'), list) ?? parseSort(list.defaultSort, list)!,
    q: params.get('q')?.trim() ?? '',
    filters: parseFilters(params, list, schema),
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
  for (const { param } of list.filters ?? []) set(param, state.filters[param] ?? '', !state.filters[param])
  return next
}

/** Query params for a paged list endpoint (`page`, `size`, `sort=field,dir`, `q` and the set filters). */
export function toApiParams(state: ListState) {
  return {
    page: state.page,
    size: state.size,
    sort: [`${state.sort.field},${state.sort.direction}`],
    ...(state.q ? { q: state.q } : {}),
    ...state.filters,
  }
}

/**
 * List state (page, size, sort, q, filters) kept in the URL so it survives reload and back navigation.
 * Changing the search, a filter, sort or page size goes back to the first page.
 * `schema` (the generated query params schema) validates filter values from the URL.
 */
export function useListState(resource: Resource, schema?: QuerySchema) {
  const [params, setParams] = useSearchParams()
  const { list } = resource
  const state = useMemo(() => parseListState(params, list, schema), [params, list, schema])

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
          const current = parseListState(prev, list, schema)
          const resetPage = 'q' in changes || 'sort' in changes || 'size' in changes || 'filters' in changes
          // Filter changes are merged into the filters in the URL; '' clears one.
          const filters = { ...current.filters, ...changes.filters }
          return writeListState(prev, { ...current, ...(resetPage ? { page: 0 } : {}), ...changes, filters }, list)
        },
        { replace: options?.replace },
      ),
    [list, schema, setParams],
  )

  return {
    state,
    apiParams: useMemo(() => toApiParams(state), [state]),
    setPage: useCallback((page: number) => update({ page }), [update]),
    setSize: useCallback((size: number) => update({ size }), [update]),
    setSort: useCallback((sort: ListState['sort']) => update({ sort }), [update]),
    // Typing must not flood the history: search changes replace the current entry.
    setQuery: useCallback((q: string) => update({ q: q.trim() }, { replace: true }), [update]),
    /** Sets one filter; '' clears it. */
    setFilter: useCallback((param: string, value: string) => update({ filters: { [param]: value } }), [update]),
    clearFilters: useCallback(
      () => update({ filters: Object.fromEntries((list.filters ?? []).map(({ param }) => [param, ''])) }),
      [list, update],
    ),
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
