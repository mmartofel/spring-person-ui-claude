import i18n from 'i18next'
import { ApiError } from '@/api/fetcher'
import type { FieldErrorCode } from '@/api/generated/model'
import { applyApiError, retranslateServerError } from './applyApiError'

const fields = ['firstName', 'email']

describe('applyApiError', () => {
  it('sets known field errors and focuses the first one', () => {
    const setError = vi.fn()
    const error = new ApiError(409, 'Conflict', undefined, [{ field: 'email', code: 'unique', message: 'already in use' }])

    expect(applyApiError(error, setError, fields, i18n.t)).toEqual({ kind: 'fields' })
    expect(setError).toHaveBeenCalledWith(
      'email',
      { type: 'server:unique', message: 'This value is already in use.' },
      { shouldFocus: true },
    )
  })

  it('translates the error code into the current language', async () => {
    const setError = vi.fn()
    const error = new ApiError(400, 'Bad Request', undefined, [{ field: 'firstName', code: 'past', message: 'must be a past date' }])
    await i18n.changeLanguage('pl')
    try {
      applyApiError(error, setError, fields, i18n.t)
    } finally {
      await i18n.changeLanguage('en')
    }
    expect(setError.mock.calls[0][1]).toEqual({ type: 'server:past', message: 'Podaj datę z przeszłości.' })
  })

  it('keeps the server message for an error code the UI does not know', () => {
    const setError = vi.fn()
    const error = new ApiError(400, 'Bad Request', undefined, [
      { field: 'email', code: 'brandNew' as FieldErrorCode, message: 'is odd' },
    ])

    applyApiError(error, setError, fields, i18n.t)
    expect(setError.mock.calls[0][1]).toEqual({ type: 'server:brandNew', message: 'is odd' })
  })

  it('reports field errors for unknown fields in the form alert', () => {
    const setError = vi.fn()
    const error = new ApiError(400, 'Bad Request', 'Validation failed', [
      { field: 'firstName', code: 'required', message: 'must not be blank' },
      { field: 'nickname', code: 'invalid', message: 'is too long' },
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

describe('retranslateServerError', () => {
  it('translates a server error again in the new language and keeps the message of an unknown code', async () => {
    await i18n.changeLanguage('pl')
    try {
      expect(retranslateServerError(i18n.t, { type: 'server:unique', message: 'This value is already in use.' })).toEqual({
        type: 'server:unique',
        message: 'Ta wartość jest już zajęta.',
      })
      expect(retranslateServerError(i18n.t, { type: 'server:brandNew', message: 'is odd' })).toEqual({
        type: 'server:brandNew',
        message: 'is odd',
      })
    } finally {
      await i18n.changeLanguage('en')
    }
  })

  it('leaves client validation errors to re-validation', () => {
    expect(retranslateServerError(i18n.t, { type: 'too_small', message: 'This field is required.' })).toBeUndefined()
  })
})
