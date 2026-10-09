// Animation of simulation results: pure logic (no DOM, no Vue).
//
// Configuration:
//   animation = {
//     objects: [{
//       id, sprite,                       // sprite id from src/assets/sprites
//       x, y,                             // variable name, null (centred / on the ground) or a fixed number (world units)
//       angle, angleUnit: 'deg' | 'rad',  // variable name or null
//       size,                             // display size in px
//       trace, label,
//       anchor: 'center' | 'bottom',      // optional: y value marks the bottom of the sprite (heights above ground)
//       arm,                              // optional, 0..1: angle-only object hangs on a rod from the top centre (pendulum)
//       radius,                           // optional: true-to-scale radius in world units (overrides size)
//     }],
//     range: { auto: true, xMin, xMax, yMin, yMax },   // missing limits stay automatic
//     equalScale, speed, loop: 'once' | 'loop' | 'bounce',
//     background: 'none' | 'ground' | 'grid',
//     flipY,                              // optional: y values grow downwards (e.g. a fall distance)
//   }
// Pixel coordinates: origin top left, y down (SVG). World coordinates: y up unless flipY.

export const SPEEDS = [0.25, 0.5, 1, 2, 4, 8]
export const LOOP_MODES = ['once', 'loop', 'bounce']
export const BACKGROUNDS = ['none', 'ground', 'grid']
/** At 1× the whole run takes this many seconds (units of the model time are unknown). */
export const PLAY_SECONDS = 8
const MAX_TRACE_POINTS = 1500

/** Direction the artwork points to (degrees, counter-clockwise from "right") for sprites that turn with the motion. */
export const SPRITE_HEADINGS = { rocket: 90, 'water-rocket': 90, car: 0, arrow: 0 }
/** Radius of the round body inside the 64×64 artwork, for true-to-scale objects (default: half the box). */
export const SPRITE_BODY_RADIUS = { earth: 24, moon: 22, sun: 16, planet: 17, ball: 22, 'ball-small': 22 }

const TIME_NAME = /^(ZEIT|T|TIME|TAG|TAGE|JAHR|JAHRE|STUNDE|STUNDEN|MINUTE|MINUTEN|SEKUNDE|SEKUNDEN)$/
const STEP_NAME = /^(DELTAT|DT|ZEITSCHRITT|TIMESTEP|SCHRITT)$/

// ---------------------------------------------------------------------------
// Names and sprites

/** Upper case, umlauts spelled out, so "Höhe", "Hoehe" and "HOEHE" compare equal. */
export function normalizeName(text) {
  return String(text ?? '')
    .replace(/ä/gi, 'ae').replace(/ö/gi, 'oe').replace(/ü/gi, 'ue').replace(/ß/g, 'ss')
    .toUpperCase()
}

