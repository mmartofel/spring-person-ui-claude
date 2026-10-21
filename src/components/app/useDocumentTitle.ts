import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

/** Sets `document.title` to "<page> – Person UI" (WCAG 2.4.2); PageHeader and ErrorPage call it. */
export function useDocumentTitle(page: string) {
  const { t } = useTranslation()
  useEffect(() => {
    document.title = t('common.documentTitle', { page })
  }, [page, t])
}
