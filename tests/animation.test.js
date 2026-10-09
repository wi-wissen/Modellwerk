import { describe, expect, it } from 'vitest'
import { EXAMPLES } from '../src/examples.js'
import { analyse, sentencesToProgram } from '../src/engine/model.js'
import { simulate } from '../src/engine/simulate.js'
import { SPRITES } from '../src/assets/sprites/index.js'
import {
  SPRITE_HEADINGS, advance, computeLayout, dataExtent, defaultAnimation, findTimeName, frameAt, gaugeScale, makeObject,
  newObjectId, niceTicks, normalizeAnimation, separateLabels, springPoints, stepsPerSecond, suggestSprite, tracePoints, usedVariables, validateAnimation,
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
    const plain = defaultAnimation(fake({ ZEIT: [0, 1], N: [1, 2] }))
    expect(plain.objects[0]).toMatchObject({ x: 'ZEIT', y: 'N', sprite: 'ball-small' })
    expect(defaultAnimation(fake({ K: [1, 1] })).objects).toEqual([])
  })

  it('every example gets a valid preset that renders and shows something changing', () => {
    expect(EXAMPLES).toHaveLength(20)
    for (const ex of EXAMPLES) {
      const { result, roles } = run(ex.id)
      const a = defaultAnimation(result, roles, { context: ex.id })
      expect(a.objects.length, ex.id).toBeGreaterThan(0)
      expect(validateAnimation(result, a, { sprites: SPRITES.map((s) => s.id) }), ex.id).toEqual([])
      const changing = usedVariables(a).filter((n) => result.series[n].some((v) => v !== result.series[n][0]))
      expect(changing.length, ex.id).toBeGreaterThan(0)
      // no plain ball where the model is about something else
      if (!['bouncing-ball'].includes(ex.id)) expect(a.objects.map((o) => o.sprite), ex.id).not.toContain('ball')
      expect(a.objects.map((o) => o.sprite), ex.id).not.toContain('ball-small')
      for (const step of [0, Math.floor(result.steps / 2), result.steps]) {
        const f = frameAt(result, a, step, VIEW)
        for (const o of f.objects) {
          expect(Number.isFinite(o.x) && Number.isFinite(o.y) && Number.isFinite(o.size), ex.id).toBe(true)
          if (o.gauge) expect(o.gauge.level).toBeGreaterThanOrEqual(o.gauge.top - 0.1)
          if (o.gauge) expect(o.gauge.level).toBeLessThanOrEqual(o.gauge.bottom + 0.1)
        }
      }
    }
  })

  it('scenes: vessel, thermometer, columns, stem, rope and spring', () => {
    const scene = (id) => {
      const { result, roles } = run(id)
      return defaultAnimation(result, roles, { context: id }).objects.map((o) => ({ sprite: o.sprite, fill: o.fill, y: o.y, x: o.x, scaleBy: o.scaleBy, rope: o.rope?.style ?? null, mount: o.rope?.mount ?? null }))
    }
    expect(scene('bathtub')).toMatchObject([{ fill: 'vessel', y: 'HOEHE', sprite: 'duck' }])
    expect(scene('sunflower')).toMatchObject([{ sprite: 'sunflower', y: 'HOEHE', rope: 'stem' }])
    expect(scene('bungee-jump')).toMatchObject([{ sprite: 'person', y: 'STRECKE', rope: 'rope', mount: true }])
    expect(scene('damped-spring-pendulum')).toMatchObject([{ sprite: 'mass-block', x: 'S', rope: 'spring', mount: true }])
    expect(scene('newtons-law-of-cooling')).toMatchObject([{ fill: 'thermometer', y: 'TEMPERATUR', sprite: 'cup' }])
    expect(scene('thermostat')).toMatchObject([{ fill: 'thermometer', y: 'TEMPERATUR', sprite: 'house' }, { sprite: 'flame', scaleBy: 'HEIZUNG', y: null }])
    expect(scene('earth-energy-balance')).toMatchObject([{ fill: 'thermometer', y: 'CELSIUS', sprite: 'earth' }])
    expect(scene('ice-cube')).toMatchObject([{ fill: 'vessel', y: 'GETRAENK', sprite: 'ice-cube', scaleBy: 'EIS' }, { fill: 'thermometer', y: 'TEMPERATUR', sprite: 'thermometer' }])
    expect(scene('camera-flash')).toMatchObject([{ fill: 'bar', y: 'LADUNG', sprite: 'capacitor' }])
    expect(scene('caffeine')).toMatchObject([{ fill: 'bar', y: 'MAGEN', sprite: 'cup' }, { fill: 'bar', y: 'KOERPER', sprite: 'person' }])
    expect(scene('classroom-co2')).toMatchObject([{ fill: 'bar', y: 'KONZENTRATION', sprite: 'co2' }])
    expect(scene('radioactive-decay')).toMatchObject([{ fill: 'bar', y: 'BARIUM', sprite: 'nucleus' }])
    expect(scene('population-germany')).toMatchObject([{ fill: 'bar', y: 'BEVOELKERUNG', sprite: 'person' }])
    expect(scene('sir-epidemic').map((o) => [o.fill, o.y, o.sprite])).toEqual([['bar', 'GESUNDE', 'person'], ['bar', 'KRANKE', 'virus'], ['bar', 'GENESENE', 'person-recovered']])
    // columns of one scene share their scale
    const { result, roles } = run('sir-epidemic')
    const sir = defaultAnimation(result, roles, { context: 'sir-epidemic' })
    expect(new Set(sir.objects.map((o) => `${o.min}..${o.max}`)).size).toBe(1)
    expect(sir.objects[0]).toMatchObject({ min: 0, max: 1000 })
  })
})

