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

import { exactLn, exactPow } from '../src/engine/exactmath.js'
// Reference: make-math-reference.py (Python decimal, 60 digits)
const mathRef = JSON.parse(readFileSync(new URL('./fixtures/math-reference.json', import.meta.url)))

describe('exactLn and exactPow', () => {
  it('ln is correctly rounded for all reference values', () => {
    expect(mathRef.ln.filter(([x, y]) => !Object.is(exactLn(x), y))).toEqual([])
  })
  it('pow is correctly rounded for all reference values', () => {
    expect(mathRef.pow.filter(([x, y, z]) => !Object.is(exactPow(x, y), z))).toEqual([])
  })
})