// Specific objects named by a variable or model (order matters: longer words first).
const NAME_SPRITES = [
  [/WASSERRAKETE|WATER.?ROCKET/, 'water-rocket'],
  [/RAKETE|ROCKET/, 'rocket'],
  [/SONNENBLUME|SUNFLOWER|PFLANZE|PLANT/, 'sunflower'],
  [/SATELLIT|SATELLITE|ORBIT|UMLAUFBAHN|^ISS$|(^|\W)ISS(\W|$)/, 'satellite'],
  [/ERDE|EARTH/, 'earth'],
  [/MOND|MOON/, 'moon'],
  [/SONNE|(^|\W)SUN(\W|$)/, 'sun'],
  [/PLANET/, 'planet'],
  [/FALLSCHIRMSPRINGER|SKYDIV|SPRINGER/, 'skydiver'],
  [/FALLSCHIRM|PARACHUTE/, 'parachute'],
  [/PENDEL|PENDULUM/, 'pendulum-bob'],
  [/FEDERPENDEL|SPRING.?MASS/, 'spring-mass'],
  [/BALL/, 'ball'],
  [/AUTO(?!M)|(^|\W)CAR(\W|$)|FAHRZEUG|VEHICLE/, 'car'],
  [/WAGEN|CART/, 'cart'],
  [/KLOTZ|BLOCK|GEWICHTSSTUECK/, 'mass-block'],
  [/HASE|RABBIT|KANINCHEN|BEUTE|PREY/, 'rabbit'],
  [/LUCHS|LYNX|RAEUBER|PREDATOR|FUCHS|FOX/, 'lynx'],
  [/VIRUS|KRANK|INFIZ|INFECT|ERKRANKT/, 'virus'],
  [/GESUND|GENESEN|PERSON|MENSCH|BEVOELKERUNG|POPULATION|EINWOHNER|SCHUELER|PEOPLE/, 'person'],
  [/EISWUERFEL|(^|\W)EIS(\W|$)|ICE/, 'ice-cube'],
  [/TASSE|KAFFEE|KOFFEIN|CAFFEINE|COFFEE|(^|\W)TEE(\W|$)|(^|\W)CUP(\W|$)/, 'cup'],
  [/TROPFEN|(^|\W)DROP|WASSER|WATER|BADEWANNE|BATHTUB/, 'drop'],
  [/TEMPERATUR|TEMPERATURE|THERMO|CELSIUS|KELVIN/, 'thermometer'],
  [/(^|\W)HAUS|HOUSE|ZIMMER|ROOM/, 'house'],
  [/MOLEKUEL|MOLECULE|CO2|KOHLENDIOXID|KONZENTRATION|TEILCHEN|PARTICLE|ATOM|KERN|NUCLE|ZERFALL|DECAY|BARIUM/, 'molecule'],
  [/KONDENSATOR|CAPACITOR|LADUNG|CHARGE/, 'capacitor'],
  [/BATTERIE|BATTERY|AKKU/, 'battery'],
  [/BLITZ|LIGHTNING|SPANNUNG|VOLTAGE/, 'lightning'],
  [/STERN|STAR/, 'star'],
]

// Hints from the rest of the model when the variable itself is generic (Hoehe, S, X …).
const CONTEXT_SPRITES = [
  [/WASSERRAKETE|WATER.?ROCKET/, 'water-rocket'],
  [/RAKETE|ROCKET/, 'rocket'],
  [/SCHUB|THRUST|AUSSTROEM/, (ctx) => (/WASSER|WATER/.test(ctx) ? 'water-rocket' : 'rocket')],
  [/SATELLIT|SATELLITE|ORBIT|(^|\W)ISS(\W|$)|(^|\W)GM(\W|$)|ERDRADIUS|EARTH.?RADIUS|GRAVITATIONSKONSTANTE/, 'satellite'],
  [/BUNGEE|SEIL|ROPE/, 'person'],
  [/BALL|STOSSZAHL|RESTITUTION/, 'ball'],
  [/FALLSCHIRM|PARACHUTE|SKYDIV|SPRINGER/, 'skydiver'],
  [/FEDER|SPRING|DAEMPFUNG|DAMPING/, 'mass-block'],
  [/PENDEL|PENDULUM/, 'pendulum-bob'],
  [/(^|\W)CW(\W|$)|LUFTWIDERSTAND|AIR.?RESISTANCE|REIBUNGSKRAFT/, 'skydiver'],
  [/AUTO(?!M)|(^|\W)CAR(\W|$)|FAHRZEUG|VEHICLE/, 'car'],
]

/**
 * Suggests a sprite id for a variable or model name. Specific words in the name win
 * (Rakete → rocket, Hasen → rabbit); generic names (Hoehe, X, S) are resolved with
 * `context` (model title/id or the other variable names); otherwise `fallback`.
 */
export function suggestSprite(name, context = '', fallback = 'ball') {
  const n = normalizeName(name)
  for (const [re, id] of NAME_SPRITES) if (re.test(n)) return id
  const ctx = normalizeName(Array.isArray(context) ? context.join(' ') : context)
  for (const [re, id] of CONTEXT_SPRITES) if (re.test(ctx)) return typeof id === 'function' ? id(ctx) : id
  for (const [re, id] of NAME_SPRITES) if (re.test(ctx)) return id
  return fallback
}

