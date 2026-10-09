// Pure helpers for the 3D chart: nice ticks, an orthographic projection with two
// rotation angles, and the choice of back walls and labelled box edges.
//
// World coordinates: the data box is centred at the origin with half extents BOX
// (x to the right, y into the depth, z up). yaw turns the box about the vertical
// z axis, pitch tilts the viewer upwards (0° = looking horizontally, 90° = from above).

export const DEG = Math.PI / 180
/** Half extents of the drawn box; slightly flat so it suits a landscape frame. */
export const BOX = [1, 1, 0.78]

/** Preset views as { yaw, pitch } in degrees. */
export const VIEWS = {
  oblique: { yaw: -32, pitch: 24 },
  xy: { yaw: 0, pitch: 90 },
  xz: { yaw: 0, pitch: 0 },
  yz: { yaw: -90, pitch: 0 },
}

export function niceStep(lo, hi, count) {
  const raw = (hi - lo) / count
  const mag = 10 ** Math.floor(Math.log10(raw))
  return [1, 2, 2.5, 5, 10].map((f) => f * mag).find((s) => s >= raw * (1 - 1e-12))
}

/** "Nice" tick values between lo and hi (same rule as the 2D chart). */
export function niceTicks(lo, hi, count = 5) {
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return [0, 1]
  if (lo === hi) { lo -= 1; hi += 1 }
  const step = niceStep(lo, hi, count)
  const out = []
  for (let k = Math.ceil(lo / step - 1e-9); k * step <= hi + step * 1e-9; k++) out.push(Math.abs(k * step) < step * 1e-9 ? 0 : k * step)
  return out
}

/** Data range [min, max] of the finite values, widened when empty or constant. */
export function dataRange(values) {
  let lo = Infinity
  let hi = -Infinity
  for (const v of values ?? []) if (Number.isFinite(v)) { if (v < lo) lo = v; if (v > hi) hi = v }
  if (lo === Infinity) return [0, 1]
  if (lo === hi) return [lo - 1, hi + 1]
  return [lo, hi]
}

/** Range widened outward to whole multiples of the nice tick step. */
export function niceDomain(lo, hi, count = 5) {
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return [0, 1]
  if (lo === hi) { lo -= 1; hi += 1 }
  const step = niceStep(lo, hi, count)
  const a = Math.floor(lo / step + 1e-9) * step
  const b = Math.ceil(hi / step - 1e-9) * step
  return [Math.abs(a) < step * 1e-9 ? 0 : a, Math.abs(b) < step * 1e-9 ? 0 : b]
}

/** Maps v from [lo, hi] to [-half, half]. */
export function normalize(v, [lo, hi], half = 1) {
  return ((v - lo) / (hi - lo) * 2 - 1) * half
}

export const clampPitch = (p) => Math.min(90, Math.max(0, p))
/** Yaw wrapped to (-180, 180]. */
export function wrapYaw(y) {
  const r = ((y % 360) + 360) % 360
  return r > 180 ? r - 360 : r
}

/**
 * Rotation of a world point: returns [right, up, depth] in view space
 * (depth > 0 = farther from the viewer).
 */
export function rotate([x, y, z], yaw, pitch) {
  const ct = Math.cos(yaw * DEG)
  const st = Math.sin(yaw * DEG)
  const cp = Math.cos(pitch * DEG)
  const sp = Math.sin(pitch * DEG)
  const x1 = x * ct - y * st
  const y1 = x * st + y * ct
  return [x1, z * cp + y1 * sp, y1 * cp - z * sp]
}

/**
 * Projector to screen pixels (y grows downwards). `distance` > 0 adds a light
 * perspective (viewer at that distance from the centre); Infinity = orthographic.
 */
export function makeProjector({ yaw, pitch, scale = 1, cx = 0, cy = 0, distance = Infinity }) {
  return (p) => {
    const [r, u, d] = rotate(p, yaw, pitch)
    const f = Number.isFinite(distance) ? distance / (distance + d) : 1
    return [cx + r * scale * f, cy - u * scale * f, d]
  }
}

/**
 * For each axis the side (-1 or +1) whose box face is farther from the viewer –
 * those three faces are the back walls that carry the grid. Ties (face seen
 * edge-on) go to -1, so the floor stays the floor in side views.
 */
