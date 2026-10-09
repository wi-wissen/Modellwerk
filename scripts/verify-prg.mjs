// Proof run: recalculates every simulation stored in reference PRG files.
// Usage: PRG_REFERENCE_DIR=/path/to/files npm run verify
// The reference files are copyrighted and not part of the repository.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { readPrg } from '../src/engine/prg.js'
import { verifySimulation } from '../src/engine/verify.js'

const dir = process.env.PRG_REFERENCE_DIR
if (!dir) {
  console.error('Set PRG_REFERENCE_DIR to the folder containing the reference .prg files.')
  process.exit(2)
}

const rows = []
for (const file of readdirSync(dir).filter((f) => /\.prg$/i.test(f)).sort()) {
  const sims = readPrg(new Uint8Array(readFileSync(join(dir, file))))
  if (!sims.length) rows.push({ file, status: 'no stored results found (unsupported variant)' })
  for (const sim of sims) {
    try {
      const r = verifySimulation(sim)
      rows.push({ file, ...r, status: r.identical === r.compared ? 'bit-identical' : 'MISMATCH' })
    } catch (e) {
      rows.push({ file, name: sim.name, status: `error: ${e.message}` })
    }
  }
}

const total = rows.reduce((a, r) => a + (r.compared ?? 0), 0)
const same = rows.reduce((a, r) => a + (r.identical ?? 0), 0)
for (const r of rows) {
  const counts = r.compared != null ? `${r.identical}/${r.compared}` : ''
  console.log(`${r.file.padEnd(30)} ${(r.name ?? '').padEnd(16)} ${counts.padStart(12)}  ${r.status}`)
  if (r.firstMismatch) console.log('   first mismatch:', r.firstMismatch)
}
console.log(`\nTotal: ${same} of ${total} values bit-identical.`)
if (process.env.VERIFY_REPORT) writeFileSync(process.env.VERIFY_REPORT, JSON.stringify({ total, same, rows }, null, 2))
process.exit(same === total ? 0 : 1)
