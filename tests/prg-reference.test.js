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

describe.skipIf(!dir)('graph settings stored in reference PRG files', () => {
  it('reads the x axis and the shown curves', () => {
    const plots = files.flatMap((file) => readPrg(new Uint8Array(readFileSync(join(dir, file)))).map((s) => s.plot))
    expect(plots.every((p) => p && p.x)).toBe(true)
    expect(plots.filter((p) => p.y.length).length).toBeGreaterThan(plots.length / 2)
  })
  it('keeps the phase diagram of the predator-prey file', () => {
    const file = files.find((f) => /^raeuber\.prg$/i.test(f))
    if (!file) return
    const [first] = readPrg(new Uint8Array(readFileSync(join(dir, file))))
    expect(first.plot).toMatchObject({ x: 'FUECHSE', y: ['HASEN'] })
  })
})

describe.skipIf(!dir)('curve styles stored in reference PRG files', () => {
  const read = (name) => {
    const file = files.find((f) => f.toLowerCase() === name.toLowerCase())
    return file ? readPrg(new Uint8Array(readFileSync(join(dir, file)))) : null
  }
  it('reads colours, line types and bar charts', () => {
    const growth = read('Lin+exp Wachstum 2.prg')
    if (!growth) return
    const { styles } = growth[0].plot
    expect(styles.SUMME1).toMatchObject({ mode: 'both', color: '#000080', marker: 'disc' })
    expect(styles.SUMME2.color).toBe('#008000')
    expect(styles.TGELD1.color).toBeNull()
    expect(read('Lin+exp Wachstum 1c.prg')[0].plot.styles.KAPITAL.mode).toBe('bars')
  })
  it('keeps the automatic palette for files with default styles only', () => {
    const kin = read('Kinematik 1.prg')
    if (kin) expect(kin[0].plot.styles).toEqual({})
  })
})
