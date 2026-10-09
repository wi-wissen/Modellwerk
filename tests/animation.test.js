import { describe, expect, it } from 'vitest'
import { EXAMPLES } from '../src/examples.js'
import { analyse, sentencesToProgram } from '../src/engine/model.js'
import { simulate } from '../src/engine/simulate.js'
import { SPRITES } from '../src/assets/sprites/index.js'
import {
  SPRITE_HEADINGS, advance, computeLayout, dataExtent, defaultAnimation, findTimeName, frameAt, makeObject,
  newObjectId, niceTicks, normalizeAnimation, stepsPerSecond, suggestSprite, tracePoints, usedVariables, validateAnimation,
} from '../src/engine/animation.js'

const programOf = (ex) => (ex.mode === 'sentences' ? sentencesToProgram(ex.sentences, { simplified: ex.simplified ?? true }) : ex.source)
function run(id) {
  const ex = EXAMPLES.find((e) => e.id === id)
  const source = programOf(ex)
  return { ex, result: simulate(source, ex.start, ex.steps), roles: analyse(source).roles }
}
/** Hand-made result: series from plain arrays. */
function fake(series) {
  const names = Object.keys(series)
  const n = series[names[0]].length
  return { names, display: new Map(names.map((k) => [k, k])), series: Object.fromEntries(names.map((k) => [k, Float64Array.from(series[k])])), steps: n - 1 }
}
const VIEW = { width: 400, height: 300 }
const close = (a, b, eps = 0.11) => expect(Math.abs(a - b)).toBeLessThanOrEqual(eps)

describe('scaling', () => {
  const r = fake({ T: [0, 1, 2], X: [0, 5, 10], Y: [0, 1, 2] })
  const anim = { objects: [{ id: 'a', sprite: 'ball', x: 'X', y: 'Y', size: 20 }], background: 'none' }

  it('maps the range linearly onto the plot with a margin, y upwards', () => {
    const L = computeLayout(r, anim, VIEW)
    const f0 = frameAt(r, anim, 0, VIEW).objects[0]
    const f2 = frameAt(r, anim, 2, VIEW).objects[0]
    close(f0.x, L.plot.l); close(f2.x, L.plot.l + L.plot.w)
    close(f0.y, L.plot.t + L.plot.h); close(f2.y, L.plot.t)
    expect(L.plot.l).toBeGreaterThanOrEqual(10) // half the sprite fits
    const mid = frameAt(r, anim, 1, VIEW).objects[0]
    close(mid.x, (f0.x + f2.x) / 2); close(mid.y, (f0.y + f2.y) / 2)
  })

  it('equalScale uses one scale for x and y and centres the data', () => {
    const L = computeLayout(r, { ...anim, equalScale: true }, VIEW)
    expect(L.scale.x).toBe(L.scale.y)
    const a = frameAt(r, { ...anim, equalScale: true }, 0, VIEW).objects[0]
    const b = frameAt(r, { ...anim, equalScale: true }, 2, VIEW).objects[0]
    close((b.x - a.x) / (a.y - b.y), 10 / 2, 1e-3) // 10 units across, 2 units up: same pixels per unit
    close((a.x + b.x) / 2, L.plot.l + L.plot.w / 2)
    // without equal scale the aspect is distorted
    const c = frameAt(r, anim, 0, VIEW).objects[0]
    const d = frameAt(r, anim, 2, VIEW).objects[0]
    expect(Math.abs((d.x - c.x) / (c.y - d.y) - 5)).toBeGreaterThan(1)
  })

  it('a circular orbit stays circular with equalScale in a wide viewport', () => {
    const n = 64
    const X = []; const Y = []
    for (let k = 0; k <= n; k++) { X.push(3 * Math.cos((2 * Math.PI * k) / n)); Y.push(3 * Math.sin((2 * Math.PI * k) / n)) }
    const orbit = fake({ X, Y })
    const cfg = { objects: [{ sprite: 'satellite', x: 'X', y: 'Y', size: 10 }], equalScale: true, background: 'grid' }
    const view = { width: 800, height: 300 }
    const L = computeLayout(orbit, cfg, view)
    const pts = Array.from({ length: n + 1 }, (_, k) => frameAt(orbit, cfg, k, L).objects[0])
    const cx = (L.toPxX(0)); const cy = L.toPxY(0)
    const radii = pts.map((p) => Math.hypot(p.x - cx, p.y - cy))
    expect(Math.max(...radii) - Math.min(...radii)).toBeLessThan(0.3)
  })

  it('manual range overrides only the given limits; flipY turns the y axis', () => {
    const cfg = { ...anim, range: { auto: false, xMin: -10 } }
    const L = computeLayout(r, cfg, VIEW)
    expect(L.xRange).toEqual([-10, 10]); expect(L.yRange).toEqual([0, 2])
    const up = frameAt(r, { ...anim, flipY: true }, 2, VIEW).objects[0]
    const down = frameAt(r, { ...anim, flipY: true }, 0, VIEW).objects[0]
    expect(up.y).toBeGreaterThan(down.y)
  })

  it('true-to-scale radius grows with the scale', () => {
    const cfg = { objects: [{ sprite: 'earth', x: 0, y: 0, radius: 1 }, { sprite: 'ball', x: 'X', y: 'Y' }], equalScale: true }
    const small = frameAt(r, cfg, 0, VIEW).objects[0].size
    const big = frameAt(r, cfg, 0, { width: 800, height: 600 }).objects[0].size
    expect(big).toBeGreaterThan(small * 1.5)
  })

  it('niceTicks and dataExtent', () => {
    expect(niceTicks(0, 10, 5)).toEqual([0, 2, 4, 6, 8, 10])
    expect(niceTicks(1, 1)).toEqual([])
    expect(dataExtent([[NaN, 3, -1], 7, null])).toEqual([-1, 7])
    expect(dataExtent([[NaN]])).toBe(null)
  })
})

