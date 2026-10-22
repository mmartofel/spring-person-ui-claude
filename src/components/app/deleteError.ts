import type { TFunction } from 'i18next'
import { toast } from 'sonner'
import { isApiError } from '@/api/fetcher'

/**
 * Tells why a delete failed: still referenced by other records (409 with code `in-use`) gets its own translated
 * message instead of the generic one.
 */
export function toastDeleteError(t: TFunction, error: unknown, name: string) {
  const inUse = isApiError(error) && error.errors.some((e) => e.code === 'in-use')
  toast.error(inUse ? t('common.toast.deleteInUse', { name }) : t('common.toast.deleteFailed', { name }))
}
