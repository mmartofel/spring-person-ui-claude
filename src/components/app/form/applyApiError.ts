import type { TFunction } from 'i18next'
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { isApiError } from '@/api/fetcher'

export type ApiErrorOutcome =
  /** Every error was shown on its field. */
  | { kind: 'fields' }
  /** 409 without field errors: someone else changed the record (stale `version`). */
  | { kind: 'stale' }
  /** Show `message` in the form-level alert. */
  | { kind: 'form'; message: string }

/** Maps a failed save to the form: field errors via `setError`, a stale-version conflict, or a form-level message. */
export function applyApiError<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly string[],
  t: TFunction,
): ApiErrorOutcome {
  if (!isApiError(error)) return { kind: 'form', message: t('common.errors.unexpectedText') }
  if (error.status === 409 && error.errors.length === 0) return { kind: 'stale' }

  const unknown: string[] = []
  let focused = false
  for (const { field, message } of error.errors) {
    if (fields.includes(field)) {
      setError(field as Path<T>, { type: 'server', message }, { shouldFocus: !focused })
      focused = true
    } else {
      unknown.push(message)
    }
  }
  if (error.errors.length > 0 && unknown.length === 0) return { kind: 'fields' }
  return { kind: 'form', message: unknown.length ? unknown.join(' ') : (error.detail ?? error.title) }
}
