<template>
  <figure class="flex flex-col gap-2">
    <div class="flex flex-wrap items-center gap-2" role="group" :aria-label="$t('chart3d.views')">
      <button v-for="v in viewButtons" :key="v.id" type="button" class="btn" :aria-pressed="String(activeView === v.id)"
              :class="activeView === v.id ? 'border-accent bg-accent-soft text-accent-strong' : ''" @click="showView(v.id)">
        {{ v.label }}
      </button>
      <button type="button" class="btn" :aria-pressed="String(spinning)" :disabled="reducedMotion"
              :title="reducedMotion ? $t('chart3d.reducedMotion') : null"
              :class="spinning ? 'border-accent bg-accent-soft text-accent-strong' : ''" @click="toggleSpin">
        {{ $t('chart3d.spin') }}
      </button>
    </div>

    <div ref="box" class="relative w-full min-w-0">
      <svg ref="svg" :viewBox="`0 0 ${w} ${h}`" :width="w" :height="h"
           class="block w-full touch-none select-none" :class="dragging ? 'cursor-grabbing' : 'cursor-grab'"
           role="img" :aria-label="summary" tabindex="0" :aria-describedby="helpId"
           @pointerdown="onDown" @pointermove="onMove" @pointerup="onUp" @pointercancel="onUp" @keydown="onKey">
        <!-- back walls with grid -->
        <g>
          <polygon v-for="wl in walls" :key="'w' + wl.axis" :points="wl.quad" fill="var(--sunken)" fill-opacity="0.55" />
        </g>
        <g stroke="var(--grid)" stroke-width="1">
          <template v-for="wl in walls" :key="'g' + wl.axis">
            <line v-for="(l, i) in wl.lines" :key="i" :x1="l[0]" :y1="l[1]" :x2="l[2]" :y2="l[3]" />
          </template>
        </g>
        <g stroke="var(--line)" stroke-width="1.25" stroke-linecap="round">
          <line v-for="(e, i) in edges.back" :key="'eb' + i" :x1="e[0]" :y1="e[1]" :x2="e[2]" :y2="e[3]" />
        </g>

        <!-- shadow on the floor and drop lines -->
        <polyline :points="shadowPoints" fill="none" stroke="var(--muted)" stroke-opacity="0.75" stroke-width="1.5"
                  stroke-dasharray="4 4" stroke-linejoin="round" />
        <g stroke="var(--muted)" stroke-width="1" stroke-dasharray="2 3">
          <line v-for="(m, i) in markers" :key="'d' + i" :x1="m.at[0]" :y1="m.at[1]" :x2="m.floor[0]" :y2="m.floor[1]" />
        </g>

        <!-- curve -->
        <polyline :points="curvePoints" fill="none" stroke="var(--s1)" stroke-width="2.5"
                  stroke-linejoin="round" stroke-linecap="round" />

        <!-- front edges stay on top, but faint -->
        <g stroke="var(--line)" stroke-width="1" stroke-dasharray="1 0" stroke-opacity="0.8">
          <line v-for="(e, i) in edges.front" :key="'ef' + i" :x1="e[0]" :y1="e[1]" :x2="e[2]" :y2="e[3]" />
        </g>

        <!-- start and end -->
        <g v-for="(m, i) in markers" :key="'m' + i">
          <circle :cx="m.at[0]" :cy="m.at[1]" r="5.5" :fill="i === 0 ? 'var(--sheet)' : 'var(--s1)'" stroke="var(--s1)" stroke-width="2.5" />
          <text :x="m.text[0]" :y="m.text[1]" dominant-baseline="middle" font-size="12" font-weight="700" fill="var(--ink)"
                stroke="var(--sheet)" stroke-width="3" paint-order="stroke">{{ m.label }}</text>
        </g>

        <!-- ticks and axis names -->
        <g v-for="a in axes" :key="'a' + a.axis">
          <g stroke="var(--muted)" stroke-width="1">
            <line v-for="t in a.ticks" :key="'k' + t.value" :x1="t.p[0]" :y1="t.p[1]" :x2="t.mark[0]" :y2="t.mark[1]" />
          </g>
          <g font-size="12" fill="var(--muted)" class="tabular">
            <text v-for="t in a.ticks.filter((t) => t.show)" :key="'l' + t.value" :x="t.label[0]" :y="t.label[1]"
                  :text-anchor="a.anchor" dominant-baseline="middle">{{ t.text }}</text>
          </g>
          <text :x="a.name[0]" :y="a.name[1]" :text-anchor="a.nameAnchor" dominant-baseline="middle"
                font-size="13" font-weight="700" fill="var(--ink)">{{ a.title }}</text>
        </g>
      </svg>
    </div>
    <p class="sr-only" aria-live="polite">{{ liveText }}</p>
    <figcaption :id="helpId" class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
      <span>{{ $t('chart3d.help') }}</span>
      <span class="inline-flex items-center gap-1.5" aria-hidden="true">
        <svg width="24" height="8"><line x1="1" y1="4" x2="23" y2="4" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="4 4" /></svg>
        {{ $t('chart3d.shadow') }}
      </span>
    </figcaption>
  </figure>
