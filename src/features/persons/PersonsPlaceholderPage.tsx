import { useTranslation } from 'react-i18next'
import { DataState } from '@/components/app/DataState'
import { PageHeader } from '@/components/app/PageHeader'

// Replaced by the persons list in stage 4.
export function PersonsPlaceholderPage() {
  const { t } = useTranslation()
  return (
    <>
      <PageHeader title={t('persons.title')} />
      <DataState isLoading={false} isError={false} isEmpty />
    </>
  )
}