// ---------------------------------------------------------------------------
// Defaults

/** Unique id for a new object: the first free "obj<n>" within `objects` (deterministic). */
export function newObjectId(objects = []) {
  const used = new Set(objects.map((o) => o.id))
  let n = 1
  while (used.has(`obj${n}`)) n++
  return `obj${n}`
}

/** A complete object with every field set. */
export function makeObject(fields = {}, objects = []) {
  const out = {
    sprite: 'ball',
    x: null, y: null, angle: null, angleUnit: 'rad',
    size: 32, trace: false, label: '',
    anchor: 'center', arm: 0, radius: null,
    ...fields,
  }
  out.id = fields.id ?? newObjectId(objects)
  return out
}

/** Fills missing fields; never mutates the input. */
export function normalizeAnimation(animation = {}) {
  const a = animation ?? {}
  // keep given ids; missing or duplicate ones get the first free "obj<n>"
  const input = a.objects ?? []
  const taken = input.filter((o) => o?.id != null).map((o) => ({ id: o.id }))
  const seen = new Set()
  const objects = []
  for (const o of input) {
    const keep = o?.id != null && !seen.has(o.id)
    const id = keep ? o.id : newObjectId([...taken, ...objects])
    seen.add(id)
    objects.push(makeObject({ ...o, id }, objects))
  }
  return {
    objects,
    range: { auto: true, ...(a.range ?? {}) },
    equalScale: !!a.equalScale,
    speed: Number.isFinite(a.speed) && a.speed > 0 ? a.speed : 1,
    loop: LOOP_MODES.includes(a.loop) ? a.loop : 'once',
    background: BACKGROUNDS.includes(a.background) ? a.background : 'ground',
    flipY: !!a.flipY,
  }
}

/** Deep copy of a configuration (plain JSON data). */
export function cloneAnimation(animation) {
  return JSON.parse(JSON.stringify(animation))
}

const namesOf = (result) => result?.names ?? Object.keys(result?.series ?? {})
const has = (result, name) => typeof name === 'string' && !!result?.series?.[name]

/** Name of the time variable, or null. */
export function findTimeName(result, roles) {
  const names = namesOf(result)
  if (roles) for (const n of names) if (roles.get?.(n) === 'time' && TIME_NAME.test(n)) return n
  if (roles) for (const n of names) if (roles.get?.(n) === 'time' && !STEP_NAME.test(n)) return n
  return names.find((n) => TIME_NAME.test(n)) ?? null
}

function varies(result, name) {
  const s = result.series[name]
  if (!s?.length) return false
  for (let i = 1; i < s.length; i++) if (s[i] !== s[0]) return true
  return false
}

function firstOf(result, candidates, test = () => true) {
  for (const c of candidates) if (has(result, c) && test(c)) return c
  return null
}

const extent = (result, name) => dataExtent([result.series[name]])

/**
 * Sensible preset for a result: x/y pairs (X/Y, SX/SY …) as an orbit with equal scale,
 * heights (HOEHE …) as a vertical motion above the ground, angles as a pendulum, a
 * distance (S, STRECKE …) as a horizontal motion – or, with gravity in the model, as a
 * fall; otherwise time against the first state variables.
 * options.context: model title or id, used to pick sprites.
 */
