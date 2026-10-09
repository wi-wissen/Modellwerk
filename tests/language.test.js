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
    expect(programToSentences('a := g - k*v\nv := v + a*dt\nt := t + dt')).toEqual({ ok: false, line: 1 })
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