describe('frameAt edge cases', () => {
  const r = fake({ T: [0, 1, 2, 3], H: [2, 1, NaN, 0], C: [5, 5, 5, 5] })

  it('clamps and rounds the index', () => {
    const cfg = { objects: [{ sprite: 'ball', y: 'H' }] }
    expect(frameAt(r, cfg, -5, VIEW).index).toBe(0)
    expect(frameAt(r, cfg, 99, VIEW).index).toBe(3)
    expect(frameAt(r, cfg, 1.4, VIEW).index).toBe(1)
    expect(frameAt(r, cfg, NaN, VIEW).index).toBe(0)
  })

  it('hides an object whose value is not finite', () => {
    const f = frameAt(r, { objects: [{ sprite: 'ball', y: 'H' }] }, 2, VIEW)
    expect(f.objects[0].visible).toBe(false)
    expect(tracePoints(r, computeLayout(r, { objects: [{ sprite: 'ball', y: 'H' }] }, VIEW), 0, 3).split(' ')).toHaveLength(3)
  })

  it('a missing x centres the object, a missing y puts it on the ground', () => {
    const cfg = { objects: [{ sprite: 'ball', y: 'H', size: 20 }, { sprite: 'cart', x: 'T', size: 40 }], background: 'ground' }
    const L = computeLayout(r, cfg, VIEW)
    const f = frameAt(r, cfg, 3, L)
    close(f.objects[0].x, L.plot.l + L.plot.w / 2)
    close(f.objects[1].y, L.groundY - 20)
    close(L.groundY, L.toPxY(0)) // ground at height 0
  })

  it('anchor bottom puts the lower edge on the value', () => {
    const cfg = { objects: [{ sprite: 'ball', y: 'H', size: 20, anchor: 'bottom' }], background: 'ground' }
    const L = computeLayout(r, cfg, VIEW)
    close(frameAt(r, cfg, 3, L).objects[0].y + 10, L.groundY)
  })

  it('a constant variable or a single step still gives a usable range', () => {
    const cfg = { objects: [{ sprite: 'ball', x: 'C', y: 'C' }] }
    const f = frameAt(r, cfg, 0, VIEW).objects[0]
    expect(Number.isFinite(f.x) && Number.isFinite(f.y)).toBe(true)
    const one = fake({ X: [4] })
    const g = frameAt(one, { objects: [{ sprite: 'ball', x: 'X' }] }, 0, VIEW)
    expect(g.steps).toBe(0); expect(g.objects[0].visible).toBe(true)
  })

  it('no objects gives an empty frame', () => {
    expect(frameAt(r, { objects: [] }, 1, VIEW).objects).toEqual([])
  })

  it('angles: degrees and radians, pendulum on a rod', () => {
    const p = fake({ A: [0, 90, -90], B: [0, Math.PI / 2, -Math.PI / 2] })
    const deg = frameAt(p, { objects: [{ sprite: 'arrow', angle: 'A', angleUnit: 'deg' }] }, 1, VIEW).objects[0]
    const rad = frameAt(p, { objects: [{ sprite: 'arrow', angle: 'B', angleUnit: 'rad' }] }, 1, VIEW).objects[0]
    expect(deg.rotation).toBe(-90) // counter-clockwise on screen = negative SVG rotation
    expect(rad.rotation).toBe(-90)
    const cfg = { objects: [{ sprite: 'pendulum-bob', angle: 'A', angleUnit: 'deg', arm: 0.8, size: 20 }] }
    const L = computeLayout(p, cfg, VIEW)
    const hang = frameAt(p, cfg, 0, L).objects[0]
    const right = frameAt(p, cfg, 1, L).objects[0]
    close(hang.x, L.pivot.x); expect(hang.y).toBeGreaterThan(L.pivot.y)
    close(right.y, L.pivot.y); expect(right.x).toBeGreaterThan(L.pivot.x)
    expect(hang.rod).toEqual({ x1: L.pivot.x, y1: L.pivot.y, x2: hang.x, y2: hang.y })
  })

  it('rotating sprites turn along the motion (car mirrored instead of upside down)', () => {
    const m = fake({ X: [0, 1, 2, 1, 0], Y: [0, 0, 0, 0, 0], H: [0, 1, 2, 3, 4] })
    const car = { objects: [{ sprite: 'car', x: 'X' }] }
    expect(frameAt(m, car, 1, VIEW).objects[0]).toMatchObject({ rotation: 0, mirror: false })
    expect(frameAt(m, car, 3, VIEW).objects[0]).toMatchObject({ rotation: 0, mirror: true })
    const rocket = { objects: [{ sprite: 'rocket', y: 'H' }] }
    expect(frameAt(m, rocket, 2, VIEW).objects[0].rotation).toBe(0) // flies up = artwork direction
  })
})