export function defaultAnimation(result, roles = null, options = {}) {
  const names = namesOf(result)
  const role = (n) => roles?.get?.(n)
  const context = `${options.context ?? ''} ${names.join(' ')}`
  const isVarying = (n) => varies(result, n)
  const time = findTimeName(result, roles)
  const base = { range: { auto: true }, equalScale: false, speed: 1, loop: 'once', background: 'ground', flipY: false }
  const objects = []
  const add = (fields) => objects.push(makeObject(fields, objects))
  const spriteFor = (name, fallback) => suggestSprite(name, context, fallback)

  // 1. two coordinates of one body
  const pairs = [['X', 'Y'], ['SX', 'SY'], ['POSX', 'POSY'], ['XPOS', 'YPOS'], ['ORTX', 'ORTY'], ['RX', 'RY'], ['X1', 'Y1']]
  const pair = pairs.find(([a, b]) => has(result, a) && has(result, b) && (isVarying(a) || isVarying(b)))
  if (pair) {
    const sprite = spriteFor(`${pair[0]}`, 'ball')
    // a central body for orbits (a gravitational parameter or a planet radius in the model)
    const radiusName = firstOf(result, ['ERDRADIUS', 'EARTHRADIUS', 'RADIUSERDE', 'PLANETENRADIUS', 'RADIUS'], (n) => !isVarying(n))
    if (radiusName || has(result, 'GM')) {
      const r = radiusName ? result.series[radiusName][0] : null
      add({ sprite: /MOND|MOON/.test(normalizeName(context)) ? 'moon' : 'earth', x: 0, y: 0, size: 48, radius: Number.isFinite(r) && r > 0 ? r : null })
    }
    add({ sprite, x: pair[0], y: pair[1], size: spriteSize(sprite), trace: true })
    return { ...base, objects, equalScale: true, background: 'grid', loop: 'loop' }
  }

  // 2. a height above the ground
  const height = firstOf(result, ['HOEHE', 'H', 'HEIGHT', 'Y', 'POSITIONY', 'FLUGHOEHE', 'STEIGHOEHE'], isVarying)
  if (height) {
    const sprite = spriteFor(height, 'ball')
    const [lo] = extent(result, height)
    add({ sprite, y: height, size: spriteSize(sprite), trace: false, anchor: lo >= 0 ? 'bottom' : 'center' })
    return { ...base, objects, background: 'ground' }
  }

  // 3. an angle: pendulum
  const angleCandidates = names.filter((n) => /^(WINKEL|PHI|THETA|ANGLE|AUSSCHLAG|AUSLENKWINKEL|ALPHA)/.test(n) && !/GESCHW|BESCHL|SPEED|VELO|ACCEL/.test(n))
  const angle = angleCandidates.find((n) => isVarying(n))
  if (angle) {
    const [lo, hi] = extent(result, angle)
    const unit = /GRAD|DEG/.test(angle) || Math.max(Math.abs(lo), Math.abs(hi)) > 2 * Math.PI ? 'deg' : 'rad'
    add({ sprite: spriteFor(angle, 'pendulum-bob'), angle, angleUnit: unit, size: 32, arm: 0.8 })
    return { ...base, objects, background: 'none', loop: 'loop' }
  }

  // 4. a distance along a line
  const distance = firstOf(result, ['S', 'STRECKE', 'WEG', 'X', 'ORT', 'POSITION', 'AUSLENKUNG', 'POS', 'DISTANCE'], isVarying)
  if (distance) {
    const gravity = firstOf(result, ['ORTSFAKTOR', 'G', 'GRAVITATION', 'FALLBESCHLEUNIGUNG', 'ERDBESCHLEUNIGUNG'])
    if (gravity) {
      const sprite = spriteFor(distance, 'ball')
      add({ sprite, y: distance, size: spriteSize(sprite), trace: false })
      return { ...base, objects, background: 'grid', flipY: true }
    }
    const sprite = spriteFor(distance, 'cart')
    add({ sprite, x: distance, size: spriteSize(sprite), trace: false })
    return { ...base, objects, background: 'ground', loop: 'loop' }
  }

  // 5. time against state variables
  let states = names.filter((n) => role(n) === 'state' && isVarying(n))
  if (!states.length) states = names.filter((n) => n !== time && !STEP_NAME.test(n) && role(n) !== 'constant' && role(n) !== 'time' && isVarying(n))
  if (!states.length) return { ...base, objects: [] }
  const specific = states.filter((n) => suggestSprite(n, '', null) !== null).slice(0, 3)
  const chosen = specific.length ? specific : [states[0]]
  for (const n of chosen) {
    const sprite = spriteFor(n, 'ball-small')
    add({ sprite, x: time, y: n, size: Math.min(36, spriteSize(sprite)), trace: true, label: chosen.length > 1 ? result.display?.get?.(n) ?? n : '' })
  }
  return { ...base, objects, background: 'grid' }
}

