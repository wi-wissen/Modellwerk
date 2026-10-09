import { describe, expect, it } from 'vitest'
import { parseProgram } from '../src/engine/language.js'
import { simulate } from '../src/engine/simulate.js'

describe('Modellsprache', () => {
  it('versteht Dezimalkomma, Kommentare und mehrere Anweisungen pro Zeile', () => {
    const r = simulate('a:=0,5*b // Kommentar\nb:=b+a; c:=c+1', { B: 2 }, 2)
    expect([...r.series.B]).toEqual([2, 3, 4.5])
    expect([...r.series.C]).toEqual([0, 1, 2])
  })

  it('ignoriert Groß-/Kleinschreibung standardmäßig', () => {
    const r = simulate('Kapital := kapital + ZINS', { KAPITAL: 1, ZINS: 2 }, 1)
    expect(r.series.KAPITAL[1]).toBe(3)
  })

  it('unterscheidet Groß-/Kleinschreibung auf Wunsch', () => {
    const r = simulate('a:=M*m', { M: 2, m: 3 }, 1, { caseSensitive: true })
    expect(r.series.a[1]).toBe(6)
  })

  it('meldet Fehler mit Zeilennummer in der Sprache des Originals', () => {
    const p = parseProgram('x := 1\ny := (2+3')
    expect(p.errors[0].line).toBe(2)
    expect(p.errors[0].message).toMatch('„)“ erwartet')
  })

  it('kennt IF … THEN und WHILE … DO', () => {
    const r = simulate('IF x < 3 THEN x := x + 1\nWHILE y < 10 DO y := y + 4', {}, 5)
    expect(r.series.X[5]).toBe(3)
    expect(r.series.Y[5]).toBe(12)
  })

  it('rechnet jede Operation in IEEE-Double wie das Original', () => {
    const r = simulate('s := s + 0,1', {}, 3)
    expect(r.series.S[3]).toBe(0.30000000000000004)
  })
})
