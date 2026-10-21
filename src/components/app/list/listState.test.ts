import { getResource } from '@/manifest'
import { parseListState, toApiParams, writeListState } from './listState'

const { list } = getResource('persons')
const parse = (query: string) => parseListState(new URLSearchParams(query), list)

describe('list state in the URL', () => {
  it('uses the manifest defaults when the URL has no state', () => {
    expect(parse('')).toEqual({ page: 0, size: 20, sort: { field: 'lastName', direction: 'asc' }, q: '' })
  })

  it('parses valid values', () => {
    expect(parse('page=2&size=50&sort=email,desc&q=anna')).toEqual({
      page: 2,
      size: 50,
      sort: { field: 'email', direction: 'desc' },
      q: 'anna',
    })
  })

  it('falls back to defaults for invalid values', () => {
    expect(parse('page=-1&size=13&sort=id,asc')).toMatchObject({ page: 0, size: 20, sort: { field: 'lastName' } })
    expect(parse('page=abc&sort=email,sideways')).toMatchObject({ page: 0, sort: { field: 'lastName', direction: 'asc' } })
  })

  it('leaves defaults out of the URL and keeps unrelated params', () => {
    const params = writeListState(new URLSearchParams('tab=x'), parse('q=jan&page=1'), list)
    expect(params.toString()).toBe('tab=x&page=1&q=jan')
    expect(writeListState(new URLSearchParams(), parse(''), list).toString()).toBe('')
  })

  it('builds the API query params', () => {
    expect(toApiParams(parse('sort=email,desc&q=jan'))).toEqual({ page: 0, size: 20, sort: ['email,desc'], q: 'jan' })
    expect(toApiParams(parse(''))).not.toHaveProperty('q')
  })
})