describe('defaultAnimation for the example models', () => {
  it('bouncing ball: ball on the ground, height as bottom edge', () => {
    const { result, roles } = run('bouncing-ball')
    const a = defaultAnimation(result, roles, { context: 'bouncing-ball' })
    expect(a.background).toBe('ground')
    expect(a.objects).toHaveLength(1)
    expect(a.objects[0]).toMatchObject({ sprite: 'ball', x: null, y: 'HOEHE', anchor: 'bottom' })
    expect(defaultAnimation(result, roles).objects[0].sprite).toBe('ball') // STOSSZAHL is enough
  })

  it('ISS orbit: X/Y with equal scale and a true-to-scale earth', () => {
    const { result, roles } = run('iss-orbit')
    const a = defaultAnimation(result, roles)
    expect(a.equalScale).toBe(true)
    expect(a.objects.map((o) => o.sprite)).toEqual(['earth', 'satellite'])
    expect(a.objects[0]).toMatchObject({ x: 0, y: 0, radius: 6371000 })
    expect(a.objects[1]).toMatchObject({ x: 'X', y: 'Y', trace: true })
  })

  it('water rocket, skydiver, bungee jump, pendulum, damped spring', () => {
    const rocket = defaultAnimation(run('water-rocket').result)
    expect(rocket.objects[0]).toMatchObject({ sprite: 'water-rocket', y: 'HOEHE' })
    expect(defaultAnimation(run('skydiver-air-resistance').result).objects[0]).toMatchObject({ sprite: 'skydiver', y: 'HOEHE' })
    const bungee = defaultAnimation(run('bungee-jump').result)
    expect(bungee.flipY).toBe(true)
    expect(bungee.objects[0]).toMatchObject({ sprite: 'person', y: 'STRECKE', x: null })
    const pendulum = defaultAnimation(run('pendulum-large-angle').result)
    expect(pendulum.objects[0]).toMatchObject({ sprite: 'pendulum-bob', angle: 'WINKEL', angleUnit: 'rad' })
    expect(pendulum.objects[0].arm).toBeGreaterThan(0)
    const spring = defaultAnimation(run('damped-spring-pendulum').result, null, { context: 'damped-spring-pendulum' })
    expect(spring.objects[0]).toMatchObject({ sprite: 'mass-block', x: 'S', y: null })
  })

  it('falls back to time against state variables', () => {
    const { result, roles } = run('lynx-and-hare')
    const a = defaultAnimation(result, roles)
    expect(a.objects.map((o) => [o.sprite, o.x, o.y])).toEqual([['rabbit', 'ZEIT', 'HASEN'], ['lynx', 'ZEIT', 'LUCHSE']])
    const cooling = defaultAnimation(run('newtons-law-of-cooling').result, run('newtons-law-of-cooling').roles)
    expect(cooling.objects[0]).toMatchObject({ x: 'ZEIT', y: 'TEMPERATUR', sprite: 'thermometer' })
    const plain = defaultAnimation(fake({ ZEIT: [0, 1], N: [1, 2] }))
    expect(plain.objects[0]).toMatchObject({ x: 'ZEIT', y: 'N', sprite: 'ball-small' })
    expect(defaultAnimation(fake({ K: [1, 1] })).objects).toEqual([])
  })

  it('every example gets a valid preset that renders', () => {
    for (const ex of EXAMPLES) {
      const { result, roles } = run(ex.id)
      const a = defaultAnimation(result, roles, { context: ex.id })
      expect(validateAnimation(result, a, { sprites: SPRITES.map((s) => s.id) }), ex.id).toEqual([])
      const f = frameAt(result, a, Math.floor(result.steps / 2), VIEW)
      for (const o of f.objects) expect(Number.isFinite(o.x) && Number.isFinite(o.y), ex.id).toBe(true)
    }
  })
})

