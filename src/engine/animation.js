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
//       fill,                             // optional: 'vessel' | 'thermometer' | 'bar' – a gauge that fills up to the
//                                         //   value of y (own scale min..max, null = automatic); x is ignored, gauges
//                                         //   stand side by side. The sprite floats on the level (vessel), sits on top
//                                         //   of the column (bar) or stands next to the thermometer.
//       min, max, width,                  // optional, gauges only: scale limits and column width in px
//       scaleBy,                          // optional variable: the sprite's area follows |value| / max |value|
//       rope,                             // optional: { x, y, style: 'rope' | 'stem' | 'spring', mount } – a line from
//                                         //   the anchor point (world units, null = same as the object) to the object;
//                                         //   mount draws a bridge (anchor above) or a wall (anchor to the side)
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
export const FILL_STYLES = ['vessel', 'thermometer', 'bar']
export const ROPE_STYLES = ['rope', 'stem', 'spring']
/** Column width in px of a gauge when `width` is not set. */
export const GAUGE_WIDTHS = { vessel: 120, thermometer: 18, bar: 56 }
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
  [/CO2|KOHLENDIOXID|CARBON.?DIOXIDE/, 'co2'],
  [/ATOM|(^|\W)KERN|NUCLE|ZERFALL|ZERFAELLE|DECAY|BARIUM|RADIOAKTIV|RADIOACTIVE|ISOTOP/, 'nucleus'],
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
  [/BADEENTE|RUBBER.?DUCK|(^|\W)ENTE(\W|$)|(^|\W)DUCK/, 'duck'],
  [/FLAMME|FLAME|FEUER|FIRE|HEIZUNG|HEATER|BRENNER|BURNER/, 'flame'],
  [/AUTO(?!M)|(^|\W)CAR(\W|$)|FAHRZEUG|VEHICLE/, 'car'],
  [/WAGEN|CART/, 'cart'],
  [/KLOTZ|BLOCK|GEWICHTSSTUECK/, 'mass-block'],
  [/HASE|RABBIT|KANINCHEN|BEUTE|PREY/, 'rabbit'],
  [/LUCHS|LYNX|RAEUBER|PREDATOR|FUCHS|FOX/, 'lynx'],
  [/VIRUS|KRANK|INFIZ|INFECT|ERKRANKT/, 'virus'],
  [/GENESEN|RECOVERED|IMMUN/, 'person-recovered'],
  [/GESUND|PERSON|MENSCH|BEVOELKERUNG|POPULATION|EINWOHNER|SCHUELER|PEOPLE|KOERPER|(^|\W)BODY|(^|\W)BLUT|BLOOD/, 'person'],
  [/EISWUERFEL|(^|\W)EIS(\W|$)|ICE/, 'ice-cube'],
  [/TASSE|KAFFEE|KOFFEIN|CAFFEINE|COFFEE|(^|\W)TEE(\W|$)|(^|\W)CUP(\W|$)|MAGEN|STOMACH|ABKUEHL|COOLING/, 'cup'],
  [/TROPFEN|(^|\W)DROP|WASSER|WATER|BADEWANNE|BATHTUB/, 'drop'],
  [/TEMPERATUR|TEMPERATURE|THERMO|CELSIUS|KELVIN/, 'thermometer'],
  [/(^|\W)HAUS|HOUSE|ZIMMER|ROOM/, 'house'],
  [/MOLEKUEL|MOLECULE|TEILCHEN|PARTICLE/, 'molecule'],
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
  [/BADEWANNE|BATHTUB|(^|\W)WANNE|(^|\W)TUB(\W|$)/, 'duck'],
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
    fill: null, min: null, max: null, width: null, scaleBy: null, rope: null,
    ...fields,
  }
  out.id = fields.id ?? newObjectId(objects)
  if (!FILL_STYLES.includes(out.fill)) out.fill = null
  out.rope = normalizeRope(out.rope)
  return out
}

const numOrNull = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

