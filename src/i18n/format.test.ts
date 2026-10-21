import { formatDate, formatNumber } from './format'

describe('formatDate', () => {
  it('keeps the calendar day of an API date in every language', () => {
    expect(formatDate('1990-01-01', 'en')).toBe('Jan 1, 1990')
    expect(formatDate('1990-01-01', 'pl')).toBe('1 sty 1990')
  })

  it('returns an empty string for no value and the input for an invalid one', () => {
    expect(formatDate(undefined, 'en')).toBe('')
    expect(formatDate('not a date', 'en')).toBe('not a date')
  })
})

describe('formatNumber', () => {
  it('uses the language grouping', () => {
    expect(formatNumber(12345.5, 'en')).toBe('12,345.5')
    expect(formatNumber(12345.5, 'pl')).toBe('12\u00a0345,5')
  })
})
