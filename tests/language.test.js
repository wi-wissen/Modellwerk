import { describe, expect, it } from 'vitest'
import { parseProgram } from '../src/engine/language.js'
import { simulate } from '../src/engine/simulate.js'
import { analyse, sentencesToProgram } from '../src/engine/model.js'

describe('modelling language', () => {
  it('accepts decimal commas, comments and several statements per line', () => {
    const r = simulate('a:=0,5*b // comment\nb:=b+a; c:=c+1', { B: 2 }, 2)
    expect([...r.series.B]).toEqual([2, 3, 4.5])
    expect([...r.series.C]).toEqual([0, 1, 2])
  })

  it('ignores letter case by default', () => {
    const r = simulate('Capital := capital + RATE', { CAPITAL: 1, RATE: 2 }, 1)
    expect(r.series.CAPITAL[1]).toBe(3)
  })

  it('distinguishes letter case on request', () => {
    const r = simulate('a:=M*m', { M: 2, m: 3 }, 1, { caseSensitive: true })
    expect(r.series.a[1]).toBe(6)
  })

  it('reports errors with a code and line number', () => {
    const p = parseProgram('x := 1\ny := (2+3')
    expect(p.errors[0].line).toBe(2)
    expect(p.errors[0].code).toBe('closeParenExpected')
  })

  it('supports IF … THEN and WHILE … DO', () => {
    const r = simulate('IF x < 3 THEN x := x + 1\nWHILE y < 10 DO y := y + 4', {}, 5)
    expect(r.series.X[5]).toBe(3)
    expect(r.series.Y[5]).toBe(12)
  })

  it('rounds every operation to IEEE double like the legacy program', () => {
    const r = simulate('s := s + 0,1', {}, 3)
    expect(r.series.S[3]).toBe(0.30000000000000004)
  })
})

describe('model analysis', () => {
  it('classifies stocks, rates, constants and time', () => {
    const { roles, flows } = analyse('In := k*N\nOut := 0,1*N\nN := N + In - Out\nT := T + 1')
    expect(Object.fromEntries(roles)).toEqual({ IN: 'rate', K: 'constant', N: 'state', OUT: 'rate', T: 'time' })
    expect(flows).toEqual([
      { rate: 'IN', state: 'N', sign: '+' },
      { rate: 'OUT', state: 'N', sign: '-' },
    ])
  })

  it('translates sentences into a program', () => {
    const program = sentencesToProgram([
      { subject: 'Growth', predicate: 'proportional', object: 'N' },
      { subject: 'N', predicate: 'increase', object: 'Growth' },
    ], { timeName: 'Time' })
    expect(program).toBe('Growth := FGrowth*N\nN := N + Growth\nTime := Time + 1')
  })
})

describe('program to sentences', () => {
  it('round-trips a program generated from sentences', async () => {
    const { programToSentences } = await import('../src/engine/model.js')
    const source = 'Infections := FInfections*Healthy*Ill\nIll := Ill + Infections\nHealthy := Healthy - Infections\nTime := Time + 1'
    const r = programToSentences(source)
    expect(r.ok).toBe(true)
    expect(r.sentences).toEqual([
      { subject: 'Infections', predicate: 'proportional', object: 'Healthy*Ill' },
      { subject: 'Ill', predicate: 'increase', object: 'Infections' },
      { subject: 'Healthy', predicate: 'decrease', object: 'Infections' },
    ])
  })

  it('handles the physics variant with a time step', async () => {
    const { programToSentences } = await import('../src/engine/model.js')
    const r = programToSentences('Out := FOut*Q\nQ := Q - Out*dt\nt := t + dt')
    expect(r).toMatchObject({ ok: true, simplified: false, dtName: 'dt', timeName: 't' })
  })

  it('refuses programs that would not round-trip exactly', async () => {
    const { programToSentences } = await import('../src/engine/model.js')
    expect(programToSentences('a := g - k*v\nv := v + a*dt\nt := t + dt')).toEqual({ ok: false, line: 1, reason: 'pattern' })
    // rate defined after the stock update: order would change, so no conversion
    expect(programToSentences('N := N + G\nG := FG*N\nT := T + 1').ok).toBe(false)
  })
})

