import { describe, expect, it } from 'vitest'
import {
  BOX, VIEWS, backSides, boxEdges, clampPitch, dataRange, fitScale, labelEdge, lerpYaw,
  makeProjector, niceDomain, niceTicks, normalize, overlaps, projectPoints, rotate, textBox, wrapYaw,
} from '../src/components/chart3d.js'

const close = (a, b) => a.forEach((v, i) => expect(v).toBeCloseTo(b[i], 9))

describe('nice ticks and domains', () => {
  it('uses 1-2-2.5-5 steps', () => {
    expect(niceTicks(0, 10, 5)).toEqual([0, 2, 4, 6, 8, 10])
    expect(niceTicks(-1, 1, 5)).toEqual([-1, -0.5, 0, 0.5, 1])
    expect(niceTicks(0, 1, 4)).toEqual([0, 0.25, 0.5, 0.75, 1])
  })
  it('handles degenerate input', () => {
    expect(niceTicks(NaN, 1)).toEqual([0, 1])
    expect(niceTicks(3, 3, 2)).toEqual([2, 3, 4])
  })
  it('widens a domain to whole steps', () => {
    expect(niceDomain(0.13, 9.7, 5)).toEqual([0, 10])
    expect(niceDomain(-0.98, 0.99, 5)).toEqual([-1, 1])
    expect(niceDomain(5, 5, 5)).toEqual([4, 6])
  })
  it('finds the finite data range', () => {
    expect(dataRange(new Float64Array([3, NaN, -2, Infinity, 7]))).toEqual([-2, 7])
    expect(dataRange([])).toEqual([0, 1])
    expect(dataRange([4, 4])).toEqual([3, 5])
  })
  it('normalizes to the box', () => {
    expect(normalize(0, [0, 10])).toBe(-1)
    expect(normalize(10, [0, 10])).toBe(1)
    expect(normalize(5, [0, 10], 0.5)).toBe(0)
  })
})

describe('angles', () => {
  it('wraps yaw and clamps pitch', () => {
    expect(wrapYaw(190)).toBe(-170)
    expect(wrapYaw(-190)).toBe(170)
    expect(wrapYaw(360)).toBe(0)
    expect(clampPitch(120)).toBe(90)
    expect(clampPitch(-5)).toBe(0)
  })
  it('interpolates yaw the short way round', () => {
    expect(lerpYaw(170, -170, 0.5)).toBeCloseTo(180)
    expect(lerpYaw(-10, 10, 0.25)).toBeCloseTo(-5)
  })
})

describe('projection', () => {
  it('front view shows x to the right and z up', () => {
    close(rotate([1, 0, 0], 0, 0), [1, 0, 0])
    close(rotate([0, 0, 1], 0, 0), [0, 1, 0])
    close(rotate([0, 1, 0], 0, 0), [0, 0, 1]) // y goes into the depth
  })
  it('top view shows x to the right and y up', () => {
    const { yaw, pitch } = VIEWS.xy
    close(rotate([1, 0, 0], yaw, pitch), [1, 0, 0])
    close(rotate([0, 1, 0], yaw, pitch), [0, 1, 0])
    close(rotate([0, 0, 1], yaw, pitch), [0, 0, -1]) // top is nearest
  })
  it('y–z view shows y to the right and z up', () => {
    const { yaw, pitch } = VIEWS.yz
    close(rotate([0, 1, 0], yaw, pitch), [1, 0, 0])
    close(rotate([0, 0, 1], yaw, pitch), [0, 1, 0])
  })
  it('keeps lengths (rotation only)', () => {
    const p = [0.3, -0.7, 0.5]
    const q = rotate(p, -32, 24)
    expect(Math.hypot(...q)).toBeCloseTo(Math.hypot(...p), 12)
  })
  it('maps to pixels with y downwards', () => {
    const project = makeProjector({ yaw: 0, pitch: 0, scale: 100, cx: 200, cy: 150 })
    close(project([1, 0, 1]).slice(0, 2), [300, 50])
  })
  it('perspective makes far points smaller', () => {
    const project = makeProjector({ yaw: 0, pitch: 0, scale: 100, distance: 5 })
    expect(project([1, 1, 0])[0]).toBeLessThan(project([1, -1, 0])[0])
  })
  it('projects data points and skips gaps', () => {
    const project = makeProjector({ yaw: 0, pitch: 0, scale: 10 })
    const pts = projectPoints([0, 1, 2], [0, NaN, 0], [0, 1, 2], project, (a, b, c) => [a, b, c])
    expect(pts).toBe('0.0,0.0 20.0,-20.0')
  })
})

