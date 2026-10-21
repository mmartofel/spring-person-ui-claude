import { useMemo } from 'react'
import { useAuth } from 'react-oidc-context'

/** Reads `realm_access.roles` from a JWT access token; returns [] for a missing or malformed token. */
export function decodeRoles(accessToken: string | undefined): string[] {
  if (!accessToken) return []
  try {
    const payload = accessToken.split('.')[1]
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const claims = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')))
    const roles: unknown = claims?.realm_access?.roles
    return Array.isArray(roles) ? roles.filter((role): role is string => typeof role === 'string') : []
  } catch {
    return []
  }
}

export function useRoles(): string[] {
  const token = useAuth().user?.access_token
  return useMemo(() => decodeRoles(token), [token])
}
