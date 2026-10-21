// One file per top-level key: common.json -> `common.*`, enums.json -> `enums.*`,
// <resource>.json -> `<resource>.*`.
import enCommon from '@/locales/en/common.json'
import enEnums from '@/locales/en/enums.json'
import enPersons from '@/locales/en/persons.json'
import plCommon from '@/locales/pl/common.json'
import plEnums from '@/locales/pl/enums.json'
import plPersons from '@/locales/pl/persons.json'

export const resources = {
  en: { translation: { common: enCommon, enums: enEnums, persons: enPersons } },
  pl: { translation: { common: plCommon, enums: plEnums, persons: plPersons } },
} as const

export const languages = ['pl', 'en'] as const
export type Language = (typeof languages)[number]

export function isLanguage(value: unknown): value is Language {
  return languages.includes(value as Language)
}
