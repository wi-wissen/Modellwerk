<template>
  <figure class="flex flex-col gap-2">
    <div ref="box" class="relative w-full min-w-0">
      <svg :viewBox="`0 0 ${w} ${h}`" :width="w" :height="h" class="block w-full touch-none select-none"
           role="img" :aria-label="summary" tabindex="0"
           aria-describedby="chart-help"
           @pointermove="onPointer" @pointerleave="cursor = null" @keydown="onKey" @focus="onFocus" @blur="cursor = null">
        <rect :x="m.l" :y="m.t" :width="pw" :height="ph" fill="var(--sheet)" />
        <g stroke="var(--grid)" stroke-width="1">
          <line v-for="t in yTicks" :key="'gy' + t" :x1="m.l" :x2="m.l + pw" :y1="sy(t)" :y2="sy(t)" />
          <line v-for="t in xTicks" :key="'gx' + t" :y1="m.t" :y2="m.t + ph" :x1="sx(t)" :x2="sx(t)" />
        </g>
        <line v-if="yDomain[0] < 0 && yDomain[1] > 0" :x1="m.l" :x2="m.l + pw" :y1="sy(0)" :y2="sy(0)" stroke="var(--muted)" stroke-width="1" />
        <rect :x="m.l" :y="m.t" :width="pw" :height="ph" fill="none" stroke="var(--line)" />

        <g font-size="12" fill="var(--muted)" class="tabular">
          <text v-for="t in yTicks" :key="'ty' + t" :x="m.l - 8" :y="sy(t) + 4" text-anchor="end">{{ fmt(t) }}</text>
          <text v-for="t in xTicks" :key="'tx' + t" :x="sx(t)" :y="m.t + ph + 18" text-anchor="middle">{{ fmt(t) }}</text>
        </g>
        <text :x="m.l + pw / 2" :y="h - 6" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">{{ xLabel }}</text>

        <g fill="none" stroke-linejoin="round" stroke-linecap="round">
          <polyline v-for="(s, i) in lines" :key="s.name" :points="s.points" :stroke="s.color" stroke-width="2.5"
                    :stroke-dasharray="dash(i)" />
        </g>

        <g v-if="cursor !== null">
          <line :x1="sx(xs[cursor])" :x2="sx(xs[cursor])" :y1="m.t" :y2="m.t + ph" stroke="var(--ink)" stroke-width="1" stroke-dasharray="3 3" />
          <circle v-for="s in lines" :key="'c' + s.name" :cx="sx(xs[cursor])" :cy="sy(s.data[cursor])" r="4.5"
                  :fill="s.color" stroke="var(--sheet)" stroke-width="2" />
        </g>
      </svg>

      <div v-if="cursor !== null" class="pointer-events-none absolute top-2 rounded-lg border border-line bg-sheet px-3 py-2 text-sm shadow-md tabular"
           :style="tipStyle" aria-hidden="true">
        <div class="font-semibold">Schritt {{ cursor }} · {{ xLabel }} = {{ fmt(xs[cursor], 6) }}</div>
        <div v-for="(s, i) in lines" :key="'t' + s.name" class="flex items-center gap-2">
          <svg width="22" height="8" aria-hidden="true"><line x1="1" y1="4" x2="21" y2="4" :stroke="s.color" stroke-width="2.5" :stroke-dasharray="dash(i)" /></svg>
          <span class="font-mono">{{ s.label }}</span><span class="ml-auto pl-3">{{ fmt(s.data[cursor], 6) }}</span>
        </div>
      </div>
    </div>
    <p class="sr-only" aria-live="polite">{{ liveText }}</p>
    <figcaption id="chart-help" class="text-sm text-muted">
      Zeiger über das Diagramm bewegen oder Diagramm anklicken und mit den Pfeiltasten ← → Werte ablesen.
    </figcaption>
  </figure>
</template>

<script>
import { formatNumber } from '../engine/model.js'

const COLORS = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--s5)', 'var(--s6)']
const DASHES = ['', '8 5', '2 4', '12 4 2 4', '4 3', '16 6']

function niceStep(lo, hi, count) {
  const raw = (hi - lo) / count
  const mag = 10 ** Math.floor(Math.log10(raw))
  return [1, 2, 2.5, 5, 10].map((f) => f * mag).find((s) => s >= raw)
}

function niceTicks(lo, hi, count = 6) {
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return [0, 1]
  if (lo === hi) { lo -= 1; hi += 1 }
  const step = niceStep(lo, hi, count)
  const out = []
  for (let k = Math.ceil(lo / step - 1e-9); k * step <= hi + step * 1e-9; k++) out.push(Math.abs(k * step) < step * 1e-9 ? 0 : k * step)
  return out
}

