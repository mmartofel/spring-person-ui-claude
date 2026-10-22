import { FieldErrorCode } from '@/api/generated/model'
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

describe('API error codes', () => {
  it('have a message in every language', () => {
    for (const lang of ['pl', 'en'] as const) {
      const all = new Set(keys(resources[lang].translation))
      for (const code of Object.values(FieldErrorCode)) expect(all, `${lang}: ${code}`).toContain(`common.validation.${code}`)
    }
  })
})

describe('manifest labels', () => {
  it('exist in every language for each field and enum the manifest uses', async () => {
    const { formFieldPaths, objectFields, resources: manifestResources } = await import('@/manifest')
    for (const lang of ['pl', 'en'] as const) {
      const translation = resources[lang].translation as Record<string, unknown>
      const all = new Set(keys(translation))
      for (const resource of manifestResources) {
        const objects = resource.detail.fields.filter((field) => objectFields(resource, field))
        const fields = new Set([
          ...resource.list.columns.map((c) => c.field),
          ...resource.detail.fields.filter((field) => !objects.includes(field)),
          ...formFieldPaths(resource),
        ])
        for (const field of fields) expect(all, `${lang}: ${resource.key}.fields.${field}`).toContain(`${resource.key}.fields.${field}`)
        for (const object of objects) expect(all, `${lang}: ${resource.key}.groups.${object}`).toContain(`${resource.key}.groups.${object}`)
        for (const { param } of resource.list.filters ?? []) {
          expect(all, `${lang}: ${resource.key}.filters.${param}`).toContain(`${resource.key}.filters.${param}`)
        }
        const enums = [
          ...resource.list.columns.map((c) => c.enum),
          ...Object.values(resource.form.fields ?? {}).map((f) => f.enum),
          ...(resource.list.filters ?? []).map((f) => f.enum),
        ]
        for (const name of enums.filter(Boolean)) {
          expect(keys(translation).some((key) => key.startsWith(`enums.${name}.`)), `${lang}: enums.${name}`).toBe(true)
        }
      }
    }
  })
})
