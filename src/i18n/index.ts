import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { isLanguage, resources, type Language } from './resources'
import { installZodErrorMap } from './zodErrorMap'

const STORAGE_KEY = 'lang'
const FALLBACK: Language = 'pl'

/** Stored choice, then the browser languages, then Polish. */
export function detectLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (isLanguage(stored)) return stored
  } catch {
    // localStorage can be unavailable (private mode); fall through to the browser language.
  }
  for (const tag of navigator.languages ?? []) {
    const base = tag.slice(0, 2).toLowerCase()
    if (isLanguage(base)) return base
  }
  return FALLBACK
}

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng
  try {
    localStorage.setItem(STORAGE_KEY, lng)
  } catch {
    // Ignore: the choice just is not remembered.
  }
})

void i18n.use(initReactI18next).init({
  resources,
  lng: detectLanguage(),
  fallbackLng: FALLBACK,
  supportedLngs: ['pl', 'en'],
  interpolation: { escapeValue: false },
  initAsync: false,
})

installZodErrorMap()

export default i18n
