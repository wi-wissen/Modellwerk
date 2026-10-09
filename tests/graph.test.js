import { describe, expect, it } from 'vitest'
import { EXAMPLES } from '../src/examples.js'
import { sentencesToProgram } from '../src/engine/model.js'
import { simulate } from '../src/engine/simulate.js'
import { parseProgram } from '../src/engine/language.js'
import {
  autoLayout, calculationOrder, canLink, graphToProgram, parseFormula, programToGraph, validateGraph,
} from '../src/engine/graph.js'

const node = (id, kind, name, formula = '') => ({ id, kind, name, x: 0, y: 0, formula })
const flow = (id, from, to, sign = '+') => ({ id, from, to, kind: 'flow', sign })
const inf = (id, from, to) => ({ id, from, to, kind: 'influence', sign: '+' })

// SIR model drawn as a graph
function sir() {
  return {
    nodes: [
      node('s', 'state', 'Gesunde'), node('k', 'state', 'Kranke'), node('g', 'state', 'Genesene'),
      node('a', 'rate', 'Ansteckungen', 'FInfekt*Gesunde*Kranke'), node('h', 'rate', 'Genesungen', 'FGenesung*Kranke'),
      node('c1', 'constant', 'FInfekt'), node('c2', 'constant', 'FGenesung'),
    ],
    links: [
      flow('f1', 'a', 's', '-'), flow('f2', 'a', 'k', '+'), flow('f3', 'h', 'k', '-'), flow('f4', 'h', 'g', '+'),
      inf('i1', 'c1', 'a'), inf('i2', 's', 'a'), inf('i3', 'k', 'a'), inf('i4', 'c2', 'h'), inf('i5', 'k', 'h'),
    ],
  }
}
const codes = (g, opts) => validateGraph(g, opts).map((p) => p.code)
const statements = (src) => parseProgram(src).statements.length
const programOf = (ex) => (ex.mode === 'sentences' ? sentencesToProgram(ex.sentences, { simplified: ex.simplified ?? true }) : ex.source)

describe('graphToProgram', () => {
  it('writes rates, then states, then time (simplified)', () => {
    const { source, problems } = graphToProgram(sir())
    expect(source).toBe([
      'Ansteckungen := FInfekt*Gesunde*Kranke',
      'Genesungen := FGenesung*Kranke',
      'Gesunde := Gesunde - Ansteckungen',
      'Kranke := Kranke + Ansteckungen - Genesungen',
      'Genesene := Genesene + Genesungen',
      'Zeit := Zeit + 1',
    ].join('\n'))
    expect(problems).toEqual([])
  })

  it('multiplies the summed flows by the time step when not simplified', () => {
    const { source } = graphToProgram(sir(), { simplified: false, timeName: 'T', dtName: 'dt' })
    expect(source.split('\n').slice(2)).toEqual([
      'Gesunde := Gesunde - Ansteckungen*dt',
      'Kranke := Kranke + (Ansteckungen - Genesungen)*dt',
      'Genesene := Genesene + Genesungen*dt',
      'T := T + dt',
    ])
  })

  it('writes several outflows as one bracket and a leading outflow with a minus', () => {
    const g = {
      nodes: [node('z', 'state', 'Z'), node('a', 'rate', 'A', '1'), node('b', 'rate', 'B', '2')],
      links: [flow('l1', 'a', 'z', '-'), flow('l2', 'b', 'z', '-')],
    }
    expect(graphToProgram(g, { simplified: false }).source.split('\n')[2]).toBe('Z := Z - (A + B)*DeltaT')
    g.links[1].sign = '+'
    expect(graphToProgram(g, { simplified: false }).source.split('\n')[2]).toBe('Z := Z + (-A + B)*DeltaT')
    g.links = []
    expect(graphToProgram(g).source.split('\n')[2]).toBe('Z := Z')
  })

  it('orders calculated nodes topologically, ties in node order', () => {
    const g = {
      nodes: [
        node('r', 'rate', 'R', 'H*2'), node('h', 'aux', 'H', 'K+1'), node('q', 'rate', 'Q', '3'),
        node('z', 'state', 'Z'), node('k', 'constant', 'K'),
      ],
      links: [inf('i1', 'h', 'r'), inf('i2', 'k', 'h'), flow('f1', 'r', 'z'), flow('f2', 'q', 'z')],
    }
    expect(calculationOrder(g).order.map((n) => n.name)).toEqual(['H', 'R', 'Q'])
    expect(graphToProgram(g, { extended: true }).source.split('\n').slice(0, 3)).toEqual(['H := K+1', 'R := H*2', 'Q := 3'])
  })

  it('produces a program that runs', () => {
    const { source } = graphToProgram(sir())
    const r = simulate(source, { GESUNDE: 990, KRANKE: 10, FINFEKT: 0.0001, FGENESUNG: 0.1 }, 50)
    const total = r.series.GESUNDE[50] + r.series.KRANKE[50] + r.series.GENESENE[50]
    expect(total).toBeCloseTo(1000, 9)
    expect(r.series.GENESENE[50]).toBeGreaterThan(0)
  })

  it('leaves out nodes without a valid name', () => {
    const g = sir()
    g.nodes.push(node('x', 'rate', '', '1'))
    expect(statements(graphToProgram(g).source)).toBe(6)
  })
})

