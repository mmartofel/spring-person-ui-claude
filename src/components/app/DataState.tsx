import type { ReactNode } from 'react'
import { CircleAlert, Inbox, RotateCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

interface DataStateProps {
  isLoading: boolean
  isError: boolean
  isEmpty?: boolean
  onRetry?: () => void
  /** Custom skeleton matching the data view; defaults to a few rows. */
  loading?: ReactNode
  /** Custom empty message; defaults to `common.states.empty`. */
  empty?: ReactNode
  children?: ReactNode
}

/** The four states every data view has: loading (skeleton), error (with retry), empty, data. */
export function DataState({ isLoading, isError, isEmpty, onRetry, loading, empty, children }: DataStateProps) {
  const { t } = useTranslation()

  if (isLoading) {
    return (
      <div role="status" aria-live="polite">
        {loading ?? (
          <div className="space-y-3">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </div>
        )}
        <span className="sr-only">{t('common.states.loading')}</span>
      </div>
    )
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <CircleAlert aria-hidden />
        <AlertTitle>{t('common.states.errorTitle')}</AlertTitle>
        <AlertDescription>
          <p>{t('common.states.errorText')}</p>
          {onRetry && (
            <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
              <RotateCw aria-hidden />
              {t('common.states.retry')}
            </Button>
          )}
        </AlertDescription>
      </Alert>
    )
  }

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 p-10 text-center text-muted-foreground">
        <Inbox className="size-8" aria-hidden />
        <div>{empty ?? t('common.states.empty')}</div>
      </div>
    )
  }

  return children
}
