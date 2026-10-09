// Reads simulations from PRG files (signature "MOEBIUS30").
//
// Layout of a simulation block (reverse engineered from reference files):
//   u32 length + simulation name (cp1252)
//   u32 line count, per line: u32 length + text   → program
//   u32 (unknown, so far always 0)
//   u32 variable count, per variable:
//     u32 length + name (upper case unless case sensitivity is on)
//     5 option bytes, f64 initial value, 2 option bytes,
//     u32 count N, N × f64 result values after each pass,
//     53 bytes of display options
// Everything else (worksheet, text, graphics) is skipped here.

const RECORD_TRAILER = 53
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
    str: (p, n) => decoder.decode(bytes.subarray(p, p + n)),
    hasControl: (p, n) => bytes.subarray(p, p + n).some((c) => c < 9),
  }
}

function variableAt(r, p) {
  if (p + 4 > r.len) return null
  const L = r.u32(p)
  if (L < 1 || L > 64 || p + 4 + L + 19 > r.len) return null
  const name = r.str(p + 4, L)
  if (!NAME.test(name)) return null
  const q = p + 4 + L
  const n = r.u32(q + 15)
  if (n > 20000 || q + 19 + 8 * n + RECORD_TRAILER > r.len) return null
  const values = new Float64Array(n)
  for (let i = 0; i < n; i++) values[i] = r.f64(q + 19 + 8 * i)
  return { record: { name, start: r.f64(q + 5), values }, next: q + 19 + 8 * n + RECORD_TRAILER }
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
    return { lines, name }
  }
  return null
}

/** Returns all detected simulations with program, initial values and stored results. */
export function readPrg(bytes) {
  if (!isPrgFile(bytes)) throw Object.assign(new Error('Unsupported PRG format (signature MOEBIUS30 missing).'), { code: 'unsupportedFormat' })
  const r = reader(bytes)
  const simulations = []
  let p = 0
  while (p < r.len - 8) {
    const count = r.u32(p)
    if (count >= 1 && count <= 200) {
      const variables = []
      let q = p + 4
      for (let i = 0; i < count; i++) {
        const v = variableAt(r, q)
        if (!v) break
        variables.push(v.record)
        q = v.next
      }
      if (variables.length === count) {
        const program = programBefore(r, p)
        if (program) {
          simulations.push({
            name: program.name,
            source: program.lines.join('\n'),
            steps: Math.max(...variables.map((v) => v.values.length)),
            variables,
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