describe('flow detection', () => {
  it('reads inflows and outflows through a time step factor', () => {
    const { flows } = analyse('In := 1\nOut := 2\nBody := Body + (In - Out)*dt\nt := t + dt')
    expect(flows).toEqual([
      { rate: 'IN', state: 'BODY', sign: '+' },
      { rate: 'OUT', state: 'BODY', sign: '-' },
    ])
  })
})

describe('language details from the legacy documentation', () => {
  it('applies IF to the whole rest of the line', () => {
    const r = simulate('IF x < 0 THEN a := 1; b := 2\nx := x + 1', { X: 0 }, 1)
    expect(r.series.A[1]).toBe(0)
    expect(r.series.B[1]).toBe(0)
  })

  it('accepts = as assignment and : as separator', () => {
    const r = simulate('a = 2 : b := a*3', {}, 1)
    expect(r.series.B[1]).toBe(6)
  })

  it('treats = inside a condition as comparison', () => {
    const r = simulate('IF n = 2 THEN hit := 1\nn := n + 1', {}, 4)
    expect(r.series.HIT[3]).toBe(1)
  })

  it('supports ^ with the legacy precedence (verified with the legacy program)', () => {
    const r = simulate('a := 2^10; b := 2^0,5; c := -2^2; d := 2^-1; e := 2^3^2; f := 2*3^2; g := (0-3)^3', {}, 1)
    expect(r.series.A[1]).toBe(1024)
    expect(r.series.B[1]).toBe(Math.SQRT2)
    expect(r.series.C[1]).toBe(4)
    expect(r.series.D[1]).toBe(0.5)
    expect(r.series.E[1]).toBe(64)
    expect(r.series.F[1]).toBe(18)
    expect(r.series.G[1]).toBe(-27)
  })

  it('stops on a negative base with a fractional exponent like the legacy program', () => {
    expect(() => simulate('x := 1\ny := (0-2)^0,5', {}, 1)).toThrow(expect.objectContaining({ code: 'invalidOperation', line: 2 }))
  })

  it('implements random(x) for whole numbers and random(0) for fractions', () => {
    const r = simulate('w := random(6); f := random(0)', {}, 200, { seed: 42 })
    const w = [...r.series.W].slice(1)
    expect(w.every((v) => Number.isInteger(v) && v >= 0 && v < 6)).toBe(true)
    expect(new Set(w).size).toBe(6)
    expect([...r.series.F].slice(1).every((v) => v >= 0 && v < 1)).toBe(true)
  })

  it('finds assignments inside IF for the model roles', () => {
    const { roles } = analyse('IF h < 0 THEN v := -v*e; h := 0\nv := v - g*dt\nh := h + v*dt\nt := t + dt')
    expect(Object.fromEntries(roles)).toEqual({ V: 'state', H: 'state', E: 'constant', G: 'constant', DT: 'constant', T: 'time' })
  })
})

describe('macros', () => {
  const macros = [
    { name: 'Bremsen', body: 'v := v - b*dt\nIF v < 0 THEN v := 0' },
    { name: 'Fahren', body: 'Bremsen\ns := s + v*dt' },
  ]
  it('expands a macro called by its name, also nested and after THEN', () => {
    const withMacros = simulate('IF t >= 0 THEN Fahren\nt := t + dt', { V: 10, B: 2, DT: 0.5 }, 3, { macros })
    const inline = simulate('IF t >= 0 THEN v := v - b*dt\nIF v < 0 THEN v := 0\ns := s + v*dt\nt := t + dt', { V: 10, B: 2, DT: 0.5 }, 3)
    // note: inline IF on one line would swallow the rest; compare the stock directly
    expect(withMacros.series.V[3]).toBe(7)
    expect(withMacros.series.S[3]).toBe(4.5 + 4 + 3.5)
    expect(inline.series.V[3]).toBe(7)
  })
  it('rejects recursion', () => {
    const p = parseProgram('A1', { macros: [{ name: 'A1', body: 'B1' }, { name: 'B1', body: 'A1' }] })
    expect(p.errors[0].code).toBe('macroRecursive')
  })
  it('reports errors inside a macro at the calling line', () => {
    const p = parseProgram('x := 1\nKaputt', { macros: [{ name: 'Kaputt', body: 'y := (2' }] })
    expect(p.errors[0]).toMatchObject({ code: 'macroInvalid', line: 2 })
  })
})
