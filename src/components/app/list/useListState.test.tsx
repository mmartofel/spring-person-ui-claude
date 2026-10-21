import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { getResource } from '@/manifest'
import { useListState } from './listState'

const persons = getResource('persons')

function setup(url: string) {
  let router: ReturnType<typeof createMemoryRouter> | undefined
  const wrapper = ({ children }: { children: ReactNode }) => {
    router ??= createMemoryRouter([{ path: '/persons', element: children }], { initialEntries: [url] })
    return <RouterProvider router={router} />
  }
  const hook = renderHook(() => useListState(persons), { wrapper })
  // Param order is not part of the contract; compare as a map.
  return { hook, search: () => Object.fromEntries(new URLSearchParams(router!.state.location.search)) }
}

describe('useListState', () => {
  it('resets to the first page when the search, sort or page size changes', () => {
    const { hook, search } = setup('/persons?page=3')
    act(() => hook.result.current.setQuery(' nowak '))
    expect(search()).toEqual({ q: 'nowak' })

    act(() => hook.result.current.setPage(2))
    act(() => hook.result.current.setSort({ field: 'email', direction: 'desc' }))
    expect(search()).toEqual({ sort: 'email,desc', q: 'nowak' })

    act(() => hook.result.current.setPage(1))
    act(() => hook.result.current.setSize(50))
    expect(search()).toEqual({ size: '50', sort: 'email,desc', q: 'nowak' })
  })
})
