import { ApiError, fetcher, isApiError, setAccessTokenGetter, setUnauthorizedHandler } from './fetcher'

const fetchMock = vi.fn<typeof fetch>()

function jsonResponse(status: number, body: unknown, contentType = 'application/json') {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': contentType } })
}

async function catchError(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise
  } catch (error) {
    if (isApiError(error)) return error
    throw error
  }
  throw new Error('expected the request to fail')
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  setAccessTokenGetter(() => undefined)
  setUnauthorizedHandler(() => {})
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
})

describe('fetcher', () => {
  it('returns the parsed body and sends the bearer token', async () => {
    setAccessTokenGetter(async () => 'token-123')
    fetchMock.mockResolvedValue(jsonResponse(200, { id: 1, firstName: 'Anna' }))

    const result = await fetcher<{ id: number }>('/api/persons/1', { method: 'GET' })

    expect(result).toEqual({ id: 1, firstName: 'Anna' })
    const [url, init] = fetchMock.mock.calls[0]
    const headers = new Headers(init?.headers)
    expect(url).toBe('/api/persons/1')
    expect(headers.get('Authorization')).toBe('Bearer token-123')
    expect(headers.get('Accept')).toBe('application/json')
  })

  it('sends no Authorization header without a token and sets JSON content type for a body', async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, { id: 2 }))

    await fetcher('/api/persons', { method: 'POST', body: JSON.stringify({ firstName: 'Jan' }) })

    const headers = new Headers(fetchMock.mock.calls[0][1]?.headers)
    expect(headers.has('Authorization')).toBe(false)
    expect(headers.get('Content-Type')).toBe('application/json')
  })

  it('returns undefined for 204 No Content', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))

    await expect(fetcher('/api/persons/1', { method: 'DELETE' })).resolves.toBeUndefined()
  })

  it('throws ApiError with field errors for 400', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        400,
        {
          title: 'Bad Request',
          status: 400,
          detail: 'Validation failed',
          errors: [
            { field: 'email', code: 'email', message: 'must be a well-formed email address' },
            { field: 'firstName', message: 'must not be blank' },
          ],
        },
        'application/problem+json',
      ),
    )

    const error = await catchError(fetcher('/api/persons', { method: 'POST', body: '{}' }))

    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(400)
    expect(error.title).toBe('Bad Request')
    expect(error.detail).toBe('Validation failed')
    expect(error.errors).toEqual([
      { field: 'email', code: 'email', message: 'must be a well-formed email address' },
      // Without a code it is kept as a generic field error.
      { field: 'firstName', code: 'invalid', message: 'must not be blank' },
    ])
  })

  it('throws ApiError without field errors for a stale-version 409', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        409,
        { title: 'Conflict', status: 409, detail: 'The record was changed by someone else' },
        'application/problem+json',
      ),
    )

    const error = await catchError(fetcher('/api/persons/1', { method: 'PUT', body: '{}' }))

    expect(error.status).toBe(409)
    expect(error.errors).toEqual([])
    expect(error.message).toBe('The record was changed by someone else')
  })

  it('keeps an error about the whole record (no field, or null), e.g. in-use on delete', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        409,
        { title: 'Conflict', status: 409, detail: 'Person is assigned to tasks', errors: [{ field: null, code: 'in-use', message: 'still referenced' }] },
        'application/problem+json',
      ),
    )

    const error = await catchError(fetcher('/api/persons/1', { method: 'DELETE' }))

    expect(error.status).toBe(409)
    expect(error.errors).toEqual([{ code: 'in-use', message: 'still referenced' }])
  })

  it('calls the unauthorized handler and throws ApiError for 401 with an empty body', async () => {
    const onUnauthorized = vi.fn()
    setUnauthorizedHandler(onUnauthorized)
    fetchMock.mockResolvedValue(new Response(null, { status: 401, statusText: 'Unauthorized' }))

    const error = await catchError(fetcher('/api/persons'))

    expect(onUnauthorized).toHaveBeenCalledOnce()
    expect(error.status).toBe(401)
    expect(error.title).toBe('Unauthorized')
    expect(error.errors).toEqual([])
  })

  it('throws ApiError for a non-JSON error body', async () => {
    fetchMock.mockResolvedValue(
      new Response('<html>Bad Gateway</html>', {
        status: 502,
        statusText: 'Bad Gateway',
        headers: { 'Content-Type': 'text/html' },
      }),
    )

    const error = await catchError(fetcher('/api/persons'))

    expect(error.status).toBe(502)
    expect(error.title).toBe('Bad Gateway')
    expect(error.detail).toBeUndefined()
    expect(error.errors).toEqual([])
  })
})
