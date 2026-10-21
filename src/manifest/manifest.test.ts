import { canRead, canWrite, getResource, resources } from '@/manifest'

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