const SIZES = { ball: 32, 'ball-small': 20, cart: 48, car: 48, skydiver: 48, parachute: 56, rocket: 48, 'water-rocket': 48, satellite: 40, earth: 48, moon: 32, sun: 56, planet: 40, 'pendulum-bob': 32, 'mass-block': 36, 'spring-mass': 56 }
const spriteSize = (id) => SIZES[id] ?? 40

// ---------------------------------------------------------------------------
// Validation

/**
 * Problems of a configuration: [{ code, object?, field?, name? }].
 * Codes: noObjects, unknownVariable, unknownSprite (only with options.sprites), badRange.
 */
export function validateAnimation(result, animation, options = {}) {
  const a = normalizeAnimation(animation)
  const problems = []
  if (!a.objects.length) problems.push({ code: 'noObjects' })
  const sprites = options.sprites ? new Set(options.sprites) : null
  for (const o of a.objects) {
    for (const field of ['x', 'y', 'angle']) {
      const v = o[field]
      if (v == null || typeof v === 'number') continue
      if (!has(result, v)) problems.push({ code: 'unknownVariable', object: o.id, field, name: String(v) })
    }
    if (sprites && !sprites.has(o.sprite)) problems.push({ code: 'unknownSprite', object: o.id, name: String(o.sprite) })
  }
  if (!a.range.auto) {
    for (const [lo, hi] of [['xMin', 'xMax'], ['yMin', 'yMax']]) {
      const l = a.range[lo]
      const h = a.range[hi]
      if (Number.isFinite(l) && Number.isFinite(h) && !(l < h)) problems.push({ code: 'badRange', field: lo.slice(0, 1) })
    }
  }
  return problems
}

// ---------------------------------------------------------------------------
// Scaling

/** [min, max] over arrays, ignoring non-finite values; null when empty. */
export function dataExtent(arrays) {
  let lo = Infinity
  let hi = -Infinity
  for (const arr of arrays) {
    if (arr == null) continue
    if (typeof arr === 'number') { if (Number.isFinite(arr)) { lo = Math.min(lo, arr); hi = Math.max(hi, arr) } continue }
    for (const v of arr) if (Number.isFinite(v)) { if (v < lo) lo = v; if (v > hi) hi = v }
  }
  return lo === Infinity ? null : [lo, hi]
}

function widen([lo, hi]) {
  if (hi > lo) return [lo, hi]
  const d = Math.abs(lo) > 0 ? Math.abs(lo) * 0.1 : 1
  return [lo - d, hi + d]
}

function niceStep(lo, hi, count) {
  const raw = (hi - lo) / Math.max(1, count)
  if (!(raw > 0)) return 1
  const mag = 10 ** Math.floor(Math.log10(raw))
  return [1, 2, 2.5, 5, 10].map((f) => f * mag).find((s) => s >= raw * (1 - 1e-12))
}

/** Round tick values between lo and hi. */
export function niceTicks(lo, hi, count = 6) {
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || !(hi > lo)) return []
  const step = niceStep(lo, hi, count)
  const out = []
  for (let k = Math.ceil(lo / step - 1e-9); k * step <= hi + step * 1e-9; k++) out.push(Math.abs(k * step) < step * 1e-9 ? 0 : k * step)
  return out
}

/** Value of a position field at step i: variable, fixed number or null. */
function valueAt(result, field, i) {
  if (field == null) return null
  if (typeof field === 'number') return field
  return result.series[field]?.[i] ?? NaN
}

