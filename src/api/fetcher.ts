// The only HTTP client of the app. orval calls it for every generated request (see orval.config.ts).

export interface FieldError {
  field: string
  message: string
}

/** A non-2xx response, parsed from RFC 9457 Problem Details when the body has them. */
export class ApiError extends Error {
  readonly status: number
  readonly title: string
  readonly detail?: string
  readonly errors: FieldError[]

  constructor(status: number, title: string, detail?: string, errors: FieldError[] = []) {
    super(detail ?? title)
    this.name = 'ApiError'
    this.status = status
    this.title = title
    this.detail = detail
    this.errors = errors
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

type AccessTokenGetter = () => string | undefined | Promise<string | undefined>

let getAccessToken: AccessTokenGetter = () => undefined
let onUnauthorized: () => void = () => {}

/** Auth injects the current OIDC access token through this. */
export function setAccessTokenGetter(getter: AccessTokenGetter) {
  getAccessToken = getter
}

/** Auth injects a re-login here; it runs on every 401 before the ApiError is thrown. */
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

export async function fetcher<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body != null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const token = await getAccessToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(url, { ...init, headers })
  const body = await readJson(response)

  if (response.status === 401) onUnauthorized()
  if (!response.ok) throw toApiError(response, body)
  return body as T
}

/** Parses a JSON body; returns undefined for an empty or non-JSON body. */
async function readJson(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return undefined
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

function toApiError(response: Response, body: unknown): ApiError {
  const problem = (typeof body === 'object' && body !== null ? body : {}) as {
    title?: unknown
    detail?: unknown
    errors?: unknown
  }
  const title =
    typeof problem.title === 'string' ? problem.title : response.statusText || `HTTP ${response.status}`
  const detail = typeof problem.detail === 'string' ? problem.detail : undefined
  const errors = Array.isArray(problem.errors) ? problem.errors.filter(isFieldError) : []
  return new ApiError(response.status, title, detail, errors)
}

function isFieldError(value: unknown): value is FieldError {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as FieldError).field === 'string' &&
    typeof (value as FieldError).message === 'string'
  )
}
