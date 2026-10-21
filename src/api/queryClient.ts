import { QueryClient } from '@tanstack/react-query'
import { isApiError } from './fetcher'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // A 4xx will not change on retry; network and 5xx errors get two more attempts.
      retry: (failureCount, error) => !(isApiError(error) && error.status < 500) && failureCount < 2,
    },
  },
})
