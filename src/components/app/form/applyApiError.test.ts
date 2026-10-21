import i18n from 'i18next'
import { ApiError } from '@/api/fetcher'
import { applyApiError } from './applyApiError'

const fields = ['firstName', 'email']

describe('applyApiError', () => {
  it('sets known field errors and focuses the first one', () => {
    const setError = vi.fn()
    const error = new ApiError(409, 'Conflict', undefined, [{ field: 'email', message: 'already exists' }])

    expect(applyApiError(error, setError, fields, i18n.t)).toEqual({ kind: 'fields' })
    expect(setError).toHaveBeenCalledWith('email', { type: 'server', message: 'already exists' }, { shouldFocus: true })
  })

  it('reports field errors for unknown fields in the form alert', () => {
    const setError = vi.fn()
    const error = new ApiError(400, 'Bad Request', 'Validation failed', [
      { field: 'firstName', message: 'must not be blank' },
      { field: 'nickname', message: 'is too long' },
    ])

    expect(applyApiError(error, setError, fields, i18n.t)).toEqual({ kind: 'form', message: 'is too long' })
    expect(setError).toHaveBeenCalledOnce()
  })

  it('recognises a stale-version conflict', () => {
    expect(applyApiError(new ApiError(409, 'Conflict', 'changed'), vi.fn(), fields, i18n.t)).toEqual({ kind: 'stale' })
  })

  it('shows other errors in the form alert', () => {
    expect(applyApiError(new ApiError(500, 'Server Error', 'Boom'), vi.fn(), fields, i18n.t)).toEqual({
      kind: 'form',
      message: 'Boom',
    })
    expect(applyApiError(new TypeError('Failed to fetch'), vi.fn(), fields, i18n.t)).toEqual({
      kind: 'form',
      message: 'An unexpected error occurred. Try again, and if the problem persists, reload the page.',
    })
  })
})
