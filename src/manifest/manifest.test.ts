import { canRead, canWrite, fieldFormat, formatDisplay, getResource, resources } from '@/manifest'

describe('manifest', () => {
  const persons = getResource('persons')

  it('loads resources from ui-manifest.yaml in nav order', () => {
    expect(resources.map((r) => r.key)).toEqual(['persons', 'tasks'])
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

  it('reads formats of display-only fields, number inputs and relation columns', () => {
    const tasks = getResource('tasks')
    expect(fieldFormat(tasks, 'createdAt')).toEqual({ format: 'dateTime' })
    expect(fieldFormat(tasks, 'estimateHours')).toEqual({ format: 'number' })
    expect(fieldFormat(tasks, 'assignee')).toMatchObject({ format: 'relation', resource: 'persons' })
  })

  it('fills the display template and tolerates missing values', () => {
    expect(formatDisplay(persons.display, { firstName: 'Anna', lastName: 'Nowak' })).toBe('Anna Nowak')
    expect(formatDisplay(persons.display, { lastName: 'Nowak' })).toBe('Nowak')
  })
})
