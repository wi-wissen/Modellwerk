// Beweistest gegen Original-Moebius-Dateien. Die Dateien sind urheberrechtlich
// geschützt und deshalb nicht im Repository: MOEBIUS_ORIGINAL_DIR=… npm test
import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { readPrg } from '../src/engine/prg.js'
import { verifySimulation } from '../src/engine/verify.js'

const dir = process.env.MOEBIUS_ORIGINAL_DIR
const files = dir ? readdirSync(dir).filter((f) => /\.prg$/i.test(f)).sort() : []

describe.skipIf(!dir)('Rechengleichheit mit Moebius 3.0', () => {
  for (const file of files) {
    const sims = readPrg(new Uint8Array(readFileSync(join(dir, file))))
    for (const sim of sims) {
      it(`${file} – ${sim.name}: alle Werte bitgenau identisch`, () => {
        const r = verifySimulation(sim)
        expect(r.firstMismatch).toBeNull()
        expect(r.identical).toBe(r.compared)
      })
    }
  }
})
