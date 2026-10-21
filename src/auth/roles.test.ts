import { decodeRoles } from './roles'

function token(payload: object) {
  const base64url = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `header.${base64url}.signature`
}

describe('decodeRoles', () => {
  it('reads realm_access.roles from the access token', () => {
    expect(decodeRoles(token({ realm_access: { roles: ['person-editor', 'offline_access'] } }))).toEqual([
      'person-editor',
      'offline_access',
    ])
  })

  it('returns [] when the claim is missing', () => {
    expect(decodeRoles(token({ sub: '123' }))).toEqual([])
  })

  it('returns [] for a missing or malformed token', () => {
    expect(decodeRoles(undefined)).toEqual([])
    expect(decodeRoles('not-a-jwt')).toEqual([])
    expect(decodeRoles('a.%%%.c')).toEqual([])
  })
})
