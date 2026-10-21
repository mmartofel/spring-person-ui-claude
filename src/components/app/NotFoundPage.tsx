import { FileQuestion } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { ErrorPage } from './ErrorPage'

export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <ErrorPage
      icon={FileQuestion}
      title={t('common.errors.notFoundTitle')}
      description={t('common.errors.notFoundText')}
      action={
        <Button asChild variant="outline">
          <Link to="/">{t('common.errors.backHome')}</Link>
        </Button>
      }
    />
  )
}
