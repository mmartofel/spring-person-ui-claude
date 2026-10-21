import { CreatePersonBody } from '@/api/generated/endpoints/persons/persons.zod'
import { emptyToUndefined, formResolver, isRequired } from './formResolver'

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
    expect(result.values).toEqual({ firstName: 'Anna', lastName: 'Nowak', email: 'anna@example.com' })
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
})
