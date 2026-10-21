import { TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useRouteError } from 'react-router'
import { Button } from '@/components/ui/button'
import { ErrorPage } from './ErrorPage'

/** Router-level errors, e.g. a lazy page chunk that failed to load after a deployment. */
export function RouteErrorPage() {
  const { t } = useTranslation()
  console.error(useRouteError())
  return (
    <main>
      <ErrorPage
        icon={TriangleAlert}
        title={t('common.errors.unexpectedTitle')}
        description={t('common.errors.unexpectedText')}
        action={<Button onClick={() => window.location.reload()}>{t('common.errors.reload')}</Button>}
      />
    </main>
  )
}
