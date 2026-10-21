import { canRead, canWrite, fieldFormat, formatDisplay, getResource, resources } from '@/manifest'

describe('manifest', () => {
  const persons = getResource('persons')

  it('loads resources from ui-manifest.yaml in nav order', () => {
    expect(resources.map((r) => r.key)).toEqual(['persons'])
    expect(persons.route).toBe('/persons')
  })

  it('grants read to viewers and editors, write only to editors', () => {
    expect(canRead(['person-viewer'], persons)).toBe(true)
    expect(canRead(['person-editor'], persons)).toBe(true)
    expect(canRead(['offline_access'], persons)).toBe(false)
    expect(canWrite(['person-viewer'], persons)).toBe(false)
    expect(canWrite(['person-editor'], persons)).toBe(true)
  })
})

describe('manifest helpers', () => {
  const persons = getResource('persons')

  it('derives field formats from the list columns and form inputs', () => {
    expect(fieldFormat(persons, 'birthDate')).toEqual({ format: 'date', enum: undefined })
    expect(fieldFormat(persons, 'gender')).toEqual({ format: 'enum', enum: 'Gender' })
    expect(fieldFormat(persons, 'email')).toEqual({ format: 'text' })
  })

  it('fills the display template and tolerates missing values', () => {
    expect(formatDisplay(persons.display, { firstName: 'Anna', lastName: 'Nowak' })).toBe('Anna Nowak')
    expect(formatDisplay(persons.display, { lastName: 'Nowak' })).toBe('Nowak')
  })
})
