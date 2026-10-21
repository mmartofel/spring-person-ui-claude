import type { ReactNode } from 'react'
import { isApiError } from '@/api/fetcher'
import { ForbiddenPage } from './ForbiddenPage'
import { NotFoundPage } from './NotFoundPage'

/** For a failed single-record query: the 404 or 403 page, or null for other errors (DataState shows those). */
export function errorPageFor(error: unknown): ReactNode {
  if (isApiError(error) && error.status === 404) return <NotFoundPage />
  if (isApiError(error) && error.status === 403) return <ForbiddenPage />
  return null
}
