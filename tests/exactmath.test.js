import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { exactExp } from '../src/engine/exactmath.js'

// Reference: Python decimal with 60 digits, rounded to double (make-exp-reference.py)
const reference = JSON.parse(readFileSync(new URL('./fixtures/exp-reference.json', import.meta.url)))

describe('exactExp', () => {
  it('is correctly rounded for all reference values', () => {
    const wrong = reference.filter(([x, y]) => !Object.is(exactExp(x), y))
    expect(wrong).toEqual([])
  })
  it('handles edge cases', () => {
    expect(exactExp(0)).toBe(1)
    expect(exactExp(1)).toBe(Math.E)
    expect(exactExp(1000)).toBe(Infinity)
    expect(exactExp(-1000)).toBe(0)
    expect(exactExp(NaN)).toBeNaN()
  })
})