export function backSides(yaw, pitch) {
  return [0, 1, 2].map((i) => {
    const p = [0, 0, 0]
    p[i] = BOX[i]
    const plus = rotate(p, yaw, pitch)[2]
    return plus > 1e-9 ? 1 : -1
  })
}

/** The 12 box edges as pairs of corner points. */
export function boxEdges() {
  const out = []
  for (let axis = 0; axis < 3; axis++) {
    const [j, k] = [0, 1, 2].filter((i) => i !== axis)
    for (const a of [-1, 1]) for (const b of [-1, 1]) {
      const p = [0, 0, 0]
      const q = [0, 0, 0]
      p[axis] = -BOX[axis]; q[axis] = BOX[axis]
      p[j] = q[j] = a * BOX[j]
      p[k] = q[k] = b * BOX[k]
      out.push({ axis, sides: [a, b], from: p, to: q })
    }
  }
  return out
}

/**
 * The box edge that carries the tick labels of `axis`, chosen on the outline:
 * x and y use the lowest edge on screen, z the leftmost; ties go to the nearer edge.
 * Returns { from, to, outward: [dx, dy] (unit, screen space), length (projected,
 * relative to the unprojected length) } or null when the axis points at the viewer.
 */
export function labelEdge(axis, yaw, pitch) {
  const project = makeProjector({ yaw, pitch })
  const dir = [0, 0, 0]
  dir[axis] = 1
  const [dx, dy] = project(dir)
  const length = Math.hypot(dx, dy)
  if (length < 0.2) return null
  let best = null
  for (const e of boxEdges().filter((e) => e.axis === axis)) {
    const mid = e.from.map((v, i) => (v + e.to[i]) / 2)
    const [mx, my, md] = project(mid)
    const key = axis === 2 ? mx : -my
    if (!best || key < best.key - 1e-6 || (Math.abs(key - best.key) <= 1e-6 && md < best.md)) best = { key, md, mx, my, edge: e }
  }
  // perpendicular to the edge on screen, pointing away from the box centre
  let ox = -dy / length
  let oy = dx / length
  if (ox * best.mx + oy * best.my < 0) { ox = -ox; oy = -oy }
  return { from: best.edge.from, to: best.edge.to, outward: [ox, oy], length }
}

/**
 * Pixel scale so the box fits w×h for any yaw at this pitch (no zooming while
 * turning). `pad` is the margin for labels: a number for every side or { x, top, bottom }.
 */
export function fitScale(w, h, pitch, pad = 56) {
  const { x, top, bottom } = typeof pad === 'number' ? { x: pad, top: pad, bottom: pad } : pad
  const diag = Math.hypot(BOX[0], BOX[1])
  const cp = Math.cos(pitch * DEG)
  const sp = Math.sin(pitch * DEG)
  const width = 2 * diag
  const height = 2 * (BOX[2] * cp + diag * sp)
  return Math.max(10, Math.min((w - 2 * x) / width, (h - top - bottom) / height))
}

/** Polyline points "x,y x,y …" of the projected data; non-finite points are skipped. */
export function projectPoints(xs, ys, zs, project, toWorld) {
  let out = ''
  const n = Math.min(xs.length, ys.length, zs.length)
  for (let k = 0; k < n; k++) {
    const p = toWorld(xs[k], ys[k], zs[k])
    if (!p.every(Number.isFinite)) continue
    const [sx, sy] = project(p)
    out += `${sx.toFixed(1)},${sy.toFixed(1)} `
  }
  return out.trim()
}

/** Shortest-way interpolation between two yaw angles. */
export function lerpYaw(a, b, t) {
  const d = wrapYaw(b - a)
  return wrapYaw(a + d * t)
}

/**
 * Approximate box { l, r, t, b } of a single-line label (vertically centred at y)
 * for overlap checks; charWidth is the average glyph width in pixels.
 */
export function textBox(x, y, text, anchor = 'start', charWidth = 6.6, height = 14) {
  const width = String(text).length * charWidth
  const l = anchor === 'end' ? x - width : anchor === 'middle' ? x - width / 2 : x
  return { l, r: l + width, t: y - height / 2, b: y + height / 2 }
}

/** Whether two boxes overlap (a gap of `gap` pixels counts as overlap). */
export function overlaps(a, b, gap = 2) {
  return a.l < b.r + gap && b.l < a.r + gap && a.t < b.b + gap && b.t < a.b + gap
}