describe('gauges', () => {
  const r = fake({ T: [0, 1, 2, 3], A: [0, 5, 10, 20], C: [20, 15, 10, 5], H: [1, 1, 0, 0] })

  it('the level runs from the bottom (min) to the top (max) and is clamped', () => {
    const cfg = { objects: [{ id: 'g', sprite: 'drop', y: 'A', fill: 'bar', min: 0, max: 10 }] }
    const L = computeLayout(r, cfg, VIEW)
    const at = (i) => frameAt(r, cfg, i, L).objects[0]
    close(at(0).gauge.level, at(0).gauge.bottom)
    close(at(2).gauge.level, at(2).gauge.top)
    close(at(1).gauge.level, (at(0).gauge.bottom + at(0).gauge.top) / 2)
    close(at(3).gauge.level, at(3).gauge.top) // 20 > max
    expect(at(2).gauge.ticks.map((t) => t.v)).toContain(10)
    // the sprite sits on the column
    close(at(1).y + at(1).size / 2, at(1).gauge.level)
    expect(L.usesX || L.usesY).toBe(false)
  })

  it('automatic scales: amounts from 0, temperatures around the data', () => {
    expect(gaugeScale(r, { fill: 'bar', y: 'A' })).toEqual([0, 25])
    const [lo, hi] = gaugeScale(r, { fill: 'thermometer', y: 'C' })
    expect(lo).toBeLessThan(5); expect(lo).toBeGreaterThan(-5); expect(hi).toBeGreaterThan(20); expect(hi).toBeLessThan(30)
    expect(gaugeScale(r, { fill: 'bar', y: 'A', min: 5, max: 50 })).toEqual([5, 50])
    expect(gaugeScale(r, { fill: 'bar', y: 'A', min: 50, max: 5 })).toEqual([0, 25]) // invalid → automatic
  })

  it('gauges stand side by side; a thermometer has its picture next to it, not on it', () => {
    const cfg = { objects: [{ id: 'a', sprite: 'cup', y: 'C', fill: 'thermometer', size: 40 }, { id: 'b', sprite: 'drop', y: 'A', fill: 'vessel' }, { id: 'c', sprite: 'flame', scaleBy: 'H' }] }
    const L = computeLayout(r, cfg, { width: 800, height: 400 })
    const f = frameAt(r, cfg, 0, L).objects
    expect(f[0].gauge.cx).toBeLessThan(f[1].gauge.cx)
    expect(f[1].gauge.cx).toBeLessThan(f[2].x)
    expect(f[0].x).toBeLessThan(f[0].gauge.x) // the cup left of the tube
    close(f[0].y + f[0].size / 2, L.groundY) // on the ground
    expect(f[0].showSprite).toBe(true)
    const plain = frameAt(r, { objects: [{ sprite: 'thermometer', y: 'C', fill: 'thermometer' }] }, 0, VIEW).objects[0]
    expect(plain.showSprite).toBe(false)
    // a vessel is not much taller than wide
    expect(f[1].gauge.bottom - f[1].gauge.top).toBeLessThanOrEqual(f[1].gauge.width * 1.3 + 0.1)
  })

  it('scaleBy: the area follows the value; zero hides the sprite', () => {
    const cfg = { objects: [{ id: 'f', sprite: 'ice-cube', size: 40, scaleBy: 'A' }] }
    const L = computeLayout(r, cfg, VIEW)
    expect(frameAt(r, cfg, 3, L).objects[0].size).toBe(40)
    close(frameAt(r, cfg, 1, L).objects[0].size, 40 * Math.sqrt(5 / 20), 1e-9)
    const zero = frameAt(r, cfg, 0, L).objects[0]
    expect(zero.size).toBe(0); expect(zero.showSprite).toBe(false)
    // the label stays where the full-size sprite would have it
    const withLabel = { objects: [{ id: 'f', sprite: 'ice-cube', size: 40, scaleBy: 'A', label: 'Eis' }] }
    const L2 = computeLayout(r, withLabel, VIEW)
    expect(frameAt(r, withLabel, 1, L2).objects[0].labelY).toBe(frameAt(r, withLabel, 3, L2).objects[0].labelY)
  })
})

