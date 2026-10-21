import { ShieldX } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { ErrorPage } from './ErrorPage'

export function ForbiddenPage() {
  const { t } = useTranslation()
  return (
    <ErrorPage
      icon={ShieldX}
      title={t('common.errors.forbiddenTitle')}
      description={t('common.errors.forbiddenText')}
      action={
        <Button asChild variant="outline">
          <Link to="/">{t('common.errors.backHome')}</Link>
        </Button>
      }
    />
  )
}
