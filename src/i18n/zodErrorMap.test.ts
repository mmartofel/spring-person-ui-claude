import i18n from 'i18next'
import { CreatePersonBody } from '@/api/generated/endpoints/persons/persons.zod'
import { CreateTaskBody } from '@/api/generated/endpoints/tasks/tasks.zod'

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

  it('formats number limits in the current language and names the step', async () => {
    const estimate = (value: number) => CreateTaskBody.safeParse({ title: 'x', estimateHours: value }).error?.issues[0]?.message
    expect(estimate(0.3)).toBe('Enter a value of at least 0.5.')
    expect(estimate(1.25)).toBe('Enter a multiple of 0.5.')
    await i18n.changeLanguage('pl')
    try {
      expect(estimate(0.3)).toBe('Podaj wartość nie mniejszą niż 0,5.')
      expect(estimate(1.25)).toBe('Podaj wielokrotność liczby 0,5.')
    } finally {
      await i18n.changeLanguage('en')
    }
  })

  it('follows the current language', async () => {
    await i18n.changeLanguage('pl')
    expect(messages(invalid)).toMatchObject({
      firstName: 'To pole jest wymagane.',
      email: 'Podaj poprawny adres e-mail.',
    })
  })
})
