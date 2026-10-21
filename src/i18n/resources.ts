// One file per top-level key: common.json -> `common.*`, <resource>.json -> `<resource>.*`.
import enCommon from '@/locales/en/common.json'
import enPersons from '@/locales/en/persons.json'
import plCommon from '@/locales/pl/common.json'
import plPersons from '@/locales/pl/persons.json'

export const resources = {
  en: { translation: { common: enCommon, persons: enPersons } },
  pl: { translation: { common: plCommon, persons: plPersons } },
} as const

export const languages = ['pl', 'en'] as const
export type Language = (typeof languages)[number]

export function isLanguage(value: unknown): value is Language {
  return languages.includes(value as Language)
}
