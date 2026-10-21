import { resources } from './resources'

function keys(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix]
  return Object.entries(value).flatMap(([key, child]) => keys(child, prefix ? `${prefix}.${key}` : key))
}

describe('locale files', () => {
  it('have the same keys in pl and en', () => {
    expect(keys(resources.pl.translation).sort()).toEqual(keys(resources.en.translation).sort())
  })

  it('have no empty translations', () => {
    for (const lang of ['pl', 'en'] as const) {
      const translation = resources[lang].translation
      const empty = keys(translation).filter(
        (key) => key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], translation) === '',
      )
      expect(empty, lang).toEqual([])
    }
  })
})