const isArm = (o) => o.arm > 0 && o.angle != null && o.x == null && o.y == null
const objectSize = (o) => (Number.isFinite(o.size) && o.size > 0 ? o.size : 32)

/**
 * Everything that does not depend on the step: world ranges, plot area, scale and
 * the mapping world → pixels. viewport: { width, height }.
 */
export function computeLayout(result, animation, viewport = {}) {
  const a = normalizeAnimation(animation)
  const width = Math.max(1, viewport.width ?? 640)
  const height = Math.max(1, viewport.height ?? 400)
  const objs = a.objects
  const free = objs.filter((o) => !isArm(o))
  const usesX = free.some((o) => o.x != null)
  const usesY = free.some((o) => o.y != null)

  // world ranges (radius of true-to-scale objects included)
  const collect = (axis) => {
    const arrays = []
    for (const o of free) {
      const f = o[axis]
      if (f == null) continue
      const data = typeof f === 'number' ? f : result.series[f]
      arrays.push(data)
      if (o.radius > 0) {
        const ex = dataExtent([data])
        if (ex) arrays.push(ex[0] - o.radius, ex[1] + o.radius)
      }
    }
    return dataExtent(arrays)
  }
  const manual = (auto, minKey, maxKey) => {
    if (a.range.auto) return auto
    const lo = Number.isFinite(a.range[minKey]) ? a.range[minKey] : auto[0]
    const hi = Number.isFinite(a.range[maxKey]) ? a.range[maxKey] : auto[1]
    return lo < hi ? [lo, hi] : auto
  }
  const xRange = manual(widen(collect('x') ?? [0, 1]), 'xMin', 'xMax')
  const yRange = manual(widen(collect('y') ?? [0, 1]), 'yMin', 'yMax')

  // margins: half a sprite everywhere (a full one above bottom-anchored sprites), room for tick labels
  const pixelSized = objs.filter((o) => !(o.radius > 0))
  const maxSize = Math.max(0, ...pixelSized.map(objectSize))
  const half = maxSize / 2 + 4
  const top = objs.some((o) => o.anchor === 'bottom' && o.y != null && !(o.radius > 0)) ? maxSize + 4 : half
  const grid = a.background === 'grid'
  const ground = a.background === 'ground'
  const m = {
    l: half + ((grid || ground) && usesY ? 46 : 0),
    r: half,
    t: Math.max(top, 8),
    b: half + (grid && usesX ? 18 : 0) + (ground ? 14 : 0),
  }
  if (objs.some((o) => o.label)) m.t += 16
  const pw = Math.max(1, width - m.l - m.r)
  const ph = Math.max(1, height - m.t - m.b)

  let kx = pw / (xRange[1] - xRange[0])
  let ky = ph / (yRange[1] - yRange[0])
  let x0 = m.l
  let y0 = m.t
  if (a.equalScale && usesX && usesY) {
    const k = Math.min(kx, ky)
    x0 += (pw - k * (xRange[1] - xRange[0])) / 2
    y0 += (ph - k * (yRange[1] - yRange[0])) / 2
    kx = ky = k
  }
  const plotH = a.equalScale && usesX && usesY ? ky * (yRange[1] - yRange[0]) : ph
  const toPxX = (v) => x0 + (v - xRange[0]) * kx
  const toPxY = a.flipY ? (v) => y0 + (v - yRange[0]) * ky : (v) => y0 + plotH - (v - yRange[0]) * ky

  // the ground: world y = 0 if it lies in the range, else the bottom of the plot
  let groundY = m.t + ph
  if (usesY && !a.flipY && yRange[0] <= 0 && yRange[1] >= 0) groundY = toPxY(0)

  const ticks = {
    x: usesX ? niceTicks(xRange[0], xRange[1], Math.max(3, Math.floor(pw / 80))).map((v) => ({ v, px: toPxX(v) })) : [],
    y: usesY ? niceTicks(yRange[0], yRange[1], Math.max(3, Math.floor(ph / 60))).map((v) => ({ v, px: toPxY(v) })) : [],
  }
  // the part of the plot the data range covers (smaller than plot with equal scale)
  const ys = [toPxY(yRange[0]), toPxY(yRange[1])]
  const area = {
    l: usesX ? toPxX(xRange[0]) : m.l, r: usesX ? toPxX(xRange[1]) : m.l + pw,
    t: usesY ? Math.min(...ys) : m.t, b: usesY ? Math.max(...ys) : m.t + ph,
  }
  return {
    animation: a, width, height, margin: m,
    plot: { l: m.l, t: m.t, w: pw, h: ph }, area,
    xRange, yRange, scale: { x: kx, y: ky }, usesX, usesY, groundY, ticks, toPxX, toPxY,
    centerX: m.l + pw / 2, pivot: { x: m.l + pw / 2, y: m.t }, armLength: Math.min(ph, pw / 2),
  }
}