describe('suggestSprite', () => {
  it('specific words in the name win, generic names use the context', () => {
    expect(suggestSprite('Rakete')).toBe('rocket')
    expect(suggestSprite('Wasserrakete')).toBe('water-rocket')
    expect(suggestSprite('Hasen')).toBe('rabbit')
    expect(suggestSprite('Höhe', 'Springender Ball')).toBe('ball')
    expect(suggestSprite('Hoehe', 'Rakete')).toBe('rocket')
    expect(suggestSprite('HOEHE', ['SCHUB', 'WASSER'])).toBe('water-rocket')
    expect(suggestSprite('Sonnenblume')).toBe('sunflower')
    expect(suggestSprite('Temperatur')).toBe('thermometer')
    expect(suggestSprite('Q', '', 'star')).toBe('star')
  })

  it('only suggests existing sprites; headings only for rotating sprites', () => {
    const ids = new Set(SPRITES.map((s) => s.id))
    for (const w of ['Ball', 'Rakete', 'Satellit', 'Erde', 'Mond', 'Pendel', 'Auto', 'Luchs', 'Virus', 'Kaffee', 'Ladung', 'Haus', 'CO2']) {
      expect(ids.has(suggestSprite(w)), w).toBe(true)
    }
    for (const id of Object.keys(SPRITE_HEADINGS)) expect(SPRITES.find((s) => s.id === id)?.rotates, id).toBe(true)
  })
})

describe('validation and helpers', () => {
  const r = fake({ T: [0, 1], X: [0, 1] })
  it('reports missing objects, unknown variables and sprites, bad ranges', () => {
    expect(validateAnimation(r, { objects: [] })).toEqual([{ code: 'noObjects' }])
    expect(validateAnimation(r, {})).toEqual([{ code: 'noObjects' }])
    const p = validateAnimation(r, { objects: [{ id: 'a', sprite: 'dragon', x: 'X', y: 'NOPE', angle: 'W' }], range: { auto: false, xMin: 2, xMax: 1 } }, { sprites: ['ball'] })
    expect(p).toEqual([
      { code: 'unknownVariable', object: 'a', field: 'y', name: 'NOPE' },
      { code: 'unknownVariable', object: 'a', field: 'angle', name: 'W' },
      { code: 'unknownSprite', object: 'a', name: 'dragon' },
      { code: 'badRange', field: 'x' },
    ])
    expect(validateAnimation(r, { objects: [{ sprite: 'ball', x: 0, y: 'X' }] })).toEqual([])
  })

  it('normalize fills defaults without mutating, ids are unique and stable', () => {
    const input = { objects: [{ sprite: 'ball' }, { id: 'obj1', sprite: 'car' }], loop: 'nonsense', speed: -1 }
    const frozen = JSON.stringify(input)
    const a = normalizeAnimation(input)
    expect(JSON.stringify(input)).toBe(frozen)
    expect(a).toMatchObject({ loop: 'once', speed: 1, background: 'ground', range: { auto: true } })
    expect(new Set(a.objects.map((o) => o.id)).size).toBe(2)
    expect(normalizeAnimation(input).objects.map((o) => o.id)).toEqual(a.objects.map((o) => o.id))
    expect(newObjectId([{ id: 'obj1' }, { id: 'obj2' }])).toBe('obj3')
    expect(makeObject({ sprite: 'car' }).trace).toBe(false)
  })

  it('playback: once stops, loop wraps, bounce reverses', () => {
    expect(advance(9, 1, 2, 10, 'once')).toEqual({ pos: 10, dir: 1, done: true })
    expect(advance(9, 1, 3, 10, 'loop').pos).toBeCloseTo(1)
    expect(advance(9, 1, 3, 10, 'bounce')).toEqual({ pos: 8, dir: -1, done: false })
    expect(advance(1, -1, 3, 10, 'bounce')).toEqual({ pos: 2, dir: 1, done: false })
    expect(stepsPerSecond({ steps: 800 }, 2)).toBe(200)
    expect(stepsPerSecond({ steps: 0 }, 1)).toBe(1)
  })

  it('time name and used variables', () => {
    expect(findTimeName(fake({ DT: [1], ZEIT: [0] }))).toBe('ZEIT')
    expect(findTimeName(fake({ A: [1] }))).toBe(null)
    expect(usedVariables({ objects: [{ x: 'X', y: 'X', angle: 'W' }, { x: 0, y: 'Y' }] })).toEqual(['X', 'W', 'Y'])
  })
})
