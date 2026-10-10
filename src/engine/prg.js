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
//     31 bytes of display options (found by changing them in the legacy program
//       and comparing the saved files): u8 type (0 line, 1 points, 2 points
//       and line, 3 bars), u8 line style at 5 (Windows pen style: 0 solid,
//       1 dashed, 2 dotted, 3 dash-dot, 4 dash-dot-dot, 5 invisible), u32 line
//       width × 10 at 6, u32 line colour at 10, u32 point form at 14 (0 cross,
//       1 circle, 2 disc), u32 point size at 18, u32 point colour at 22; colours
//       are Windows COLORREF values (0x00BBGGRR),
//     u32 length + picture used as plot marker (file name or embedded PNG data),
//     18 bytes of display options
//   u32 length + name of the x-axis variable, u32 length + name of a
//   y-axis variable, u32 number of steps,
//   followed by the graphical model (nodes, links) of variable length.
// Texts on the page (labels set with the text tool, also the automatic tick
// labels) are text objects: f64 x, y, width, height (cm) at -61…-37 before the
// font name (the type byte 0x08 just before, a tick mark 01 2d 00 00 00 before tick
// labels), a bold flag at -4, then u8 1, u8 1, u32 length + font name, f64 font
// size, and 88 bytes after the name a u32 count of 78-byte character records
// (the character in the first byte). The first page object is the graph frame
// (type 0x40, f64 x, y, width, height); tick labels sit inside axis groups, the
// x-axis group (type 0x3f after a tick mark) starts with its f64 x offset.
// Everything else (worksheet, graphics) is skipped here: the simulations are
// located by scanning for variable blocks and the program preceding them.

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
  const record = { name: name.text, start: r.f64(q + 1), values, plotted: r.u8(q + 9) === 1, style: styleAt(r, options) }
  return { record, owner: owner.text, next }
}

const TYPES = ['line', 'points', 'both', 'bars']
const MARKERS = ['cross', 'circle', 'disc']

// COLORREF 0x00BBGGRR → '#rrggbb'; null for black (the legacy default) and system colours
function colorOf(ref) {
  if (ref === 0 || ref > 0xffffff) return null
  const hex = (v) => v.toString(16).padStart(2, '0')
  return `#${hex(ref & 0xff)}${hex((ref >> 8) & 0xff)}${hex((ref >> 16) & 0xff)}`
}

