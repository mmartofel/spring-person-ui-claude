import 'i18next'
import type { resources } from './resources'

// Typed translation keys: a misspelled key fails `npm run typecheck`.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation'
    resources: (typeof resources)['en']
  }
}