describe('box', () => {
  it('has 12 edges, 4 per axis', () => {
    const edges = boxEdges()
    expect(edges).toHaveLength(12)
    for (let a = 0; a < 3; a++) expect(edges.filter((e) => e.axis === a)).toHaveLength(4)
  })
  it('picks the far faces as back walls', () => {
    expect(backSides(...Object.values(VIEWS.oblique))).toEqual([-1, 1, -1]) // from front right above: left wall, back wall, floor
    expect(backSides(0, 90)[2]).toBe(-1) // seen from above the floor is the back
    expect(backSides(0, 0)).toEqual([-1, 1, -1]) // front view: back wall y = max, ties to -1
  })
  it('labels x and y on the lowest edge and z on the leftmost', () => {
    const { yaw, pitch } = VIEWS.oblique
    const x = labelEdge(0, yaw, pitch)
    expect(x.from[2]).toBe(-BOX[2])
    expect(x.from[1]).toBe(-BOX[1])
    expect(x.outward[1]).toBeGreaterThan(0) // labels below the box
    const z = labelEdge(2, yaw, pitch)
    expect(z.outward[0]).toBeLessThan(0) // labels left of the box
  })
  it('hides an axis that points at the viewer', () => {
    expect(labelEdge(2, 0, 90)).toBeNull()
    expect(labelEdge(1, 0, 0)).toBeNull()
    expect(labelEdge(0, ...Object.values(VIEWS.yz))).toBeNull()
  })
  it('fits the box without zooming while turning', () => {
    const s = fitScale(640, 480, 24, 60)
    expect(s).toBeGreaterThan(50)
    const project = makeProjector({ yaw: 0, pitch: 24, scale: s, cx: 320, cy: 240 })
    for (let yaw = -180; yaw < 180; yaw += 15) {
      const p = makeProjector({ yaw, pitch: 24, scale: s, cx: 320, cy: 240 })
      for (const e of boxEdges()) for (const c of [e.from, e.to]) {
        const [px, py] = p(c)
        expect(px).toBeGreaterThanOrEqual(60 - 1e-6)
        expect(px).toBeLessThanOrEqual(580 + 1e-6)
        expect(py).toBeGreaterThanOrEqual(60 - 1e-6)
        expect(py).toBeLessThanOrEqual(420 + 1e-6)
      }
    }
    expect(project).toBeTypeOf('function')
  })
})

describe('label boxes', () => {
  it('measures labels by anchor', () => {
    expect(textBox(100, 50, 'abcd', 'start', 5, 10)).toEqual({ l: 100, r: 120, t: 45, b: 55 })
    expect(textBox(100, 50, 'abcd', 'end', 5, 10).l).toBe(80)
    expect(textBox(100, 50, 'abcd', 'middle', 5, 10).l).toBe(90)
  })
  it('detects overlaps', () => {
    const a = textBox(0, 0, 'xx', 'start', 5, 10)
    expect(overlaps(a, textBox(8, 4, 'yy', 'start', 5, 10))).toBe(true)
    expect(overlaps(a, textBox(30, 0, 'yy', 'start', 5, 10))).toBe(false)
    expect(overlaps(a, textBox(0, 20, 'yy', 'start', 5, 10))).toBe(false)
  })
  it('fits with separate top and bottom margins', () => {
    expect(fitScale(640, 480, 24, { x: 60, top: 30, bottom: 50 })).toBeGreaterThan(fitScale(640, 480, 24, 60))
  })
})
