import type { TFunction } from 'i18next'
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { isApiError } from '@/api/fetcher'
import { tDynamic } from '@/i18n/dynamic'

export type ApiErrorOutcome =
  /** Every error was shown on its field. */
  | { kind: 'fields' }
  /** 409 without field errors: someone else changed the record (stale `version`). */
  | { kind: 'stale' }
  /** Show `message` in the form-level alert. */
  | { kind: 'form'; message: string }

const SERVER_ERROR = 'server:'

/** The field error `type` for an API error code, so the message can be translated again after a language switch. */
const serverErrorType = (code: string) => `${SERVER_ERROR}${code}`

/** Translates an API field error code (`common.validation.<code>`); the server's English message is the fallback. */
const serverErrorMessage = (t: TFunction, code: string, fallback?: string) =>
  tDynamic(t, `common.validation.${code}`, { defaultValue: fallback ?? t('common.validation.invalid') })

/**
 * After a language switch: the field error set by `applyApiError`, translated again from its code
 * (an unknown code keeps its message). Undefined for a client validation error, which is re-validated instead.
 */
export function retranslateServerError(t: TFunction, error: { type?: unknown; message?: unknown } | undefined) {
  if (typeof error?.type !== 'string' || !error.type.startsWith(SERVER_ERROR)) return undefined
  const fallback = typeof error.message === 'string' ? error.message : undefined
  return { type: error.type, message: serverErrorMessage(t, error.type.slice(SERVER_ERROR.length), fallback) }
}

/** Maps a failed save to the form: field errors via `setError`, a stale-version conflict, or a form-level message. */
export function applyApiError<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly string[],
  t: TFunction,
): ApiErrorOutcome {
  if (!isApiError(error)) return { kind: 'form', message: t('common.errors.unexpectedText') }
  if (error.status === 409 && error.errors.length === 0) return { kind: 'stale' }

  // Errors for fields the form does not have keep the server message: without the field it would be unclear.
  const unknown: string[] = []
  let focused = false
  for (const { field, code, message } of error.errors) {
    if (fields.includes(field)) {
      setError(
        field as Path<T>,
        { type: serverErrorType(code), message: serverErrorMessage(t, code, message) },
        { shouldFocus: !focused },
      )
      focused = true
    } else {
      unknown.push(message)
    }
  }
  if (error.errors.length > 0 && unknown.length === 0) return { kind: 'fields' }
  return { kind: 'form', message: unknown.length ? unknown.join(' ') : (error.detail ?? error.title) }
}
