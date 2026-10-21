// Guards against contract changes that generate Zod schemas JavaScript cannot load
// (for example a Java-only regex in a @Pattern constraint).
import { CreatePersonBody, UpdatePersonBody } from '@/api/generated/endpoints/persons/persons.zod'

describe('generated Zod schemas', () => {
  it('accept a valid update body and reject a blank required field', () => {
    const body = { firstName: 'Anna', lastName: 'Nowak', email: 'anna@example.com', version: 0 }

    expect(UpdatePersonBody.safeParse(body).success).toBe(true)
    expect(CreatePersonBody.safeParse({ ...body, firstName: '' }).success).toBe(false)
  })
})