function styleAt(r, o) {
  const width = r.u32(o + 6) / 10
  return {
    mode: TYPES[r.u8(o)] ?? 'line',
    dash: r.u8(o + 5) <= 5 ? r.u8(o + 5) : 0,
    width: width > 0 && width <= 20 ? width : 1,
    color: colorOf(r.u32(o + 10)),
    marker: MARKERS[r.u32(o + 14)] ?? 'disc',
    markerSize: Math.min(20, Math.max(1, r.u32(o + 18) || 4)),
    markerColor: colorOf(r.u32(o + 22)),
  }
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

// the legacy default: black solid line of width 1
function isDefaultStyle(s) {
  return s.mode === 'line' && s.dash === 0 && s.width === 1 && !s.color
}

const TICK_MARK = [0x01, 0x2d, 0x00, 0x00, 0x00]

function textObjects(r, bytes) {
  const out = []
  for (let i = 70; i < r.len - 12; i++) {
    if (bytes[i] !== 1 || bytes[i + 1] !== 1) continue
    const a = i + 2
    const L = r.u32(a)
    if (L < 1 || L > 31 || a + 4 + L > r.len) continue
    const font = r.str(a + 4, L)
    if (!/^[A-Za-z][A-Za-z ]*$/.test(font)) continue
    const nameEnd = a + 4 + L
    const countAt = nameEnd + 88
    if (countAt + 4 > r.len) continue
    const n = r.u32(countAt)
    if (n < 1 || n > 500 || countAt + 4 + 78 * n > r.len) continue
    let text = ''
    for (let k = 0; k < n; k++) text += decoder.decode(bytes.subarray(countAt + 4 + 78 * k, countAt + 5 + 78 * k))
    out.push({
      text,
      x: r.f64(a - 61), y: r.f64(a - 53), w: r.f64(a - 45), h: r.f64(a - 37),
      size: r.f64(nameEnd),
      bold: bytes[a - 4] === 1,
      tick: TICK_MARK.every((v, k) => bytes[a - 67 + k] === v),
    })
    i = countAt + 4 + 78 * n - 1
  }
  return out
}

const tickValue = (t) => (/^-?\d+(,\d+)?$/.test(t.trim()) ? Number(t.trim().replace(',', '.')) : null)

// page position (cm) → data value, from two tick labels of an axis
function axisMap(points) {
  if (points.length < 2) return null
  const [p1, v1] = points[0]
  const [p2, v2] = points[points.length - 1]
  if (p1 === p2) return null
  return (p) => v1 + ((p - p1) * (v2 - v1)) / (p2 - p1)
}

/**
 * The graph page: text labels placed with the text tool, in data units of the
 * graph (null where an axis has no readable tick labels to calibrate with, e.g.
 * 2·10⁵ style ticks), and the axis ranges shown. Returns { labels, axes }.
 */
export function readPrgPage(bytes) {
  if (!isPrgFile(bytes)) return { labels: [], axes: null }
  const r = reader(bytes)
  const texts = textObjects(r, bytes)
  const isFrame = bytes[58] === 0x40
  const frame = isFrame ? { x: r.f64(59), y: r.f64(67), w: r.f64(75), h: r.f64(83) } : null
  // x-axis group: x, y (the height of the x axis), width (the axis length)
  let group = { x: 0, y: null, w: null }
  for (let i = 58; i < r.len - 30; i++) {
    if (TICK_MARK.every((v, k) => bytes[i + k] === v) && bytes[i + 5] === 0x3f) { group = { x: r.f64(i + 6), y: r.f64(i + 14), w: r.f64(i + 22) }; break }
  }
  const groupX = group.x
  const ticks = texts.filter((t) => t.tick && tickValue(t.text) !== null)
  // x-axis tick labels share one y; the others belong to the y axis
  const byY = new Map()
  for (const t of ticks) byY.set(t.y, [...(byY.get(t.y) ?? []), t])
  const xTicks = [...byY.values()].sort((p, q) => q.length - p.length)[0] ?? []
  // y-axis tick labels are right-aligned at the axis, in the font size of the x axis
  // (other tick groups belong to further graphs on the page)
  const byRight = new Map()
  for (const t of ticks) {
    if (xTicks.includes(t) || Math.abs(t.size - (xTicks[0]?.size ?? t.size)) > 0.01) continue
    const key = Math.round((t.x + t.w) * 100)
    byRight.set(key, [...(byRight.get(key) ?? []), t])
  }
  const yTicks = [...byRight.values()].sort((p, q) => q.length - p.length)[0] ?? []
  const f = frame ?? { x: 0, y: 0, w: 0, h: 0 }
  const toX = axisMap(xTicks.map((t) => [f.x + groupX + t.x + t.w / 2, tickValue(t.text)]))
  const toY = axisMap(yTicks.map((t) => [f.y + t.y + t.h / 2, tickValue(t.text)]))
  const share = (v) => Math.min(1, Math.max(0, v))
  // rounded to 1/10 000 of the range, so that 7e-15 becomes 0
  const nice = (a, b) => {
    const step = 10 ** Math.floor(Math.log10(Math.abs(b - a) / 1e4))
    return [a, b].map((v) => Number((Math.round(v / step) * step).toPrecision(12)))
  }
  // the axis ranges shown in the legacy program: x along the x axis, y from the
  // x axis up to the top of the frame
  let axes = null
  if (toX && toY && frame && group.w > 0 && Number.isFinite(group.y)) {
    const [xMin, xMax] = nice(toX(f.x + groupX), toX(f.x + groupX + group.w))
    const [yMin, yMax] = nice(toY(f.y + group.y), toY(f.y))
    axes = { xMin, xMax, yMin, yMax }
  }
  const labels = texts.filter((t) => !t.tick && t.text.trim() && Number.isFinite(t.x) && Number.isFinite(t.y)).map((t) => {
    const baseline = t.y + t.h * 0.8 // the label's left end on its baseline
    return {
      text: t.text.trim(),
      x: toX ? toX(t.x) : null,
      y: toY ? toY(baseline) : null,
      // where the label sits in the graph frame (0…1, y upwards), for axes without
      // readable tick labels
      fx: frame?.w ? share((t.x - f.x) / f.w) : 0.5,
      fy: frame?.h ? share(1 - (baseline - f.y) / f.h) : 0.5,
      size: t.size >= 16 ? 'l' : t.size <= 10 ? 's' : 'm',
      bold: t.bold,
    }
  })
  return { labels, axes: axes && axes.xMin < axes.xMax && axes.yMin < axes.yMax ? axes : null }
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
            plot: x ? {
              x,
              y: variables.filter((v) => v.plotted && v.name !== x).map((v) => v.name),
              styles: Object.fromEntries(variables.filter((v) => v.plotted).map((v) => [v.name, v.style])),
            } : null,
          })
          p = q
          continue
        }
      }
    }
    p++
  }
  // curve styles only when the file sets any: then all its curves keep their look,
  // otherwise the automatic palette is used
  const styled = simulations.some((sim) => Object.values(sim.plot?.styles ?? {}).some((st) => !isDefaultStyle(st)))
  for (const sim of simulations) if (sim.plot && !styled) sim.plot.styles = {}
  if (simulations.length) simulations[0].page = readPrgPage(bytes)
  return simulations
}