describe('labels', () => {
  it('labels close together are moved apart and never overlap', () => {
    const r = fake({ T: [0, 1], A: [10, 10], B: [10.2, 10.2], C: [10.1, 10.1] })
    const cfg = { objects: ['A', 'B', 'C'].map((n) => ({ sprite: 'rabbit', x: 'T', y: n, size: 30, label: 'Label ' + n })), background: 'grid' }
    const f = frameAt(r, cfg, 1, VIEW).objects
    for (let i = 0; i < f.length; i++) {
      for (let j = i + 1; j < f.length; j++) {
        const apart = Math.abs(f[i].labelY - f[j].labelY) >= 15 || Math.abs(f[i].labelX - f[j].labelX) > 60
        expect(apart, `${i}/${j}`).toBe(true)
      }
    }
    // labels far apart stay where they are
    const far = fake({ T: [0, 1], A: [0, 0], B: [100, 100] })
    const g = frameAt(far, { objects: [{ sprite: 'ball', x: 0, y: 'A', label: 'a' }, { sprite: 'ball', x: 1, y: 'B', label: 'b' }] }, 0, VIEW).objects
    close(g[0].labelY, g[0].y - 16 - 6); close(g[1].labelY, Math.max(12, g[1].y - 16 - 6))
  })

  it('a shrunk picture hides its label, a gauge keeps it', () => {
    const r = fake({ T: [0, 1], H: [0, 1], A: [1, 2] })
    const cfg = { objects: [{ sprite: 'thermometer', y: 'A', fill: 'thermometer', label: 'Temp' }, { sprite: 'flame', scaleBy: 'H', label: 'Heizung' }] }
    const off = frameAt(r, cfg, 0, VIEW).objects
    expect(off.map((o) => o.showLabel)).toEqual([true, false])
    expect(frameAt(r, cfg, 1, VIEW).objects.map((o) => o.showLabel)).toEqual([true, true])
  })
})

