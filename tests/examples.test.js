import { describe, expect, it } from 'vitest'
import { EXAMPLES } from '../src/examples.js'
import { sentencesToProgram } from '../src/engine/model.js'
import { simulate } from '../src/engine/simulate.js'

const programOf = (ex) => (ex.mode === 'sentences' ? sentencesToProgram(ex.sentences, { simplified: ex.simplified ?? true }) : ex.source)

describe('built-in examples', () => {
  for (const ex of EXAMPLES) {
    it(`${ex.id} runs and stays finite`, () => {
      const r = simulate(programOf(ex), ex.start, ex.steps)
      for (const name of [ex.plot.x, ...ex.plot.y]) {
        expect(r.series[name], name).toBeDefined()
        expect([...r.series[name]].every(Number.isFinite), name).toBe(true)
      }
    })
    if (ex.checks?.length) {
      it(`${ex.id} reproduces the documented control values`, () => {
        const r = simulate(programOf(ex), ex.start, ex.steps)
        for (const c of ex.checks) {
          const v = r.series[c.variable][c.step]
          expect(Math.abs(v - c.value), `${c.variable}[${c.step}]`).toBeLessThanOrEqual(Math.max(1e-3, Math.abs(c.value) * 1e-3))
        }
      })
    }
    it(`${ex.id} names its sources when it has any`, () => {
      for (const s of ex.sources ?? []) expect(s.url && s.license).toBeTruthy()
    })
  }
})
