import { describe, expect, it } from 'vitest'
import { tickLabel } from '../src/chartStyle.js'

describe('tickLabel', () => {
  it('keeps the decimals the step needs', () => {
    expect(tickLabel(1902.5, 2.5, 'de-DE')).toBe('1902,5')
    expect(tickLabel(1905, 2.5, 'de-DE')).toBe('1905')
    expect(tickLabel(0.25, 0.25, 'en-GB')).toBe('0.25')
    expect(tickLabel(0.5, 0.5, 'en-GB')).toBe('0.5')
    expect(tickLabel(75, 25, 'en-GB')).toBe('75')
  })
  it('groups only large numbers', () => {
    expect(tickLabel(20000, 5000, 'de-DE')).toBe('20.000')
    expect(tickLabel(1e8, 2e7, 'en-GB')).toContain('10^8')
  })
})
