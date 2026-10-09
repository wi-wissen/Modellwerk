import { describe, expect, it } from 'vitest'
import { LINE_DASHES, curveStyle, tickLabel } from '../src/chartStyle.js'

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

describe('curveStyle', () => {
  it('uses the automatic palette without a stored style', () => {
    expect(curveStyle(1, null)).toMatchObject({ color: 'var(--s2)', mode: 'line' })
  })
  it('maps stored legacy styles', () => {
    const look = curveStyle(0, { mode: 'both', dash: 2, width: 3, color: '#ff0000', marker: 'cross', markerSize: 5, markerColor: null })
    expect(look.color).toContain('#ff0000')
    expect(look.markerColor).toBe(look.color)
    expect(look.dash).toBe(LINE_DASHES[2])
    expect(look.width).toBe(4.5)
    expect(curveStyle(0, { dash: 0, color: null }).color).toBe('var(--ink)')
    expect(curveStyle(0, { dash: 5 }).dash).toBeNull()
  })
})
