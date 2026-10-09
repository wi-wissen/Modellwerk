// Bit-for-bit comparison with values the legacy program computed for our own test
// programs (functions, powers and precedence, IF/WHILE, random numbers).
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { verifySimulation } from '../src/engine/verify.js'

const { runs } = JSON.parse(readFileSync(new URL('./fixtures/legacy-runs.json', import.meta.url)))

describe('identical results for programs run in the legacy program', () => {
  for (const run of runs) {
    it(`${run.id}: every value identical`, () => {
      const sim = {
        name: run.id,
        source: run.source,
        steps: run.steps,
        variables: Object.keys(run.values).map((name) => ({ name, start: run.start[name], values: Float64Array.from(run.values[name]) })),
      }
      const r = verifySimulation(sim, { seed: run.seed ?? 0 })
      expect(r.firstMismatch).toBeNull()
      expect(r.identical).toBe(r.compared)
    })
  }
})