/** Pixel position of object o at step i (centre of the sprite), or null if a value is not finite. */
function positionAt(result, layout, o, i) {
  const size = displaySize(layout, o)
  if (isArm(o)) {
    const a = toRadians(valueAt(result, o.angle, i), o.angleUnit)
    if (!Number.isFinite(a)) return null
    const L = o.arm * layout.armLength - size / 2
    return { x: layout.pivot.x + L * Math.sin(a), y: layout.pivot.y + L * Math.cos(a) }
  }
  const xv = valueAt(result, o.x, i)
  const yv = valueAt(result, o.y, i)
  if (xv !== null && !Number.isFinite(xv)) return null
  if (yv !== null && !Number.isFinite(yv)) return null
  const x = xv === null ? layout.centerX : layout.toPxX(xv)
  let y
  if (yv === null) y = layout.groundY - size / 2
  else y = layout.toPxY(yv) - (o.anchor === 'bottom' && !layout.animation.flipY ? size / 2 : 0)
  return { x, y }
}

function displaySize(layout, o) {
  if (o.radius > 0) return Math.max(2, 2 * o.radius * Math.min(layout.scale.x, layout.scale.y) * (32 / (SPRITE_BODY_RADIUS[o.sprite] ?? 32)))
  return objectSize(o)
}

const toRadians = (v, unit) => (unit === 'deg' ? (v * Math.PI) / 180 : v)

/** Screen direction of motion around step i (degrees, counter-clockwise from right) or null at rest. */
function motionDirection(result, layout, o, i, steps) {
  for (let w = 1; w <= 40; w++) {
    const a = positionAt(result, layout, o, Math.max(0, i - w))
    const b = positionAt(result, layout, o, Math.min(steps, i + w))
    if (a && b && Math.hypot(b.x - a.x, b.y - a.y) > 0.5) return (Math.atan2(-(b.y - a.y), b.x - a.x) * 180) / Math.PI
    if (i - w <= 0 && i + w >= steps) break
  }
  return null
}

/**
 * Positions and angles of all objects at step `index` in pixels.
 * viewport: { width, height } or a layout from computeLayout (reused while playing).
 * Result: { index, width, height, plot, groundY, ticks, objects: [{ id, sprite, x, y, size,
 *   rotation (SVG degrees, clockwise), mirror, visible, label, values: { x, y, angle }, rod }] }
 */