describe('validateGraph', () => {
  const one = (g, code, opts) => validateGraph(g, opts).filter((p) => p.code === code)

  it('accepts a complete model', () => expect(codes(sir())).toEqual([]))

  it('checks names', () => {
    const g = sir()
    g.nodes[0].name = ''
    g.nodes[1].name = '2Kranke'
    g.nodes[2].name = 'sqrt'
    g.nodes[5].name = 'fgenesung' // same as FGenesung, case does not matter
    const c = codes(g)
    expect(c).toContain('emptyName')
    expect(c).toContain('invalidName')
    expect(c).toContain('duplicateName')
    expect(one(g, 'reservedName')[0]).toMatchObject({ nodeId: 'g', params: { name: 'sqrt' } })
    g.nodes[2].name = 'Zeit'
    expect(one(g, 'reservedName')).toHaveLength(1)
    g.nodes[2].name = 'then'
    expect(one(g, 'reservedName')).toHaveLength(1)
    g.nodes[2].name = 'DeltaT'
    expect(one(g, 'reservedName')).toHaveLength(0)
    expect(one(g, 'reservedName', { simplified: false })).toHaveLength(1)
  })

  it('finds missing and broken formulas', () => {
    const g = sir()
    g.nodes[3].formula = '  '
    g.nodes[4].formula = 'FGenesung*(Kranke'
    expect(one(g, 'missingFormula')[0].nodeId).toBe('a')
    expect(one(g, 'formulaError')[0]).toMatchObject({ nodeId: 'h', params: { code: 'closeParenExpected' } })
    g.nodes[4].formula = 'FGenesung*Kranke; X := 1'
    expect(one(g, 'formulaError')[0].params).toMatchObject({ code: 'unknownChar', column: 17 })
    g.nodes[4].formula = 'FGenesung*Kranke // note'
    expect(one(g, 'formulaError')).toHaveLength(1)
    g.nodes[4].formula = 'sqrtt(Kranke)'
    expect(one(g, 'formulaError')[0].params.code).toBe('unknownFunction')
  })

  it('finds missing, unknown and unused inputs', () => {
    const g = sir()
    g.links = g.links.filter((l) => l.id !== 'i1') // FInfekt used without arrow
    expect(one(g, 'missingInput')[0]).toMatchObject({ nodeId: 'a', params: { name: 'FInfekt', target: 'Ansteckungen' } })
    g.nodes[4].formula = 'FGenesung'
    const unused = one(g, 'unusedInput')[0]
    expect(unused).toMatchObject({ nodeId: 'h', linkId: 'i5', severity: 'warning' })
    g.nodes[4].formula = 'FGenesung*Kranke*Unbekannt + Zeit'
    expect(one(g, 'unknownName').map((p) => p.params.name)).toEqual(['Unbekannt'])
  })

  it('finds a formula that uses its own node', () => {
    const g = sir()
    g.nodes[4].formula = 'Genesungen*FGenesung*Kranke'
    expect(codes(g)).toContain('selfReference')
  })

  it('finds states and rates without flows', () => {
    const g = sir()
    g.links = g.links.filter((l) => l.id !== 'f4')
    expect(one(g, 'stateWithoutFlow')[0]).toMatchObject({ nodeId: 'g', severity: 'warning' })
    g.links = g.links.filter((l) => l.id !== 'f3')
    expect(one(g, 'rateWithoutFlow')[0]).toMatchObject({ nodeId: 'h', severity: 'warning' })
  })

  it('finds invalid and duplicate links', () => {
    const g = sir()
    g.links.push(inf('x1', 'a', 's')) // influence into a state
    g.links.push(flow('x2', 'c1', 's')) // flow from a constant
    g.links.push(inf('x3', 'a', 'a')) // self link
    g.links.push(inf('x4', 'k', 'gone')) // missing node
    g.links.push(inf('x5', 'c1', 'a'))
    expect(one(g, 'invalidLink').map((p) => p.linkId)).toEqual(['x1', 'x2', 'x3', 'x4'])
    expect(one(g, 'duplicateLink').map((p) => p.linkId)).toEqual(['x5'])
    expect(canLink(g.nodes[3], g.nodes[0], 'flow')).toBe(true)
    expect(canLink(g.nodes[0], g.nodes[3], 'flow')).toBe(false)
    expect(canLink(g.nodes[0], g.nodes[3], 'influence')).toBe(true)
  })

  it('finds cycles between rates and helper quantities', () => {
    const g = {
      nodes: [node('a', 'rate', 'A', 'B+1'), node('b', 'aux', 'B', 'C*2'), node('c', 'aux', 'C', 'A'), node('z', 'state', 'Z')],
      links: [inf('1', 'b', 'a'), inf('2', 'c', 'b'), inf('3', 'a', 'c'), flow('4', 'a', 'z')],
    }
    const cyc = one(g, 'cycle', { extended: true })
    expect(cyc).toHaveLength(1)
    expect(cyc[0].nodeIds).toEqual(['a', 'b', 'c'])
    expect(cyc[0].params.names).toBe('A → B → C → A')
    // a state breaks the loop: Z feeds A, A flows into Z
    g.nodes[2].formula = 'Z'
    g.links[2] = inf('3', 'z', 'c')
    expect(one(g, 'cycle', { extended: true })).toHaveLength(0)
    // the order still contains every node when there is a cycle
    g.nodes[2].formula = 'A'
    g.links[2] = inf('3', 'a', 'c')
    expect(calculationOrder(g).order).toHaveLength(3)
    expect(statements(graphToProgram(g, { extended: true }).source)).toBe(5)
  })

  it('allows helper quantities and functions of states only with the extended syntax', () => {
    const g = sir()
    g.nodes.push(node('x', 'aux', 'Anteil', 'Kranke/1000'))
    g.links.push(inf('ix', 'k', 'x'))
    g.nodes[4].formula = 'FGenesung*sqrt(Kranke)'
    expect(codes(g)).toEqual(expect.arrayContaining(['auxNotAllowed', 'functionOfState']))
    expect(one(g, 'functionOfState')[0].params).toEqual({ name: 'Kranke', fn: 'sqrt' })
    expect(codes(g, { extended: true })).toEqual([])
    // functions of constants are fine without the extended syntax
    g.nodes[4].formula = 'ln(FGenesung)*Kranke'
    expect(codes(g)).not.toContain('functionOfState')
  })
})

