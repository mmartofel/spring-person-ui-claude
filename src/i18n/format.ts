import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

/** Formats an API date (`YYYY-MM-DD`) as a local calendar date, so no time zone can shift the day. */
export function formatDate(value: string | null | undefined, language: string): string {
  if (!value) return ''
  const match = ISO_DATE.exec(value)
  const date = match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(language, { dateStyle: 'medium' }).format(date)
}

export function formatDateTime(value: string | null | undefined, language: string): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export function formatNumber(
  value: number | null | undefined,
  language: string,
  options?: Intl.NumberFormatOptions,
): string {
  if (value == null) return ''
  return new Intl.NumberFormat(language, options).format(value)
}

/** Formatters bound to the current UI language. */
export function useFormat() {
  const { i18n } = useTranslation()
  const language = i18n.resolvedLanguage ?? i18n.language
  return useMemo(
    () => ({
      date: (value: string | null | undefined) => formatDate(value, language),
      dateTime: (value: string | null | undefined) => formatDateTime(value, language),
      number: (value: number | null | undefined, options?: Intl.NumberFormatOptions) =>
        formatNumber(value, language, options),
    }),
    [language],
  )
}
