import { Navigate } from 'react-router'
import { useRoles } from '@/auth'
import { canRead, resources } from '@/manifest'
import { ForbiddenPage } from './ForbiddenPage'

/** `/` opens the first resource the user can read. */
export function HomeRedirect() {
  const roles = useRoles()
  const first = resources.find((resource) => canRead(roles, resource))
  return first ? <Navigate to={first.route} replace /> : <ForbiddenPage />
}