export function frameAt(result, animation, index, viewport = {}) {
  const layout = viewport.toPxX ? viewport : computeLayout(result, animation, viewport)
  const steps = Math.max(0, result?.steps ?? (Object.values(result?.series ?? {})[0]?.length ?? 1) - 1)
  const i = Math.min(steps, Math.max(0, Math.round(Number.isFinite(index) ? index : 0)))
  const objects = layout.animation.objects.map((o) => {
    const size = displaySize(layout, o)
    const pos = positionAt(result, layout, o, i)
    const values = {
      x: typeof o.x === 'string' ? valueAt(result, o.x, i) : null,
      y: typeof o.y === 'string' ? valueAt(result, o.y, i) : null,
      angle: o.angle != null ? valueAt(result, o.angle, i) : null,
    }
    let rotation = 0
    let mirror = false
    if (isArm(o)) {
      rotation = -(toRadians(values.angle, o.angleUnit) * 180) / Math.PI
    } else if (o.angle != null) {
      rotation = -(toRadians(values.angle, o.angleUnit) * 180) / Math.PI
    } else if (o.sprite in SPRITE_HEADINGS) {
      const dir = motionDirection(result, layout, o, i, steps)
      if (dir !== null) {
        const heading = SPRITE_HEADINGS[o.sprite]
        if (heading === 0 && Math.abs(dir) > 90) { mirror = true; rotation = -(dir - 180) }
        else rotation = -(dir - heading)
        rotation = ((rotation + 540) % 360) - 180
      }
    }
    if (!Number.isFinite(rotation)) rotation = 0
    return {
      id: o.id, sprite: o.sprite, size,
      x: pos ? round1(pos.x) : 0, y: pos ? round1(pos.y) : 0,
      rotation: round1(rotation) || 0, mirror, visible: !!pos,
      label: o.label ?? '', values, trace: !!o.trace,
      rod: isArm(o) && pos ? { x1: layout.pivot.x, y1: layout.pivot.y, x2: round1(pos.x), y2: round1(pos.y) } : null,
    }
  })
  return { index: i, steps, width: layout.width, height: layout.height, plot: layout.plot, area: layout.area, groundY: layout.groundY, ticks: layout.ticks, objects }
}

const round1 = (v) => Math.round(v * 10) / 10

/**
 * Trace of object `objectIndex` from step 0 to `upTo` as SVG polyline points
 * (thinned to at most MAX_TRACE_POINTS, the current point always included).
 */
export function tracePoints(result, layout, objectIndex, upTo) {
  const o = layout.animation.objects[objectIndex]
  if (!o) return ''
  const end = Math.max(0, Math.min(upTo, result.steps ?? upTo))
  const stride = Math.max(1, Math.ceil((result.steps ?? end) / MAX_TRACE_POINTS))
  let out = ''
  const push = (k) => {
    const p = positionAt(result, layout, o, k)
    if (p) out += `${p.x.toFixed(1)},${p.y.toFixed(1)} `
  }
  for (let k = 0; k < end; k += stride) push(k)
  push(end)
  return out.trim()
}

/** Steps per second while playing at `speed` (1× plays the whole run in PLAY_SECONDS). */
export function stepsPerSecond(result, speed = 1) {
  return Math.max(1, (result?.steps ?? 0) / PLAY_SECONDS) * speed
}

/**
 * Next playback position. pos: fractional step, dir: +1/-1.
 * Returns { pos, dir, done } – done when 'once' reached the end.
 */
export function advance(pos, dir, delta, steps, loop) {
  let p = pos + dir * delta
  if (steps <= 0) return { pos: 0, dir, done: true }
  if (loop === 'loop') {
    if (p > steps) p = p % (steps + 1)
    if (p < 0) p = 0
    return { pos: p, dir, done: false }
  }
  if (loop === 'bounce') {
    let d = dir
    for (let guard = 0; (p > steps || p < 0) && guard < 8; guard++) {
      if (p > steps) { p = 2 * steps - p; d = -1 }
      if (p < 0) { p = -p; d = 1 }
    }
    return { pos: Math.min(steps, Math.max(0, p)), dir: d, done: false }
  }
  if (p >= steps) return { pos: steps, dir, done: true }
  if (p <= 0 && dir < 0) return { pos: 0, dir, done: true }
  return { pos: p, dir, done: false }
}

/** Variable names an animation reads (for the readout). */
export function usedVariables(animation) {
  const out = []
  for (const o of normalizeAnimation(animation).objects) {
    for (const f of ['x', 'y', 'angle']) if (typeof o[f] === 'string' && !out.includes(o[f])) out.push(o[f])
  }
  return out
}
