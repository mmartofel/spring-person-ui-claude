import { ListPersonsQueryParams } from '@/api/generated/endpoints/persons/persons.zod'
import { getResource } from '@/manifest'
import { parseListState, toApiParams, writeListState } from './listState'

const { list } = getResource('persons')
const parse = (query: string) => parseListState(new URLSearchParams(query), list)

describe('list state in the URL', () => {
  it('uses the manifest defaults when the URL has no state', () => {
    expect(parse('')).toEqual({ page: 0, size: 20, sort: { field: 'lastName', direction: 'asc' }, q: '', filters: {} })
  })

  it('parses valid values', () => {
    expect(parse('page=2&size=50&sort=email,desc&q=anna')).toEqual({
      page: 2,
      size: 50,
      sort: { field: 'email', direction: 'desc' },
      q: 'anna',
      filters: {},
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

  it('keeps the manifest filters the contract accepts and drops the others', () => {
    const state = parseListState(
      new URLSearchParams('status=AVAILABLE&countryCode=pl&availableOn=2026-02-30&other=x'),
      list,
      ListPersonsQueryParams,
    )
    expect(state.filters).toEqual({ status: 'AVAILABLE' })
    // Matches the contract pattern, but is not a country.
    expect(parseListState(new URLSearchParams('countryCode=XX'), list, ListPersonsQueryParams).filters).toEqual({})
    expect(parseListState(new URLSearchParams('countryCode=PL&availableOn=2026-10-22'), list, ListPersonsQueryParams).filters).toEqual({
      countryCode: 'PL',
      availableOn: '2026-10-22',
    })
  })

  it('writes and sends set filters only', () => {
    const state = { ...parse('q=jan'), filters: { status: 'UNAVAILABLE' } }
    expect(writeListState(new URLSearchParams('countryCode=DE'), { ...state, filters: { status: 'UNAVAILABLE', countryCode: '' } }, list).toString()).toBe(
      'q=jan&status=UNAVAILABLE',
    )
    expect(toApiParams(state)).toEqual({ page: 0, size: 20, sort: ['lastName,asc'], q: 'jan', status: 'UNAVAILABLE' })
  })

  it('builds the API query params', () => {
    expect(toApiParams(parse('sort=email,desc&q=jan'))).toEqual({ page: 0, size: 20, sort: ['email,desc'], q: 'jan' })
    expect(toApiParams(parse(''))).not.toHaveProperty('q')
  })
})