describe('ropes', () => {
  const r = fake({ T: [0, 1, 2], S: [0, 10, 20], X: [1, 2, 3] })

  it('a rope runs from the anchor to the edge of the sprite; a bridge marks an anchor above', () => {
    const cfg = { objects: [{ sprite: 'person', y: 'S', size: 40, rope: { x: null, y: 0, style: 'rope', mount: true } }], flipY: true }
    const L = computeLayout(r, cfg, VIEW)
    const o = frameAt(r, cfg, 2, L).objects[0]
    expect(o.rope).toMatchObject({ x1: o.x, y1: L.toPxY(0), x2: o.x, style: 'rope', mount: 'bridge' })
    close(o.rope.y2, o.y - 40 * 0.42)
    expect(L.margin.t).toBeGreaterThanOrEqual(30) // room for the railing
    expect(frameAt(r, cfg, 0, L).objects[0].rope.y2).toBe(frameAt(r, cfg, 0, L).objects[0].rope.y1) // no rope yet
  })

  it('a spring to a wall at the side; the anchor is inside the range', () => {
    const cfg = { objects: [{ sprite: 'mass-block', x: 'X', rope: { x: -2, style: 'spring', mount: true } }] }
    const L = computeLayout(r, cfg, VIEW)
    expect(L.xRange[0]).toBeLessThanOrEqual(-2)
    const o = frameAt(r, cfg, 1, L).objects[0]
    expect(o.rope).toMatchObject({ mount: 'wall', style: 'spring', y1: o.y })
    expect(o.rope.points.split(' ')).toHaveLength(24)
    expect(springPoints(0, 0, 100, 0, 4).split(' ')).toHaveLength(12)
    expect(springPoints(0, 0, 0.2, 0)).toBe('0,0 0.2,0')
  })

  it('normalises ropes and fills', () => {
    const o = normalizeAnimation({ objects: [{ sprite: 'person', y: 'S', rope: true, fill: 'nonsense' }] }).objects[0]
    expect(o.rope).toEqual({ x: null, y: 0, style: 'rope', mount: false })
    expect(o.fill).toBe(null)
    expect(makeObject({ rope: { y: 2, style: 'zigzag' } }).rope.style).toBe('rope')
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
    expect(suggestSprite('Konzentration', 'classroom-co2')).toBe('co2')
    expect(suggestSprite('N', 'radioactive-decay')).toBe('nucleus')
    expect(suggestSprite('Hoehe', 'Badewanne')).toBe('duck')
  })

  it('only suggests existing sprites; headings only for rotating sprites', () => {
    const ids = new Set(SPRITES.map((s) => s.id))
    for (const w of ['Ball', 'Rakete', 'Satellit', 'Erde', 'Mond', 'Pendel', 'Auto', 'Luchs', 'Virus', 'Kaffee', 'Ladung', 'Haus', 'CO2', 'Badeente', 'Heizung', 'Barium', 'Koerper']) {
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
    expect(validateAnimation(r, { objects: [{ id: 'g', sprite: 'drop', fill: 'vessel', min: 3, max: 1, scaleBy: 'Q' }] })).toEqual([
      { code: 'unknownVariable', object: 'g', field: 'scaleBy', name: 'Q' },
      { code: 'noValue', object: 'g', field: 'y' },
      { code: 'badRange', object: 'g', field: 'y' },
    ])
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
    expect(usedVariables({ objects: [{ x: 'X', y: 'X', angle: 'W' }, { x: 0, y: 'Y', scaleBy: 'Z' }] })).toEqual(['X', 'W', 'Y', 'Z'])
  })
})

describe('separateLabels stacking order', () => {
  it('gives the upper object the upper label when labels stack', () => {
    const obj = (id, y) => ({ id, x: 100, y, size: 24, showSprite: true, showLabel: true, label: id, labelX: 100, labelY: y - 16 })
    const [upper, lower] = separateLabels([obj('Upper', 100), obj('Lower', 118)])
    expect(upper.labelY).toBeLessThan(lower.labelY)
  })
})