/** A rope as { x, y, style, mount } or null; `true` means "hanging from height 0". */
function normalizeRope(rope) {
  if (!rope) return null
  const r = rope === true ? { y: 0 } : rope
  return {
    x: numOrNull(r.x), y: numOrNull(r.y),
    style: ROPE_STYLES.includes(r.style) ? r.style : 'rope',
    mount: !!r.mount,
  }
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

// Words that turn a variable or model into a gauge scene.
const LEVEL_CONTEXT = /BADEWANNE|BATHTUB|(^|\W)WANNE|(^|\W)TUB(\W|$)|TANK|BEHAELTER|CONTAINER|FUELLSTAND|WASSERSTAND|PEGEL|ABFLUSS|ZULAUF|ZUFLUSS|INFLOW|OUTFLOW|DRAIN/
const LEVEL_NAME = /FUELLSTAND|WASSERSTAND|PEGEL|LEVEL|FILL/
const TEMPERATURE_NAMES = [/CELSIUS/, /TEMPERATUR|TEMPERATURE|(^|_)TEMP$/, /^T$/]
const HEAT_CONTEXT = /WAERME|HEAT|STRAHLUNG|RADIATION|ENERGIE|ENERGY|KUEHL|COOL|HEIZ|THERMO|KELVIN|SIGMA|ALBEDO/
const ICE_NAME = /^(EIS|EISMASSE|EISWUERFEL|ICE|ICEMASS)$/
const LIQUID_NAME = /GETRAENK|DRINK|WASSER|WATER|FLUESSIG|LIQUID|LIMO|SAFT|JUICE/
const ANIMALS = new Set(['rabbit', 'lynx'])

/** Round a gauge scale outwards to a nice step. */
function niceScale(lo, hi, padTop = 0) {
  const step = niceStep(lo, hi > lo ? hi : lo + 1, 5)
  const top = hi + (hi - lo) * padTop
  return [Math.floor(lo / step + 1e-9) * step, Math.ceil(top / step - 1e-9) * step]
}

/** What the thermometer stands next to: the thing whose temperature it is. */
function temperatureCompanion(ctx) {
  if (/ALBEDO|SOLAR|ERDE|EARTH|KLIMA|CLIMATE|TREIBHAUS|GREENHOUSE|ENERGIEBILANZ|ENERGY.?BALANCE/.test(ctx)) return 'earth'
  if (/THERMOSTAT|HEIZUNG|HEATING|HAUS|HOUSE|ZIMMER|ROOM|WOHNUNG/.test(ctx)) return 'house'
  if (/KAFFEE|COFFEE|TEE|TEA|TASSE|CUP|ABKUEHL|COOLING|NEWTON/.test(ctx)) return 'cup'
  return 'thermometer'
}

/**
 * Sensible preset for a result: x/y pairs (X/Y, SX/SY …) as an orbit with equal scale,
 * a water level as a filling vessel, heights (HOEHE …) as a vertical motion above the
 * ground, angles as a pendulum, a distance (S, STRECKE …) as a horizontal motion (on a
 * spring if the model has one) – or, with gravity in the model, as a fall (on a rope for a
 * bungee jump); temperatures as a thermometer, amounts as columns; animal populations and
 * everything else as time against the state variables.
 * options.context: model title or id, used to pick sprites.
 */
export function defaultAnimation(result, roles = null, options = {}) {
  const names = namesOf(result)
  const role = (n) => roles?.get?.(n)
  const context = `${options.context ?? ''} ${names.join(' ')}`
  const ctx = normalizeName(context)
  const isVarying = (n) => varies(result, n)
  const time = findTimeName(result, roles)
  const base = { range: { auto: true }, equalScale: false, speed: 1, loop: 'once', background: 'ground', flipY: false }
  const objects = []
  const add = (fields) => objects.push(makeObject(fields, objects))
  const spriteFor = (name, fallback) => suggestSprite(name, context, fallback)
  const label = (n) => result.display?.get?.(n) ?? n

  // 1. two coordinates of one body
  const pairs = [['X', 'Y'], ['SX', 'SY'], ['POSX', 'POSY'], ['XPOS', 'YPOS'], ['ORTX', 'ORTY'], ['RX', 'RY'], ['X1', 'Y1']]
  const pair = pairs.find(([a, b]) => has(result, a) && has(result, b) && (isVarying(a) || isVarying(b)))
  if (pair) {
    const sprite = spriteFor(`${pair[0]}`, 'ball')
    // a central body for orbits (a gravitational parameter or a planet radius in the model)
    const radiusName = firstOf(result, ['ERDRADIUS', 'EARTHRADIUS', 'RADIUSERDE', 'PLANETENRADIUS', 'RADIUS'], (n) => !isVarying(n))
    if (radiusName || has(result, 'GM')) {
      const r = radiusName ? result.series[radiusName][0] : null
      add({ sprite: /MOND|MOON/.test(ctx) ? 'moon' : 'earth', x: 0, y: 0, size: 48, radius: Number.isFinite(r) && r > 0 ? r : null })
    }
    add({ sprite, x: pair[0], y: pair[1], size: spriteSize(sprite), trace: true })
    return { ...base, objects, equalScale: true, background: 'grid', loop: 'loop' }
  }

  // 2. a water level: a vessel that fills and empties (something floats on it)
  const levelName = names.find((n) => LEVEL_NAME.test(n) && isVarying(n)) ??
    (LEVEL_CONTEXT.test(ctx) ? firstOf(result, ['HOEHE', 'H', 'HEIGHT', 'WASSER', 'VOLUMEN', 'VOLUME', 'V'], isVarying) : null)
  if (levelName) {
    const [lo, hi] = extent(result, levelName)
    const [min, max] = niceScale(Math.min(0, lo), hi, 0.15)
    const sprite = suggestSprite('', ctx.replace(/WASSER|WATER/g, ''), 'duck')
    add({ sprite: sprite === 'ball' ? 'duck' : sprite, y: levelName, fill: 'vessel', min, max, width: 360, size: 40, label: label(levelName) })
    return { ...base, objects }
  }

  // 3. a height above the ground (a growing plant stands on a stem)
  const height = firstOf(result, ['HOEHE', 'H', 'HEIGHT', 'Y', 'POSITIONY', 'FLUGHOEHE', 'STEIGHOEHE'], isVarying)
  if (height) {
    const sprite = spriteFor(height, 'ball')
    const [lo] = extent(result, height)
    const plant = sprite === 'sunflower'
    add({
      sprite, y: height, size: plant ? 56 : spriteSize(sprite), trace: false, anchor: lo >= 0 ? 'bottom' : 'center',
      rope: plant ? { x: null, y: 0, style: 'stem' } : null,
    })
    return { ...base, objects, background: 'ground' }
  }

  // 4. an angle: pendulum
  const angleCandidates = names.filter((n) => /^(WINKEL|PHI|THETA|ANGLE|AUSSCHLAG|AUSLENKWINKEL|ALPHA)/.test(n) && !/GESCHW|BESCHL|SPEED|VELO|ACCEL/.test(n))
  const angle = angleCandidates.find((n) => isVarying(n))
  if (angle) {
    const [lo, hi] = extent(result, angle)
    const unit = /GRAD|DEG/.test(angle) || Math.max(Math.abs(lo), Math.abs(hi)) > 2 * Math.PI ? 'deg' : 'rad'
    add({ sprite: spriteFor(angle, 'pendulum-bob'), angle, angleUnit: unit, size: 32, arm: 0.8 })
    return { ...base, objects, background: 'none', loop: 'loop' }
  }

  // 5. a distance along a line
  const distance = firstOf(result, ['S', 'STRECKE', 'WEG', 'X', 'ORT', 'POSITION', 'AUSLENKUNG', 'POS', 'DISTANCE'], isVarying)
  if (distance) {
    const gravity = firstOf(result, ['ORTSFAKTOR', 'G', 'GRAVITATION', 'FALLBESCHLEUNIGUNG', 'ERDBESCHLEUNIGUNG'])
    if (gravity) {
      // a fall: on a rope from a bridge when the model has one (bungee jump)
      const sprite = spriteFor(distance, 'ball')
      const rope = /BUNGEE|SEIL|ROPE|CORD/.test(ctx) ? { x: null, y: 0, style: 'rope', mount: true } : null
      add({ sprite, y: distance, size: spriteSize(sprite), trace: false, rope })
      return { ...base, objects, background: 'grid', flipY: true }
    }
    const sprite = spriteFor(distance, 'cart')
    // a spring pendulum: the spring is fixed to a wall at the left
    let rope = null
    if (/FEDER|SPRING|DAEMPFUNG|DAMPING|SCHWING|OSCILL/.test(ctx)) {
      const [lo, hi] = extent(result, distance)
      rope = { x: lo - 1.2 * Math.max(hi - lo, Math.abs(hi) * 0.1, 1e-9), y: null, style: 'spring', mount: true }
    }
    add({ sprite, x: distance, size: spriteSize(sprite), trace: false, rope })
    return { ...base, objects, background: 'ground', loop: 'loop' }
  }

  // 6. temperatures, amounts and populations
  let states = names.filter((n) => role(n) === 'state' && isVarying(n) && n !== time)
  if (!states.length) states = names.filter((n) => n !== time && !STEP_NAME.test(n) && !TIME_NAME.test(n) && role(n) !== 'constant' && role(n) !== 'time' && isVarying(n))
  if (!states.length) return { ...base, objects: [] }

  // a temperature: a thermometer next to the thing whose temperature it is
  let temperature = null
  for (const re of TEMPERATURE_NAMES) {
    temperature = names.find((n) => re.test(n) && n !== time && isVarying(n) && role(n) !== 'constant')
    if (temperature && (re.source !== '^T$' || HEAT_CONTEXT.test(ctx))) break
    temperature = null
  }
  if (temperature) {
    const ice = states.find((n) => ICE_NAME.test(n))
    const liquid = ice && states.find((n) => LIQUID_NAME.test(n))
    if (ice && liquid) {
      // an ice cube melting in a drink
      const [, hi] = extent(result, liquid)
      add({ sprite: 'ice-cube', y: liquid, fill: 'vessel', min: 0, max: niceScale(0, hi, 0.1)[1], width: 110, size: 44, scaleBy: ice, label: label(liquid) })
    } else if (ice) {
      add({ sprite: 'ice-cube', size: 48, scaleBy: ice, label: label(ice) })
    }
    const companion = temperatureCompanion(ctx)
    add({ sprite: companion, y: temperature, fill: 'thermometer', size: companion === 'thermometer' ? 40 : 80, label: label(temperature) })
    // a heater that is switched on and off
    const heater = names.find((n) => /HEIZUNG|HEATER|HEATING|BRENNER|BURNER/.test(n) && isVarying(n) && extent(result, n)[0] >= 0)
    if (heater) add({ sprite: 'flame', size: 48, scaleBy: heater, label: label(heater) })
    return { ...base, objects }
  }

  // populations of animals: a race against time shows their cycles
  const specific = states.filter((n) => suggestSprite(n, '', null) !== null).slice(0, 3)
  const animals = specific.length > 0 && specific.every((n) => ANIMALS.has(suggestSprite(n, '', null)))
  if (!animals) {
    // amounts of something nameable: up to three columns on a common scale (amounts are never negative)
    const chosen = (specific.length ? specific : states).slice(0, 3)
    const pictures = chosen.map((n) => spriteFor(n, null))
    const ex = dataExtent(chosen.map((n) => result.series[n]))
    if (ex && ex[0] >= 0 && pictures.every(Boolean)) {
      const [min, max] = niceScale(0, ex[1])
      chosen.forEach((n, k) => add({ sprite: pictures[k], y: n, fill: 'bar', min, max, size: 44, width: chosen.length > 1 ? 56 : 72, label: label(n) }))
      return { ...base, objects }
    }
  }

  // 7. time against state variables
  const chosen = specific.length ? specific : [states[0]]
  for (const n of chosen) {
    const sprite = spriteFor(n, 'ball-small')
    add({ sprite, x: time, y: n, size: Math.min(36, spriteSize(sprite)), trace: true, label: chosen.length > 1 ? label(n) : '' })
  }
  return { ...base, objects, background: 'grid' }
}

const SIZES = { duck: 36, flame: 40, co2: 40, nucleus: 36, ball: 32, 'ball-small': 20, cart: 48, car: 48, skydiver: 48, parachute: 56, rocket: 48, 'water-rocket': 48, satellite: 40, earth: 48, moon: 32, sun: 56, planet: 40, 'pendulum-bob': 32, 'mass-block': 36, 'spring-mass': 56 }
const spriteSize = (id) => SIZES[id] ?? 40

// ---------------------------------------------------------------------------
// Validation

/**
 * Problems of a configuration: [{ code, object?, field?, name? }].
 * Codes: noObjects, unknownVariable, unknownSprite (only with options.sprites), badRange
 * (field 'x'/'y' for the stage, with `object` for a gauge scale), noValue (a gauge without y).
 */
export function validateAnimation(result, animation, options = {}) {
  const a = normalizeAnimation(animation)
  const problems = []
  if (!a.objects.length) problems.push({ code: 'noObjects' })
  const sprites = options.sprites ? new Set(options.sprites) : null
  for (const o of a.objects) {
    for (const field of ['x', 'y', 'angle', 'scaleBy']) {
      const v = o[field]
      if (v == null || typeof v === 'number') continue
      if (!has(result, v)) problems.push({ code: 'unknownVariable', object: o.id, field, name: String(v) })
    }
    if (sprites && !sprites.has(o.sprite)) problems.push({ code: 'unknownSprite', object: o.id, name: String(o.sprite) })
    if (o.fill && o.y == null) problems.push({ code: 'noValue', object: o.id, field: 'y' })
    if (o.fill && Number.isFinite(o.min) && Number.isFinite(o.max) && !(o.min < o.max)) problems.push({ code: 'badRange', object: o.id, field: 'y' })
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
/** Room in px right of a gauge column for its scale. */
const GAUGE_SCALE_ROOM = 40

/** [min, max] of a gauge: the given limits, otherwise rounded around the data (amounts from 0). */
export function gaugeScale(result, o) {
  const ex = (typeof o.y === 'string' && result?.series?.[o.y] ? extent(result, o.y) : null) ?? [0, 1]
  let auto
  if (o.fill === 'thermometer') {
    const span = ex[1] - ex[0] || Math.max(Math.abs(ex[1]) * 0.1, 1)
    auto = niceScale(ex[0] - span * 0.2, ex[1] + span * 0.2)
  } else {
    auto = niceScale(Math.min(0, ex[0]), ex[1] > Math.min(0, ex[0]) ? ex[1] : Math.min(0, ex[0]) + 1, 0.1)
  }
  const lo = Number.isFinite(o.min) ? o.min : auto[0]
  const hi = Number.isFinite(o.max) ? o.max : auto[1]
  return lo < hi ? [lo, hi] : auto
}

/**
 * Everything that does not depend on the step: world ranges, plot area, scale and
 * the mapping world → pixels. viewport: { width, height }.
 */
export function computeLayout(result, animation, viewport = {}) {
  const a = normalizeAnimation(animation)
  const width = Math.max(1, viewport.width ?? 640)
  const height = Math.max(1, viewport.height ?? 400)
  const objs = a.objects
  const free = objs.filter((o) => !isArm(o) && !o.fill)
  const usesX = free.some((o) => o.x != null)
  const usesY = free.some((o) => o.y != null)

  // world ranges (radius of true-to-scale objects and rope anchors included)
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
      if (o.rope && Number.isFinite(o.rope[axis])) arrays.push(o.rope[axis])
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
  const top = objs.some((o) => o.anchor === 'bottom' && o.y != null && !o.fill && !(o.radius > 0)) ? maxSize + 4 : half
  const grid = a.background === 'grid'
  const ground = a.background === 'ground'
  const m = {
    l: half + ((grid || ground) && usesY ? 46 : 0),
    r: half,
    t: Math.max(top, 8),
    b: half + (grid && usesX ? 18 : 0) + (ground ? 14 : 0),
  }
  if (objs.some((o) => o.label)) m.t += 16
  // a bridge above a rope needs room for its railing
  if (free.some((o) => o.rope?.mount && o.rope.y != null && o.rope.x == null)) m.t = Math.max(m.t, 30)
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

  // gauges stand side by side, each in its own slot, together with objects without x and y
  const gauges = {}
  const slots = {}
  const hasGauges = objs.some((o) => o.fill)
  const slotted = hasGauges ? objs.filter((o) => o.fill || (!isArm(o) && o.x == null && o.y == null)) : []
  // each slot as wide as its content, close together and centred; equal slots when space is short
  const sideOf = (o) => (o.fill === 'thermometer' && o.sprite !== 'thermometer' ? objectSize(o) + 10 : 0)
  const wantOf = (o) => (Number.isFinite(o.width) && o.width > 0 ? o.width : GAUGE_WIDTHS[o.fill])
  const contentOf = (o) => (o.fill ? sideOf(o) + wantOf(o) + GAUGE_SCALE_ROOM : objectSize(o) + 16)
  const contents = slotted.map(contentOf)
  const total = contents.reduce((a, b) => a + b, 0)
  const n = Math.max(1, slotted.length)
  const fits = total <= pw
  const gap = fits ? Math.min(72, (pw - total) / (n + 1)) : 0
  let cursor = m.l + (fits ? (pw - total - gap * (n - 1)) / 2 : 0)
  slotted.forEach((o, k) => {
    const slotW = fits ? contents[k] : pw / n
    const cx = cursor + slotW / 2
    cursor += slotW + gap
    if (!o.fill) { slots[o.id] = cx; return }
    const size = objectSize(o)
    const sideW = sideOf(o)
    const w = Math.max(8, Math.min(wantOf(o), slotW - GAUGE_SCALE_ROOM - (fits ? 0 : 8) - sideW))
    const left = cx - (sideW + w + GAUGE_SCALE_ROOM) / 2
    const colX = left + sideW
    let colTop = m.t + (o.fill === 'bar' ? size : o.fill === 'thermometer' ? 4 + w / 2 : 4)
    let bulb = null
    let colBottom = groundY - (o.fill === 'vessel' ? 2 : 0)
    if (o.fill === 'thermometer') {
      const r = Math.max(7, w * 0.9)
      bulb = { cx: colX + w / 2, cy: groundY - r - 3, r }
      colBottom = bulb.cy - r * 0.5
    }
    // a vessel is not much taller than wide (a tub stays a tub, a glass a glass)
    if (o.fill === 'vessel') colTop = Math.max(colTop, colBottom - w * 1.3)
    colBottom = Math.max(colBottom, colTop + 20)
    const [lo, hi] = gaugeScale(result, o)
    const toPx = (v) => colBottom - ((Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo)) * (colBottom - colTop)
    gauges[o.id] = {
      style: o.fill, x: colX, cx: colX + w / 2, width: w, top: colTop, bottom: colBottom, lo, hi, bulb, toPx,
      iconX: sideW ? left + size / 2 : null, slotX: cx,
      labelY: (o.fill === 'bar' ? colTop - size : o.fill === 'thermometer' ? colTop - w / 2 : colTop) - 8,
      ticks: niceTicks(lo, hi, Math.max(2, Math.floor((colBottom - colTop) / 40))).map((v) => ({ v, px: toPx(v) })),
    }
  })

  // largest |value| of the variables that scale a sprite
  const scaleMax = {}
  for (const o of objs) {
    if (typeof o.scaleBy !== 'string' || !result?.series?.[o.scaleBy]) continue
    const ex = extent(result, o.scaleBy)
    scaleMax[o.id] = ex ? Math.max(Math.abs(ex[0]), Math.abs(ex[1])) : 0
  }

  return {
    animation: a, width, height, margin: m,
    plot: { l: m.l, t: m.t, w: pw, h: ph }, area,
    xRange, yRange, scale: { x: kx, y: ky }, usesX, usesY, groundY, ticks, toPxX, toPxY,
    centerX: m.l + pw / 2, pivot: { x: m.l + pw / 2, y: m.t }, armLength: Math.min(ph, pw / 2),
    gauges, slots, scaleMax, series: result?.series ?? {},
  }
}

/** Pixel position of object o at step i (centre of the sprite), or null if a value is not finite. */
function positionAt(result, layout, o, i) {
  const size = displaySize(layout, o, i)
  if (isArm(o)) {
    const a = toRadians(valueAt(result, o.angle, i), o.angleUnit)
    if (!Number.isFinite(a)) return null
    const L = o.arm * layout.armLength - size / 2
    return { x: layout.pivot.x + L * Math.sin(a), y: layout.pivot.y + L * Math.cos(a) }
  }
  const g = layout.gauges[o.id]
  if (g) {
    const v = valueAt(result, o.y, i)
    if (!Number.isFinite(v)) return null
    const level = g.toPx(v)
    if (g.style === 'bar') return { x: g.cx, y: level - size / 2 }
    if (g.style === 'vessel') return { x: g.cx, y: Math.max(g.top, level - size * 0.2) }
    return g.iconX != null ? { x: g.iconX, y: layout.groundY - size / 2 } : { x: g.cx, y: level }
  }
  const xv = valueAt(result, o.x, i)
  const yv = valueAt(result, o.y, i)
  if (xv !== null && !Number.isFinite(xv)) return null
  if (yv !== null && !Number.isFinite(yv)) return null
  const x = xv === null ? layout.slots[o.id] ?? layout.centerX : layout.toPxX(xv)
  let y
  if (yv === null) y = layout.groundY - size / 2
  else y = layout.toPxY(yv) - (o.anchor === 'bottom' && !layout.animation.flipY ? size / 2 : 0)
  return { x, y }
}

/** Size in px without scaleBy: true to scale or the pixel size. */
function baseSize(layout, o) {
  return o.radius > 0
    ? Math.max(2, 2 * o.radius * Math.min(layout.scale.x, layout.scale.y) * (32 / (SPRITE_BODY_RADIUS[o.sprite] ?? 32)))
    : objectSize(o)
}

/** Size in px at step i: the base size times the scaleBy factor (area ∝ value). */
function displaySize(layout, o, i) {
  let size = baseSize(layout, o)
  if (o.id in layout.scaleMax) {
    const v = Math.abs(layout.series[o.scaleBy]?.[i] ?? NaN)
    const max = layout.scaleMax[o.id]
    size *= max > 0 && Number.isFinite(v) ? Math.sqrt(Math.min(1, v / max)) : 0
  }
  return size
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

/** SVG points of a coil spring from (x1, y1) to (x2, y2). */
export function springPoints(x1, y1, x2, y2, coils = 10, amplitude = 6) {
  const len = Math.hypot(x2 - x1, y2 - y1)
  if (len < 1) return `${round1(x1)},${round1(y1)} ${round1(x2)},${round1(y2)}`
  const ux = (x2 - x1) / len
  const uy = (y2 - y1) / len
  const lead = Math.min(8, len * 0.15)
  const amp = Math.min(amplitude, len / 4)
  const at = (along, across) => `${round1(x1 + ux * along - uy * across)},${round1(y1 + uy * along + ux * across)}`
  const pts = [at(0, 0), at(lead, 0)]
  for (let j = 0; j < 2 * coils; j++) pts.push(at(lead + ((len - 2 * lead) * (j + 0.5)) / (2 * coils), j % 2 ? -amp : amp))
  pts.push(at(len - lead, 0), at(len, 0))
  return pts.join(' ')
}

/** Rope of object o from its anchor to the edge of the sprite, in pixels; null without a rope. */
function ropeAt(layout, o, pos, size) {
  const r = o.rope
  if (!r || !pos) return null
  const ax = r.x == null ? pos.x : layout.toPxX(r.x)
  const ay = r.y == null ? pos.y : layout.toPxY(r.y)
  const d = Math.hypot(ax - pos.x, ay - pos.y)
  const edge = size * (r.style === 'stem' ? 0.44 : 0.42)
  const x2 = d > edge ? pos.x + ((ax - pos.x) / d) * edge : ax
  const y2 = d > edge ? pos.y + ((ay - pos.y) / d) * edge : ay
  const mount = !r.mount ? null : r.y != null && r.x == null ? 'bridge' : r.x != null && r.y == null ? 'wall' : 'point'
  return {
    x1: round1(ax), y1: round1(ay), x2: round1(x2), y2: round1(y2), style: r.style, mount,
    points: r.style === 'spring' ? springPoints(ax, ay, x2, y2) : null,
  }
}

/**
 * Positions and angles of all objects at step `index` in pixels.
 * viewport: { width, height } or a layout from computeLayout (reused while playing).
 * Result: { index, width, height, plot, groundY, ticks, objects: [{ id, sprite, x, y, size,
 *   rotation (SVG degrees, clockwise), mirror, visible, showSprite, label, showLabel, labelX, labelY
 *   (labels moved apart so they never overlap),
 *   values: { x, y, angle }, rod, rope, gauge }] }
 * gauge: { style, x, cx, width, top, bottom, level, lo, hi, ticks, bulb } for fill objects.
 */
export function frameAt(result, animation, index, viewport = {}) {
  const layout = viewport.toPxX ? viewport : computeLayout(result, animation, viewport)
  const steps = Math.max(0, result?.steps ?? (Object.values(result?.series ?? {})[0]?.length ?? 1) - 1)
  const i = Math.min(steps, Math.max(0, Math.round(Number.isFinite(index) ? index : 0)))
  const objects = layout.animation.objects.map((o) => {
    const size = displaySize(layout, o, i)
    const pos = positionAt(result, layout, o, i)
    const values = {
      x: typeof o.x === 'string' && !o.fill ? valueAt(result, o.x, i) : null,
      y: typeof o.y === 'string' ? valueAt(result, o.y, i) : null,
      angle: o.angle != null ? valueAt(result, o.angle, i) : null,
    }
    let rotation = 0
    let mirror = false
    if (isArm(o)) {
      rotation = -(toRadians(values.angle, o.angleUnit) * 180) / Math.PI
    } else if (o.angle != null) {
      rotation = -(toRadians(values.angle, o.angleUnit) * 180) / Math.PI
    } else if (o.sprite in SPRITE_HEADINGS && !o.fill) {
      const dir = motionDirection(result, layout, o, i, steps)
      if (dir !== null) {
        const heading = SPRITE_HEADINGS[o.sprite]
        if (heading === 0 && Math.abs(dir) > 90) { mirror = true; rotation = -(dir - 180) }
        else rotation = -(dir - heading)
        rotation = ((rotation + 540) % 360) - 180
      }
    }
    if (!Number.isFinite(rotation)) rotation = 0
    const g = layout.gauges[o.id]
    const gauge = g ? {
      style: g.style, x: g.x, cx: g.cx, width: g.width, top: g.top, bottom: g.bottom, lo: g.lo, hi: g.hi, ticks: g.ticks, bulb: g.bulb,
      level: round1(Number.isFinite(values.y) ? g.toPx(values.y) : g.bottom),
    } : null
    const x = pos ? round1(pos.x) : 0
    const y = pos ? round1(pos.y) : 0
    return {
      id: o.id, sprite: o.sprite, size,
      x, y,
      rotation: round1(rotation) || 0, mirror, visible: !!pos,
      showSprite: !!pos && size >= 1 && !(g && g.style === 'thermometer' && g.iconX == null),
      label: o.label ?? '',
      // a picture that has shrunk to nothing takes its label with it (gauges always keep theirs)
      showLabel: !!pos && !!o.label && (!!g || size >= 1),
      labelX: g ? round1(g.slotX) : x,
      // above the full-size sprite, so a shrinking sprite keeps its label in place
      labelY: round1(g ? g.labelY : Math.max(12, y + size / 2 - baseSize(layout, o) - 6)),
      values, trace: !!o.trace && !g,
      rod: isArm(o) && pos ? { x1: layout.pivot.x, y1: layout.pivot.y, x2: round1(pos.x), y2: round1(pos.y) } : null,
      rope: ropeAt(layout, o, pos, size),
      gauge,
    }
  })
  separateLabels(objects)
  return { index: i, steps, width: layout.width, height: layout.height, plot: layout.plot, area: layout.area, groundY: layout.groundY, ticks: layout.ticks, objects }
}

/** Approximate box of a 12px bold label at baseline y (width from the character count). */
export const LABEL_HEIGHT = 15
const labelWidth = (text) => String(text).length * 7.2 + 6

/**
 * Moves labels that would overlap another label or another object's picture: in object
 * order, each label goes up just above what it hits (or below, when there is no room at
 * the top). Labels never overlap each other.
 */
export function separateLabels(objects, top = 12) {
  const boxes = [] // { l, r, t, b, owner }
  for (const o of objects) {
    if (o.showSprite && o.size >= 1) boxes.push({ l: o.x - o.size / 2, r: o.x + o.size / 2, t: o.y - o.size / 2, b: o.y + o.size / 2, owner: o.id, sprite: true })
  }
  // lowest object first: when labels have to stack, their order then matches the
  // vertical order of the objects (the upper object gets the upper label)
  for (const o of [...objects].sort((a, b) => b.y - a.y)) {
    if (!o.showLabel) continue
    const w = labelWidth(o.label)
    const box = (y) => ({ l: o.labelX - w / 2, r: o.labelX + w / 2, t: y - 11, b: y + 4 })
    const hits = (y, list) => {
      const b = box(y)
      return list.filter((p) => p.owner !== o.id && p.l < b.r && p.r > b.l && p.t < b.b && p.b > b.t)
    }
    const place = (list) => {
      let y = o.labelY
      for (let guard = 0; hits(y, list).length && guard < 2 * objects.length + 2; guard++) y = Math.min(...hits(y, list).map((p) => p.t)) - 4
      if (y >= top) return y
      y = o.labelY
      for (let guard = 0; hits(y, list).length && guard < 2 * objects.length + 2; guard++) y = Math.max(...hits(y, list).map((p) => p.b)) + 11
      return y
    }
    // avoid labels and pictures; if that is impossible, at least avoid the other labels
    let y = place(boxes)
    if (hits(y, boxes.filter((p) => !p.sprite)).length) y = place(boxes.filter((p) => !p.sprite))
    o.labelY = round1(y)
    boxes.push({ ...box(o.labelY), owner: null })
  }
  return objects
}

const round1 = (v) => Math.round(v * 10) / 10

/**
 * Trace of object `objectIndex` from step 0 to `upTo` as SVG polyline points
 * (thinned to at most MAX_TRACE_POINTS, the current point always included).
 */
export function tracePoints(result, layout, objectIndex, upTo) {
  const o = layout.animation.objects[objectIndex]
  if (!o || o.fill) return ''
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
    for (const f of ['x', 'y', 'angle', 'scaleBy']) if (typeof o[f] === 'string' && !out.includes(o[f])) out.push(o[f])
  }
  return out
}
