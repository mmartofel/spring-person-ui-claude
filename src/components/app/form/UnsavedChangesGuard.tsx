import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useBlocker } from 'react-router'
import { ConfirmDialog } from '../ConfirmDialog'

/** While `when` is true, asks before leaving the page (in-app navigation) and before reload or closing the tab. */
export function UnsavedChangesGuard({ when }: { when: boolean }) {
  const { t } = useTranslation()
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => when && currentLocation.pathname !== nextLocation.pathname,
  )

  useEffect(() => {
    if (!when) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [when])

  return (
    <ConfirmDialog
      open={blocker.state === 'blocked'}
      onOpenChange={(open) => !open && blocker.reset?.()}
      title={t('common.form.unsavedTitle')}
      description={t('common.form.unsavedText')}
      confirmLabel={t('common.form.leave')}
      cancelLabel={t('common.form.stay')}
      destructive
      onConfirm={() => blocker.proceed?.()}
    />
  )
}
