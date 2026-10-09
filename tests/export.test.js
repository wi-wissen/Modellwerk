import { describe, expect, it } from 'vitest'
import { simulate } from '../src/engine/simulate.js'
import { tableRows, toCsv, toTsv } from '../src/engine/export.js'

describe('table export', () => {
  const r = simulate('s := s + 0,1\nn := n + 1', {}, 3)
  const rows = tableRows(r, ['S'])

  it('keeps full precision and uses German separators', () => {
    expect(toCsv(['Schritt', 'S'], rows, 'de')).toBe('﻿Schritt;S\r\n0;0\r\n1;0,1\r\n2;0,2\r\n3;0,30000000000000004')
  })
  it('uses commas and points in English', () => {
    expect(toCsv(['Step', 'S'], rows, 'en').split('\r\n')[4]).toBe('3,0.30000000000000004')
  })
  it('quotes cells containing separators', () => {
    expect(toCsv(['a;b'], [], 'de')).toBe('﻿"a;b"')
  })
  it('produces tab-separated text for the clipboard', () => {
    expect(toTsv(['Step', 'S'], tableRows(r, ['S'], 2), 'en')).toBe('Step\tS\r\n0\t0\r\n2\t0.2\r\n3\t0.30000000000000004')
  })
})