</template>

<script>
import { formatNumber } from '../engine/model.js'
import { numberLocale } from '../i18n/index.js'
import {
  BOX, VIEWS, backSides, boxEdges, clampPitch, dataRange, fitScale, labelEdge, lerpYaw,
  makeProjector, niceDomain, niceTicks, normalize, overlaps, projectPoints, textBox, wrapYaw,
} from './chart3d.js'

const SPIN_SPEED = 14 // degrees per second
const KEY_STEP = 5
const AXIS_LETTERS = ['x', 'y', 'z']

export default {
  name: 'ResultChart3D',
  props: {
    result: { type: Object, required: true },
    x: { type: String, required: true },
    y: { type: String, required: true },
    z: { type: String, required: true },
  },
  data() {
    return {
      w: 640, h: 480, ro: null,
      yaw: VIEWS.oblique.yaw, pitch: VIEWS.oblique.pitch,
      dragging: null, spinning: false, frame: 0, reducedMotion: false, motionQuery: null,
      liveText: '',
    }
  },
  computed: {
    helpId() { return `chart3d-help-${this.$.uid}` },
    names() { return [this.x, this.y, this.z] },
    values() { return this.names.map((n) => this.result.series[n] ?? new Float64Array(0)) },
    labels() { return this.names.map((n) => this.result.display.get(n) ?? n) },
    ranges() { return this.values.map((d) => dataRange(d)) },
    domains() { return this.ranges.map(([lo, hi]) => niceDomain(lo, hi, 5)) },
    ticks() { return this.domains.map(([lo, hi]) => niceTicks(lo, hi, 5)) },
    // room for tick labels at the sides, the z name on top and the x/y names below
    pad() { return this.w < 480 ? { x: 44, top: 30, bottom: 44 } : { x: 64, top: 34, bottom: 56 } },
    scale() { return fitScale(this.w, this.h, this.pitch, this.pad) },
    project() {
      const cy = this.pad.top + (this.h - this.pad.top - this.pad.bottom) / 2
      return makeProjector({ yaw: this.yaw, pitch: this.pitch, scale: this.scale, cx: this.w / 2, cy })
    },
    sides() { return backSides(this.yaw, this.pitch) },
    walls() {
      return [0, 1, 2].map((axis) => {
        const [j, k] = [0, 1, 2].filter((i) => i !== axis)
        const fixed = this.sides[axis] * BOX[axis]
        const pt = (a, b) => { const p = [0, 0, 0]; p[axis] = fixed; p[j] = a; p[k] = b; return this.project(p) }
        const quad = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => pt(a * BOX[j], b * BOX[k]).slice(0, 2).map((v) => v.toFixed(1)).join(',')).join(' ')
        const lines = []
        for (const t of this.ticks[j]) {
          const a = normalize(t, this.domains[j], BOX[j])
          lines.push([...pt(a, -BOX[k]).slice(0, 2), ...pt(a, BOX[k]).slice(0, 2)])
        }
        for (const t of this.ticks[k]) {
          const b = normalize(t, this.domains[k], BOX[k])
          lines.push([...pt(-BOX[j], b).slice(0, 2), ...pt(BOX[j], b).slice(0, 2)])
        }
        return { axis, quad, lines }
      })
    },
    edges() {
      const back = []
      const front = []
      for (const e of boxEdges()) {
        const [j, k] = [0, 1, 2].filter((i) => i !== e.axis)
        const seg = [...this.project(e.from).slice(0, 2), ...this.project(e.to).slice(0, 2)]
        // an edge belongs to the back when it lies on one of the back walls
        if (e.sides[0] === this.sides[j] || e.sides[1] === this.sides[k]) back.push(seg)
        else front.push(seg)
      }
      return { back, front }
    },
    curvePoints() {
      return projectPoints(...this.values, this.project, this.toWorld)
    },
    shadowPoints() {
      return projectPoints(...this.values, this.project, (a, b, c) => { const p = this.toWorld(a, b, c); p[2] = -BOX[2]; return p })
    },
    endIndices() {
      const n = Math.min(...this.values.map((d) => d.length))
      const ok = (k) => this.values.every((d) => Number.isFinite(d[k]))
      let first = 0
      while (first < n && !ok(first)) first++
      let last = n - 1
      while (last > first && !ok(last)) last--
      return first < n ? [first, last] : []
    },
    markers() {
      const out = this.endIndices.map((k, i) => {
        const p = this.toWorld(this.values[0][k], this.values[1][k], this.values[2][k])
        const at = this.project(p)
        const label = this.$t(i === 0 ? 'chart3d.start' : 'chart3d.end')
        return { at, floor: this.project([p[0], p[1], -BOX[2]]), label, text: [at[0] + 10, at[1] - 9] }
      })
      // start and end close together: the lower point gets its label below
      if (out.length === 2) {
        const box = (m) => textBox(m.text[0], m.text[1], m.label, 'start', 7.2)
        if (overlaps(box(out[0]), box(out[1]))) {
          const lower = out[0].at[1] > out[1].at[1] ? out[0] : out[1]
          lower.text = [lower.at[0] + 10, lower.at[1] + 13]
        }
      }
      return out
    },
    axes() {
      const out = []
      // labels already placed; a tick label that would overlap one of them is left out
      const placed = this.markers.map((m) => textBox(m.text[0], m.text[1], m.label, 'start', 7.2))
      for (const axis of [2, 0, 1]) {
        const edge = labelEdge(axis, this.yaw, this.pitch)
        if (!edge) continue
        const [ox, oy] = edge.outward
        const ticks = this.ticks[axis]
        const spacing = (edge.length * this.scale * 2 * BOX[axis]) * (ticks[1] - ticks[0]) / (this.domains[axis][1] - this.domains[axis][0])
        const every = spacing >= 34 ? 1 : spacing >= 17 ? 2 : Infinity
        const anchor = ox > 0.45 ? 'start' : ox < -0.45 ? 'end' : 'middle'
        const items = ticks.map((value, i) => {
          const p3 = [...edge.from]
          p3[axis] = normalize(value, this.domains[axis], BOX[axis])
          const p = this.project(p3)
          const text = this.fmt(value)
          const label = [p[0] + ox * 10, p[1] + oy * 12]
          let show = i % every === 0 || (every === Infinity && (i === 0 || i === ticks.length - 1))
          if (show) {
            const box = textBox(label[0], label[1], text, anchor)
            if (placed.some((b) => overlaps(b, box))) show = false
            else placed.push(box)
          }
          return { value, show, text, p, mark: [p[0] + ox * 5, p[1] + oy * 5], label }
        })
        const textWidth = Math.max(...items.map((t) => t.text.length)) * 6.6
        const a = this.project(edge.from)
        const b = this.project(edge.to)
        const title = this.labels[axis]
        let name
        let nameAnchor = 'middle'
        if (axis === 2) {
          // the z name sits above the column of z tick labels
          const top = a[1] < b[1] ? a : b
          const lx = top[0] + ox * 10
          name = [lx + (anchor === 'end' ? -textWidth / 2 : anchor === 'start' ? textWidth / 2 : 0), top[1] - 22]
        } else {
          const gap = 30 + (Math.abs(ox) > 0.45 ? textWidth : 0)
          name = [(a[0] + b[0]) / 2 + ox * gap, (a[1] + b[1]) / 2 + oy * (gap - 2)]
          nameAnchor = anchor
        }
        // keep the name inside the picture
        const half = (title.length * 7.4) / 2
        const left = nameAnchor === 'start' ? 0 : nameAnchor === 'end' ? 2 * half : half
        name[0] = Math.min(this.w - 2 * half + left - 4, Math.max(left + 4, name[0]))
        name[1] = Math.min(this.h - 10, Math.max(10, name[1]))
        placed.push(textBox(name[0], name[1], title, nameAnchor, 7.4))
        out.push({ axis, ticks: items, anchor, name, nameAnchor, title })
      }
      return out
    },
    activeView() {
      const close = (a, b) => Math.abs(wrapYaw(a - b)) < 0.5
      return Object.keys(VIEWS).find((id) => close(this.yaw, VIEWS[id].yaw) && Math.abs(this.pitch - VIEWS[id].pitch) < 0.5) ?? null
    },
    viewButtons() {
      const [x, y, z] = this.labels
      return [
        { id: 'oblique', label: this.$t('chart3d.oblique') },
        { id: 'xy', label: this.$t('chart3d.view', { a: x, b: y }) },
        { id: 'xz', label: this.$t('chart3d.view', { a: x, b: z }) },
        { id: 'yz', label: this.$t('chart3d.view', { a: y, b: z }) },
      ]
    },
    summary() {
      const ranges = this.ranges.map(([lo, hi], i) => this.$t('chart3d.range', { axis: AXIS_LETTERS[i], name: this.labels[i], from: this.fmt(lo), to: this.fmt(hi) }))
      const point = (k) => this.$t('chart3d.point', { x: this.fmt(this.values[0][k]), y: this.fmt(this.values[1][k]), z: this.fmt(this.values[2][k]) })
      const [first, last] = this.endIndices
      return this.$t('chart3d.summary', {
        steps: this.result.steps,
        ranges: ranges.join('; '),
        start: first === undefined ? '–' : point(first),
        end: last === undefined ? '–' : point(last),
      })
    },
  },
  mounted() {
    this.ro = new ResizeObserver(([e]) => {
      this.w = Math.max(280, Math.round(e.contentRect.width))
      this.h = Math.min(480, Math.max(260, Math.round(this.w * 0.75)))
    })
    this.ro.observe(this.$refs.box)
    this.motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)') ?? null
    this.reducedMotion = !!this.motionQuery?.matches
    this.motionQuery?.addEventListener?.('change', this.onMotionChange)
  },
  beforeUnmount() {
    this.ro?.disconnect()
    this.motionQuery?.removeEventListener?.('change', this.onMotionChange)
    cancelAnimationFrame(this.frame)
  },
  methods: {
    fmt(v, d = 4) { return formatNumber(v, d, numberLocale()) },
    toWorld(a, b, c) {
      return [normalize(a, this.domains[0], BOX[0]), normalize(b, this.domains[1], BOX[1]), normalize(c, this.domains[2], BOX[2])]
    },
    setAngles(yaw, pitch) {
      this.yaw = wrapYaw(yaw)
      this.pitch = clampPitch(pitch)
    },
    announce() {
      this.liveText = this.$t('chart3d.angles', { yaw: Math.round(this.yaw), pitch: Math.round(this.pitch) })
    },
    stopAnimation() {
      cancelAnimationFrame(this.frame)
      this.frame = 0
      this.spinning = false
    },
    /** Turns smoothly to a preset view (instantly with reduced motion). */
    showView(id) {
      this.stopAnimation()
      const target = VIEWS[id]
      if (this.reducedMotion) {
        this.setAngles(target.yaw, target.pitch)
        this.announce()
        return
      }
      const from = { yaw: this.yaw, pitch: this.pitch }
      const t0 = performance.now()
      const step = (now) => {
        const t = Math.min(1, (now - t0) / 450)
        const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
        this.yaw = lerpYaw(from.yaw, target.yaw, e)
        this.pitch = from.pitch + (target.pitch - from.pitch) * e
        if (t < 1) this.frame = requestAnimationFrame(step)
        else { this.setAngles(target.yaw, target.pitch); this.frame = 0; this.announce() }
      }
      this.frame = requestAnimationFrame(step)
    },
    toggleSpin() {
      if (this.spinning) { this.stopAnimation(); this.announce(); return }
      if (this.reducedMotion) return
      this.stopAnimation()
      this.spinning = true
      let last = performance.now()
      const step = (now) => {
        this.yaw = wrapYaw(this.yaw + SPIN_SPEED * (now - last) / 1000)
        last = now
        this.frame = requestAnimationFrame(step)
      }
      this.frame = requestAnimationFrame(step)
    },
    onMotionChange(e) {
      this.reducedMotion = e.matches
      if (e.matches && this.spinning) this.stopAnimation()
    },
    onDown(ev) {
      if (ev.button !== undefined && ev.button !== 0) return
      this.stopAnimation()
      this.dragging = { x: ev.clientX, y: ev.clientY }
      ev.currentTarget.setPointerCapture?.(ev.pointerId)
    },
    onMove(ev) {
      if (!this.dragging) return
      const dx = ev.clientX - this.dragging.x
      const dy = ev.clientY - this.dragging.y
      this.dragging = { x: ev.clientX, y: ev.clientY }
      this.setAngles(this.yaw - dx * 0.5, this.pitch + dy * 0.4)
    },
    onUp(ev) {
      if (!this.dragging) return
      this.dragging = null
      ev.currentTarget.releasePointerCapture?.(ev.pointerId)
      this.announce()
    },
    onKey(ev) {
      const step = ev.shiftKey ? KEY_STEP * 3 : KEY_STEP
      const moves = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }
      if (ev.key in moves) {
        this.stopAnimation()
        this.setAngles(this.yaw + moves[ev.key][0], this.pitch + moves[ev.key][1])
        this.announce()
      } else if (ev.key === 'Home') {
        this.showView('oblique')
      } else return
      ev.preventDefault()
    },
    /** Standalone SVG of the current view with theme colours resolved. */
    toSvgString() {
      const clone = this.$refs.svg.cloneNode(true)
      const css = getComputedStyle(document.documentElement)
      const resolve = (v) => v.replace(/var\((--[\w-]+)\)/g, (_, name) => css.getPropertyValue(name).trim() || '#000')
      for (const el of [clone, ...clone.querySelectorAll('*')]) {
        for (const attr of [...el.attributes]) if (attr.value.includes('var(')) el.setAttribute(attr.name, resolve(attr.value))
      }
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
      clone.setAttribute('font-family', 'Atkinson Hyperlegible Next, Arial, sans-serif')
      clone.removeAttribute('class')
      clone.removeAttribute('tabindex')
      const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      bg.setAttribute('width', this.w); bg.setAttribute('height', this.h); bg.setAttribute('fill', css.getPropertyValue('--sheet').trim())
      clone.insertBefore(bg, clone.firstChild)
      return new XMLSerializer().serializeToString(clone)
    },
  },
}
</script>
