// Proof of identical results against reference PRG files. The files are
// copyrighted and therefore not part of the repository:
//   PRG_REFERENCE_DIR=/path/to/files npm test
import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { readPrg } from '../src/engine/prg.js'
import { verifySimulation } from '../src/engine/verify.js'

const dir = process.env.PRG_REFERENCE_DIR
const files = dir ? readdirSync(dir).filter((f) => /\.prg$/i.test(f)).sort() : []

describe.skipIf(!dir)('bit-identical results for reference PRG files', () => {
  for (const file of files) {
    const sims = readPrg(new Uint8Array(readFileSync(join(dir, file))))
    for (const sim of sims) {
      it(`${file} – ${sim.name}: every value identical`, () => {
        const r = verifySimulation(sim)
        expect(r.firstMismatch).toBeNull()
        expect(r.identical).toBe(r.compared)
      })
    }
  }
})
