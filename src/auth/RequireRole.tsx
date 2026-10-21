import type { ReactNode } from 'react'
import { ForbiddenPage } from '@/components/app/ForbiddenPage'
import { useRoles } from './roles'

/** Renders children when the user has at least one of `roles`, otherwise the 403 page. */
export function RequireRole({ roles, children }: { roles: readonly string[]; children: ReactNode }) {
  const userRoles = useRoles()
  return roles.some((role) => userRoles.includes(role)) ? children : <ForbiddenPage />
}
