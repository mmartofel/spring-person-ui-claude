import { returnToFromLocation, safeReturnTo } from './returnTo'

describe('safeReturnTo', () => {
  it('keeps same-origin paths with query and hash', () => {
    expect(safeReturnTo('/persons?page=2#top')).toBe('/persons?page=2#top')
  })

  it('falls back to / for anything that could leave the app', () => {
    expect(safeReturnTo('//evil.example')).toBe('/')
    expect(safeReturnTo('https://evil.example')).toBe('/')
    expect(safeReturnTo(undefined)).toBe('/')
  })
})

describe('returnToFromLocation', () => {
  it('drops the OIDC callback parameters and keeps the app ones', () => {
    expect(
      returnToFromLocation({ pathname: '/persons', search: '?page=2&state=abc&code=xyz&iss=kc', hash: '#top' }),
    ).toBe('/persons?page=2#top')
    expect(returnToFromLocation({ pathname: '/', search: '?error=access_denied&state=abc', hash: '' })).toBe('/')
  })
})