describe('parseFormula', () => {
  it('lists variables in order and those inside functions', () => {
    const f = parseFormula('a*sqrt(b+c)-a')
    expect([...f.refs.values()]).toEqual(['a', 'b', 'c'])
    expect([...f.callRefs.entries()]).toEqual([['B', 'SQRT'], ['C', 'SQRT']])
    expect(parseFormula('').empty).toBe(true)
    expect(parseFormula('1 +').error.code).toBe('operandExpected')
  })
})

describe('programToGraph', () => {
  const lossless = ['sunflower', 'lynx-and-hare', 'sir-epidemic', 'newtons-law-of-cooling', 'radioactive-decay']

  for (const ex of EXAMPLES) {
    const p = programOf(ex)
    if (lossless.includes(ex.id)) {
      it(`${ex.id} converts losslessly and simulates bit for bit`, () => {
        const r = programToGraph(p)
        expect(r.ok).toBe(true)
        expect(r.requiresExtended).toBe(false)
        const again = graphToProgram(r.graph, r)
        expect(again.problems.filter((x) => x.severity === 'error')).toEqual([])
        const a = parseProgram(p).statements.length
        expect(statements(again.source)).toBe(a)
        const one = simulate(p, ex.start, ex.steps)
        const two = simulate(again.source, ex.start, ex.steps)
        for (const name of one.names) expect([...two.series[name]], name).toEqual([...one.series[name]])
        // a second round trip is a fixed point
        const r2 = programToGraph(again.source)
        expect(r2.ok).toBe(true)
        expect(graphToProgram(r2.graph, r2).source).toBe(again.source)
      })
    } else {
      it(`${ex.id} is rejected with a line and reason`, () => {
        const r = programToGraph(p)
        expect(r.ok).toBe(false)
        expect(r.line).toBeGreaterThan(0)
        expect(['error', 'time', 'condition', 'pattern', 'flow', 'order']).toContain(r.reason)
      })
    }
  }

  it('gives the reasons for typical programs', () => {
    expect(programToGraph('x := (')).toMatchObject({ ok: false, reason: 'error', line: 1 })
    expect(programToGraph('a := 1\nb := 2')).toMatchObject({ ok: false, reason: 'time' })
    expect(programToGraph('IF a > 1 THEN a := 1\nT := T + 1')).toMatchObject({ ok: false, reason: 'condition' })
    expect(programToGraph('Z := Z * 2\nT := T + 1')).toMatchObject({ ok: false, reason: 'pattern' })
    expect(programToGraph('Z := Z + K\nT := T + 1')).toMatchObject({ ok: false, reason: 'flow' })
    expect(programToGraph('Z := Z + R\nR := 2\nT := T + 1')).toMatchObject({ ok: false, reason: 'order', line: 1 })
    expect(programToGraph('R := 1; Q := 2\nZ := Z + R + Q\nT := T + 1')).toMatchObject({ ok: false, reason: 'pattern' })
    expect(programToGraph('R := 1\nR := 2\nZ := Z + R\nT := T + 1')).toMatchObject({ ok: false, reason: 'pattern', line: 2 })
  })

  it('reads helper quantities, keeps the spelling and requires the extended syntax for them', () => {
    const src = 'Anteil := Kranke / N // share\nR := k*sqrt(Anteil)\nKranke := Kranke + (R)*dt\nZeit := Zeit + dt'
    const r = programToGraph(src)
    expect(r.ok).toBe(true)
    expect(r.requiresExtended).toBe(true)
    expect(r.graph.nodes.map((n) => [n.kind, n.name, n.formula])).toEqual([
      ['aux', 'Anteil', 'Kranke / N'], ['rate', 'R', 'k*sqrt(Anteil)'], ['state', 'Kranke', ''],
      ['constant', 'N', ''], ['constant', 'k', ''],
    ])
    expect(r.graph.links.filter((l) => l.kind === 'influence')).toHaveLength(4)
  })

  it('reads all generated state forms back', () => {
    const src = [
      'A := 1', 'B := 2', 'C := 3',
      'X := X - (A + B)*DT', 'Y := Y + (-A + B - C)*DT', 'W := W', 'V := V - C*DT', 'T := T + DT',
    ].join('\n')
    const r = programToGraph(src)
    expect(r.ok).toBe(true)
    expect(graphToProgram(r.graph, r).source).toBe(src.replace('A := 1', 'A := 1'))
  })
})

describe('autoLayout', () => {
  it('puts states at the bottom, rates above them and constants on top', () => {
    const g = autoLayout(sir())
    const at = (id) => g.nodes.find((n) => n.id === id)
    expect(at('s').y).toBeGreaterThan(at('a').y)
    expect(at('a').y).toBeGreaterThan(at('c1').y)
    expect(new Set(['s', 'k', 'g'].map((id) => at(id).y)).size).toBe(1)
    expect(at('s').x).toBeLessThan(at('k').x)
    expect(at('a').x).toBeLessThan(at('h').x) // Ansteckungen feeds the left states
    expect(sir().nodes[0].x).toBe(0) // the input is not changed
  })
})
