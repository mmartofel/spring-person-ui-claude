import { CreatePersonBody } from '@/api/generated/endpoints/persons/persons.zod'
import { CreateTaskBody } from '@/api/generated/endpoints/tasks/tasks.zod'
import { defaultValue, emptyToUndefined, formResolver, isRequired, numberLimits } from './formResolver'

const options = { fields: {}, shouldUseNativeValidation: false } as const

describe('formResolver', () => {
  it('omits empty optional fields from the body', async () => {
    const resolve = formResolver(CreatePersonBody)
    const result = await resolve(
      { firstName: 'Anna', lastName: 'Nowak', email: 'anna@example.com', birthDate: '', gender: '' },
      undefined,
      options,
    )
    expect(result.errors).toEqual({})
    // `status` has a contract default, which the schema fills in.
    expect(result.values).toEqual({ firstName: 'Anna', lastName: 'Nowak', email: 'anna@example.com', status: 'AVAILABLE' })
  })

  it('reports translated messages for empty required fields', async () => {
    const result = await formResolver(CreatePersonBody)(
      { firstName: '', lastName: '', email: 'x', birthDate: '', gender: '' },
      undefined,
      options,
    )
    expect(result.errors.firstName?.message).toBe('This field is required.')
    expect(result.errors.email?.message).toBe('Enter a valid email address.')
  })

  it('derives required fields from the schema', () => {
    expect(['firstName', 'lastName', 'email', 'birthDate', 'gender'].filter((f) => isRequired(CreatePersonBody, f))).toEqual([
      'firstName',
      'lastName',
      'email',
    ])
    expect(emptyToUndefined({ a: '', b: 'x' })).toEqual({ a: undefined, b: 'x' })
  })

  it('handles nested objects: empty parts and an empty object are left out', () => {
    expect(emptyToUndefined({ a: 'x', address: { city: '', street: '' } })).toEqual({ a: 'x', address: undefined })
    expect(emptyToUndefined({ address: { city: 'Kraków', street: '' } })).toEqual({ address: { city: 'Kraków', street: undefined } })
  })

  it('derives required fields and defaults along dot paths', () => {
    expect(isRequired(CreatePersonBody, 'address.city')).toBe(false)
    expect(isRequired(CreatePersonBody, 'status')).toBe(false)
    expect(defaultValue(CreatePersonBody, 'status')).toBe('AVAILABLE')
    expect(defaultValue(CreatePersonBody, 'address.city')).toBeUndefined()
  })

  it('checks notBefore with the API code date-range, next to other field errors', async () => {
    const resolve = formResolver(CreatePersonBody, { rules: [{ field: 'availableTo', notBefore: 'availableFrom' }] })
    const base = { firstName: 'Anna', lastName: 'Nowak', email: 'anna@example.com' }
    const broken = await resolve({ ...base, availableFrom: '2026-05-10', availableTo: '2026-05-01' }, undefined, options)
    expect(broken.errors.availableTo?.message).toBe('The end date cannot be earlier than the start date.')

    const ok = await resolve({ ...base, availableFrom: '2026-05-10', availableTo: '2026-05-10' }, undefined, options)
    expect(ok.errors).toEqual({})

    const both = await resolve({ ...base, firstName: '', availableFrom: '2026-05-10', availableTo: '2026-05-01' }, undefined, options)
    expect(Object.keys(both.errors).sort()).toEqual(['availableTo', 'firstName'])

    const nested = await resolve({ ...base, address: { countryCode: 'pl' } }, undefined, options)
    expect(nested.errors.address).toHaveProperty('countryCode')
  })

  it('reads number limits from the contract and sends number and relation inputs as numbers', async () => {
    expect(numberLimits(CreateTaskBody, 'estimateHours')).toEqual({ min: 0.5, max: 999, step: 0.5 })
    expect(numberLimits(CreateTaskBody, 'title')).toEqual({ min: undefined, max: undefined, step: undefined })
    expect(defaultValue(CreateTaskBody, 'done')).toBe(false)
    expect(defaultValue(CreateTaskBody, 'priority')).toBe('MEDIUM')

    const resolve = formResolver(CreateTaskBody, { numbers: ['estimateHours', 'assigneeId'] })
    const ok = await resolve({ title: 'Plan', estimateHours: '2.5', assigneeId: '7', done: true }, undefined, options)
    expect(ok.errors).toEqual({})
    expect(ok.values).toMatchObject({ title: 'Plan', estimateHours: 2.5, assigneeId: 7, done: true })

    const off = await resolve({ title: 'Plan', estimateHours: '0.3', assigneeId: '' }, undefined, options)
    expect(off.errors).toHaveProperty('estimateHours')
    expect(off.errors).not.toHaveProperty('assigneeId')
  })
})
