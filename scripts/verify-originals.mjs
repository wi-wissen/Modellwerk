// Beweislauf: rechnet alle Simulationen aus Original-Moebius-Dateien nach.
// Aufruf: MOEBIUS_ORIGINAL_DIR=/pfad/zu/Beispiele npm run verify
// Die Originaldateien sind urheberrechtlich geschützt und liegen nicht im Repository.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { readPrg } from '../src/engine/prg.js'
import { verifySimulation } from '../src/engine/verify.js'

const dir = process.env.MOEBIUS_ORIGINAL_DIR
if (!dir) {
  console.error('Bitte MOEBIUS_ORIGINAL_DIR auf den Ordner mit den Original-.prg-Dateien setzen.')
  process.exit(2)
}

const rows = []
for (const file of readdirSync(dir).filter((f) => /\.prg$/i.test(f)).sort()) {
  const sims = readPrg(new Uint8Array(readFileSync(join(dir, file))))
  if (!sims.length) rows.push({ file, status: 'keine gespeicherten Ergebnisse erkannt' })
  for (const sim of sims) {
    try {
      const r = verifySimulation(sim)
      rows.push({ file, ...r, status: r.identical === r.compared ? 'bitgenau identisch' : 'ABWEICHUNG' })
    } catch (e) {
      rows.push({ file, name: sim.name, status: `Fehler: ${e.message}` })
    }
  }
}

const total = rows.reduce((a, r) => a + (r.compared ?? 0), 0)
const same = rows.reduce((a, r) => a + (r.identical ?? 0), 0)
for (const r of rows) {
  const counts = r.compared != null ? `${r.identical}/${r.compared}` : ''
  console.log(`${r.file.padEnd(30)} ${(r.name ?? '').padEnd(16)} ${counts.padStart(12)}  ${r.status}`)
  if (r.firstMismatch) console.log('   erste Abweichung:', r.firstMismatch)
}
console.log(`\nGesamt: ${same} von ${total} Werten bitgenau identisch.`)
if (process.env.VERIFY_REPORT) writeFileSync(process.env.VERIFY_REPORT, JSON.stringify({ total, same, rows }, null, 2))
process.exit(same === total ? 0 : 1)
