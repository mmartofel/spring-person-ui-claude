import i18n from 'i18next'
import { CreatePersonBody } from '@/api/generated/endpoints/persons/persons.zod'

function messages(value: unknown) {
  const result = CreatePersonBody.safeParse(value)
  return Object.fromEntries((result.error?.issues ?? []).map((issue) => [issue.path.join('.'), issue.message]))
}

const invalid = { firstName: '', email: 'nope', gender: 'X', birthDate: '1990-13-45' }

describe('global Zod error map', () => {
  it('translates generated schema errors into English', () => {
    expect(messages(invalid)).toEqual({
      firstName: 'This field is required.',
      lastName: 'This field is required.',
      email: 'Enter a valid email address.',
      gender: 'Choose one of the available options.',
      birthDate: 'Enter a valid date.',
    })
  })

  it('follows the current language', async () => {
    await i18n.changeLanguage('pl')
    expect(messages(invalid)).toMatchObject({
      firstName: 'To pole jest wymagane.',
      email: 'Podaj poprawny adres e-mail.',
    })
  })
})
