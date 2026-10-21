// Query parameters Keycloak adds to the callback URL; they must never end up in a return target,
// or the app would treat the restored URL as another callback.
const OIDC_PARAMS = ['code', 'state', 'session_state', 'iss', 'error', 'error_description', 'error_uri']

/** Only same-origin paths are accepted as a return target after login (no open redirect). */
export function safeReturnTo(value: unknown): string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/'
}

/** The current app URL (path, query, hash) without OIDC callback parameters. */
export function returnToFromLocation(location: Pick<Location, 'pathname' | 'search' | 'hash'>): string {
  const params = new URLSearchParams(location.search)
  for (const name of OIDC_PARAMS) params.delete(name)
  const search = params.toString()
  return location.pathname + (search ? `?${search}` : '') + location.hash
}
