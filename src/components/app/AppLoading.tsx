import { useTranslation } from 'react-i18next'
import { PageLoading } from './PageLoading'

/** Shown by the router while the first (lazy) page of the session loads. */
export function AppLoading() {
  const { t } = useTranslation()
  return <PageLoading label={t('common.states.loading')} />
}
