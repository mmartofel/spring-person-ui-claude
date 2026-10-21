import '@testing-library/jest-dom/vitest'
import i18n from '@/i18n'

// Tests run in English unless they switch the language themselves.
beforeEach(async () => {
  await i18n.changeLanguage('en')
})
