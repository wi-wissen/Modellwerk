// Reader tests with small synthetic PRG files built here (no reference files needed).
import { describe, expect, it } from 'vitest'
import { readPrg } from '../src/engine/prg.js'
import { simulate } from '../src/engine/simulate.js'
import { verifySimulation } from '../src/engine/verify.js'

// Minimal little-endian writer for the PRG building blocks.
function writer() {
  const parts = []
  const w = {
    bytes(list) { parts.push(Uint8Array.from(list)); return w },
    zeros(n) { parts.push(new Uint8Array(n)); return w },
    u32(n) { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n, true); parts.push(b); return w },
    f64(x) { const b = new Uint8Array(8); new DataView(b.buffer).setFloat64(0, x, true); parts.push(b); return w },
    str(s) { const b = Uint8Array.from(s, (c) => c.charCodeAt(0)); w.u32(b.length); parts.push(b); return w },
    done() {
      const out = new Uint8Array(parts.reduce((a, p) => a + p.length, 0))
      let o = 0
      for (const p of parts) { out.set(p, o); o += p.length }
      return out
    },
  }
  return w
}

// One variable record: name, owning simulation, flag, initial value, options,
// stored values and display options with an optional marker picture.
function variable(w, { name, owner = '', start, values = [], picture = '' }) {
  w.str(name).str(owner).bytes([1]).f64(start).bytes([values.length ? 1 : 0, 0]).u32(values.length)
  for (const v of values) w.f64(v)
  w.zeros(6).u32(10).zeros(21).str(picture).zeros(6).u32(10).u32(4).u32(64)
}

function simulation(w, { name, lines, variables, axes = ['', ''], steps }) {
  w.str(name).u32(lines.length)
  for (const line of lines) w.str(line)
  w.u32(0).u32(variables.length)
  for (const v of variables) variable(w, { owner: name, ...v })
  w.str(axes[0]).str(axes[1]).u32(steps)
  w.zeros(32) // empty graphical model
}

const program = ['// growth', 'N := N + N*R; T := T + 1', '']
const run = simulate(program.join('\n'), { N: 2, R: 0.5, T: 0 }, 3)

function buildFile() {
  const w = writer()
  w.bytes([...'MOEBIUS30'].map((c) => c.charCodeAt(0))).zeros(40) // signature and unrelated document data
  w.u32(2)
  simulation(w, {
    name: 'With results',
    lines: program,
    axes: ['T', 'N'],
    steps: 3,
    variables: [
      { name: 'N', start: 2, values: [...run.series.N.slice(1)], picture: 'Kreis.bmp' },
      { name: 'R', start: 0.5 },
      { name: 'T', start: 0, values: [...run.series.T.slice(1)] },
    ],
  })
  simulation(w, {
    name: 'No results',
    lines: ['x := x + 1'],
    steps: 7,
    variables: [{ name: 'X', start: 4 }],
  })
  return w.done()
}

describe('PRG reader', () => {
  it('reads every simulation of a file with several simulations', () => {
    const sims = readPrg(buildFile())
    expect(sims.map((s) => s.name)).toEqual(['With results', 'No results'])
    const [a, b] = sims
    expect(a.source).toBe('// growth\nN := N + N*R; T := T + 1')
    expect(a.steps).toBe(3)
    expect(a.hasResults).toBe(true)
    expect(a.variables.map((v) => [v.name, v.start, v.values.length])).toEqual([['N', 2, 3], ['R', 0.5, 0], ['T', 0, 3]])
    expect([...a.variables[0].values]).toEqual([3, 4.5, 6.75])

    expect(b.source).toBe('x := x + 1')
    expect(b.hasResults).toBe(false)
    expect(b.steps).toBe(7)
    expect(b.variables).toHaveLength(1)
    expect(b.variables[0].values).toHaveLength(0)
  })

  it('recalculates the stored values and accepts simulations without results', () => {
    const [a, b] = readPrg(buildFile())
    expect(verifySimulation(a)).toMatchObject({ compared: 6, identical: 6, firstMismatch: null })
    expect(verifySimulation(b)).toMatchObject({ compared: 0, identical: 0, firstMismatch: null })
  })

  it('reads embedded marker pictures of any length', () => {
    const w = writer()
    w.bytes([...'MOEBIUS30'].map((c) => c.charCodeAt(0))).u32(1)
    simulation(w, {
      name: '',
      lines: ['A := A*2'],
      steps: 2,
      variables: [{ name: 'a', start: 1, values: [2, 4], picture: '\x89PNG' + 'x'.repeat(300) }],
    })
    const [sim] = readPrg(w.done())
    expect(sim.name).toBe('')
    expect(sim.variables[0].name).toBe('a')
    expect([...sim.variables[0].values]).toEqual([2, 4])
  })

  it('rejects files without the MOEBIUS30 signature', () => {
    expect(() => readPrg(new Uint8Array(20))).toThrow(expect.objectContaining({ code: 'unsupportedFormat' }))
  })
})