export default {
  name: 'ResultChart',
  props: {
    result: { type: Object, required: true },
    x: { type: String, required: true },
    ys: { type: Array, required: true },
  },
  data() {
    return { w: 640, h: 380, cursor: null, m: { l: 64, r: 16, t: 14, b: 44 }, ro: null }
  },
  computed: {
    pw() { return this.w - this.m.l - this.m.r },
    ph() { return this.h - this.m.t - this.m.b },
    xs() { return this.result.series[this.x] ?? [] },
    xLabel() { return this.result.display.get(this.x) ?? this.x },
    xDomain() { return this.domain([this.xs]) },
    yDomain() {
      const [lo, hi] = this.domain(this.ys.map((n) => this.result.series[n]).filter(Boolean))
      const step = niceStep(lo, hi, 6)
      return [Math.floor(lo / step + 1e-9) * step, Math.ceil(hi / step - 1e-9) * step]
    },
    xTicks() { return niceTicks(...this.xDomain, Math.max(2, Math.floor(this.pw / 90))) },
    yTicks() { return niceTicks(...this.yDomain, 6) },
    lines() {
      return this.ys.filter((n) => this.result.series[n]).map((name, i) => {
        const data = this.result.series[name]
        let points = ''
        for (let k = 0; k < data.length; k++) {
          const px = this.sx(this.xs[k])
          const py = this.sy(data[k])
          if (Number.isFinite(px) && Number.isFinite(py)) points += `${px.toFixed(1)},${py.toFixed(1)} `
        }
        return { name, label: this.result.display.get(name) ?? name, data, points, color: COLORS[i % COLORS.length] }
      })
    },
    summary() {
      const parts = this.lines.map((s) => `${s.label} von ${this.fmt(s.data[0])} bis ${this.fmt(s.data[s.data.length - 1])}`)
      return `Diagramm über ${this.xLabel}, ${this.result.steps} Schritte: ${parts.join('; ')}.`
    },
    liveText() {
      if (this.cursor === null) return ''
      return `${this.xLabel} ${this.fmt(this.xs[this.cursor], 6)}: ` + this.lines.map((s) => `${s.label} ${this.fmt(s.data[this.cursor], 6)}`).join(', ')
    },
    tipStyle() {
      const px = this.sx(this.xs[this.cursor])
      return px > this.w / 2 ? { right: `${this.w - px + 14}px` } : { left: `${px + 14}px` }
    },
  },
  mounted() {
    this.ro = new ResizeObserver(([e]) => {
      this.w = Math.max(300, Math.round(e.contentRect.width))
      this.h = this.w < 520 ? 300 : 380
    })
    this.ro.observe(this.$refs.box)
  },
  beforeUnmount() { this.ro?.disconnect() },
  methods: {
    domain(arrays) {
      let lo = Infinity
      let hi = -Infinity
      for (const a of arrays) for (const v of a) if (Number.isFinite(v)) { if (v < lo) lo = v; if (v > hi) hi = v }
      if (lo === Infinity) return [0, 1]
      if (lo === hi) return [lo - 1, hi + 1]
      return [lo, hi]
    },
    sx(v) { const [a, b] = this.xDomain; return this.m.l + ((v - a) / (b - a)) * this.pw },
    sy(v) { const [a, b] = this.yDomain; return this.m.t + this.ph - ((v - a) / (b - a)) * this.ph },
    dash(i) { return DASHES[i % DASHES.length] },
    fmt(v, d = 4) { return formatNumber(v, d) },
    onPointer(ev) {
      const rect = ev.currentTarget.getBoundingClientRect()
      const px = ((ev.clientX - rect.left) / rect.width) * this.w
      let best = 0
      let bestD = Infinity
      for (let k = 0; k < this.xs.length; k++) {
        const d = Math.abs(this.sx(this.xs[k]) - px)
        if (d < bestD) { bestD = d; best = k }
      }
      this.cursor = best
    },
    onFocus() { if (this.cursor === null) this.cursor = 0 },
    onKey(ev) {
      const n = this.xs.length
      if (!n) return
      const big = Math.max(1, Math.round(n / 20))
      const moves = { ArrowRight: 1, ArrowLeft: -1, PageDown: big, PageUp: -big }
      if (ev.key in moves) this.cursor = Math.min(n - 1, Math.max(0, (this.cursor ?? 0) + moves[ev.key]))
      else if (ev.key === 'Home') this.cursor = 0
      else if (ev.key === 'End') this.cursor = n - 1
      else return
      ev.preventDefault()
    },
  },
}
</script>
