import { simulate } from './simulate.js'

const buf = new DataView(new ArrayBuffer(16))
function sameBits(a, b) {
  buf.setFloat64(0, a)
  buf.setFloat64(8, b)
  return buf.getBigUint64(0) === buf.getBigUint64(8)
}

/**
 * Recalculates a simulation read from a PRG file and compares every stored
 * value bit for bit (IEEE-754 double).
 */
export function verifySimulation(sim) {
  const caseSensitive = sim.variables.some((v) => v.name !== v.name.toUpperCase())
  const start = Object.fromEntries(sim.variables.map((v) => [v.name, v.start]))
  const result = simulate(sim.source, start, sim.steps, { caseSensitive })
  let compared = 0
  let identical = 0
  let firstMismatch = null
  for (const v of sim.variables) {
    const ours = result.series[v.name]
    for (let i = 0; i < v.values.length; i++) {
      compared++
      const mine = ours ? ours[i + 1] : NaN
      if (sameBits(v.values[i], mine)) identical++
      else if (!firstMismatch) firstMismatch = { variable: v.name, step: i + 1, original: v.values[i], ours: mine }
    }
  }
  return { name: sim.name, steps: sim.steps, variables: sim.variables.length, compared, identical, firstMismatch }
}
