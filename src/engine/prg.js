// Reads simulations from PRG files (signature "MOEBIUS30").
//
// Layout of the simulation section (reverse engineered from reference files):
//   u32 simulation count, then per simulation:
//   u32 length + simulation name (cp1252)
//   u32 line count, per line: u32 length + text   → program (may end in empty lines)
//   u32 (unknown, so far always 0)
//   u32 variable count, per variable:
//     u32 length + name (upper case unless case sensitivity is on)
//     u32 length + name of the owning simulation (empty in files with a single
//       simulation, set in files with several simulations)
//     u8 flag (1 = initial value set, 0 = calculated before first use)
//     f64 initial value, 2 option bytes (1st: shown as a curve in the graph,
//       2nd: probably shown in the table),
//     u32 count N, N × f64 result values after each pass (N = 0 for variables
//       whose results were not stored, e.g. constants),
//     31 bytes of display options (curve style, colour …),
//     u32 length + picture used as plot marker (file name or embedded PNG data),
//     18 bytes of display options
//   u32 length + name of the x-axis variable, u32 length + name of a
//   y-axis variable, u32 number of steps,
//   followed by the graphical model (nodes, links) of variable length.
// Everything else (worksheet, text, graphics) is skipped here: the simulations
// are located by scanning for variable blocks and the program preceding them.

const OPTIONS_BEFORE_PICTURE = 31
const OPTIONS_AFTER_PICTURE = 18
const MAX_VALUES = 20000
const decoder = new TextDecoder('windows-1252')
const NAME = /^[A-Za-zÄÖÜäöüß_][A-Za-z0-9ÄÖÜäöüß_]*$/

export function isPrgFile(bytes) {
  return decoder.decode(bytes.subarray(0, 9)) === 'MOEBIUS30'
}

function reader(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  return {
    len: bytes.length,
    u32: (p) => view.getUint32(p, true),
    f64: (p) => view.getFloat64(p, true),
    u8: (p) => view.getUint8(p),
    str: (p, n) => decoder.decode(bytes.subarray(p, p + n)),
    hasControl: (p, n) => bytes.subarray(p, p + n).some((c) => c < 9),
  }
}

// Length-prefixed text without control characters, or null.
function textAt(r, p, max) {
  if (p + 4 > r.len) return null
  const L = r.u32(p)
  if (L > max || p + 4 + L > r.len || r.hasControl(p + 4, L)) return null
  return { text: r.str(p + 4, L), next: p + 4 + L }
}

function variableAt(r, p) {
  const name = textAt(r, p, 64)
  if (!name || !NAME.test(name.text)) return null
  const owner = textAt(r, name.next, 255)
  if (!owner) return null
  const q = owner.next
  if (q + 15 > r.len) return null
  const n = r.u32(q + 11)
  const options = q + 15 + 8 * n
  if (n > MAX_VALUES || options + OPTIONS_BEFORE_PICTURE + 4 > r.len) return null
  const picture = r.u32(options + OPTIONS_BEFORE_PICTURE)
  const next = options + OPTIONS_BEFORE_PICTURE + 4 + picture + OPTIONS_AFTER_PICTURE
  if (next > r.len) return null
  const values = new Float64Array(n)
  for (let i = 0; i < n; i++) values[i] = r.f64(q + 15 + 8 * i)
  return { record: { name: name.text, start: r.f64(q + 1), values, plotted: r.u8(q + 9) === 1 }, owner: owner.text, next }
}

// Axis names and number of steps stored after the variable block.
function axesAt(r, p) {
  const x = textAt(r, p, 64)
  const y = x && textAt(r, x.next, 64)
  if (!y || y.next + 4 > r.len) return null
  if (![x.text, y.text].every((t) => t === '' || NAME.test(t))) return null
  return { x: x.text, steps: r.u32(y.next) }
}

function programBefore(r, varOffset) {
  for (let start = Math.max(0, varOffset - 40000); start < varOffset - 4; start++) {
    const n = r.u32(start)
    if (n < 1 || n > 4000) continue
    let p = start + 4
    const lines = []
    let ok = true
    for (let i = 0; i < n; i++) {
      if (p + 4 > varOffset) { ok = false; break }
      const L = r.u32(p)
      if (L > 2000 || p + 4 + L > varOffset || r.hasControl(p + 4, L)) { ok = false; break }
      lines.push(r.str(p + 4, L))
      p += 4 + L
    }
    if (!ok || p + 4 !== varOffset) continue
    let name = ''
    for (let L = 0; L <= 255 && L + 4 <= start; L++) {
      if (r.u32(start - 4 - L) === L && !r.hasControl(start - L, L)) { name = r.str(start - L, L); break }
    }
    while (lines.length && lines[lines.length - 1].trim() === '') lines.pop()
    return { lines, name }
  }
  return null
}

/**
 * Returns all detected simulations with program, initial values and stored
 * results. `hasResults` is false when the file stores no result values for a
 * simulation (its variables then have empty `values`).
 */
export function readPrg(bytes) {
  if (!isPrgFile(bytes)) throw Object.assign(new Error('Unsupported PRG format (signature MOEBIUS30 missing).'), { code: 'unsupportedFormat' })
  const r = reader(bytes)
  const simulations = []
  let p = 0
  while (p < r.len - 8) {
    const count = r.u32(p)
    if (count >= 1 && count <= 200) {
      const variables = []
      const owners = new Set()
      let q = p + 4
      for (let i = 0; i < count; i++) {
        const v = variableAt(r, q)
        if (!v) break
        variables.push(v.record)
        owners.add(v.owner)
        q = v.next
      }
      if (variables.length === count && owners.size === 1) {
        const program = programBefore(r, p)
        if (program) {
          const stored = Math.max(...variables.map((v) => v.values.length))
          const axes = axesAt(r, q)
          const x = variables.find((v) => v.name === axes?.x)?.name ?? null
          simulations.push({
            name: program.name || [...owners][0],
            source: program.lines.join('\n'),
            steps: stored || axes?.steps || 0,
            hasResults: stored > 0,
            variables,
            // graph settings saved with the file: x-axis variable and the curves shown
            plot: x ? { x, y: variables.filter((v) => v.plotted && v.name !== x).map((v) => v.name) } : null,
          })
          p = q
          continue
        }
      }
    }
    p++
  }
  return simulations
}
