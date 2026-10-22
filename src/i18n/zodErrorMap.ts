import i18n from 'i18next'
import { z } from 'zod'

// One global Zod error map, so generated schemas need no per-field messages.
// Messages are resolved when a value is validated, so they follow the current language.
export function installZodErrorMap() {
  z.config({
    customError: (issue) => {
      const t = i18n.t
      switch (issue.code) {
        case 'invalid_type':
          return issue.input == null ? t('common.validation.required') : t('common.validation.invalid')
        case 'too_small':
          if (issue.origin === 'string') {
            return Number(issue.minimum) <= 1
              ? t('common.validation.required')
              : t('common.validation.tooShort', { minimum: Number(issue.minimum) })
          }
          return t('common.validation.min', { minimum: Number(issue.minimum) })
        case 'too_big':
          return issue.origin === 'string'
            ? t('common.validation.tooLong', { maximum: Number(issue.maximum) })
            : t('common.validation.max', { maximum: Number(issue.maximum) })
        case 'invalid_format':
          if (issue.format === 'email') return t('common.validation.email')
          if (issue.format === 'date') return t('common.validation.date')
          return t('common.validation.invalid')
        case 'invalid_value':
          return t('common.validation.option')
        case 'custom':
          // Cross-field rules carry the API's error code, e.g. `date-range`.
          return typeof issue.params?.code === 'string'
            ? t(`common.validation.${issue.params.code}` as 'common.validation.invalid')
            : t('common.validation.invalid')
        default:
          return t('common.validation.invalid')
      }
    },
  })
}
