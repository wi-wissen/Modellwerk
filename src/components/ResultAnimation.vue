<template>
  <section class="flex flex-col gap-3" :aria-label="$t('animation.title')">
    <!-- stage -->
    <div ref="box" class="relative w-full min-w-0">
      <svg ref="svg" :viewBox="`0 0 ${w} ${h}`" :width="w" :height="h"
           class="block w-full select-none rounded-lg border border-line"
           role="img" tabindex="0" :aria-label="summary" :aria-describedby="helpId"
           @keydown="onKey">
        <rect :width="w" :height="h" fill="var(--sheet)" />

        <!-- grid with axis values -->
        <g v-if="config.background === 'grid'">
          <g stroke="var(--grid)" stroke-width="1">
            <line v-for="t in frame.ticks.x" :key="'gx' + t.v" :x1="t.px" :x2="t.px" :y1="area.t" :y2="area.b" />
            <line v-for="t in frame.ticks.y" :key="'gy' + t.v" :x1="area.l" :x2="area.r" :y1="t.px" :y2="t.px" />
          </g>
          <g stroke="var(--muted)" stroke-width="1">
            <line v-for="t in frame.ticks.x.filter((t) => t.v === 0)" :key="'zx'" :x1="t.px" :x2="t.px" :y1="area.t" :y2="area.b" />
            <line v-for="t in frame.ticks.y.filter((t) => t.v === 0)" :key="'zy'" :x1="area.l" :x2="area.r" :y1="t.px" :y2="t.px" />
          </g>
          <g font-size="11" fill="var(--muted)" class="tabular">
            <text v-for="t in frame.ticks.y" :key="'ty' + t.v" :x="area.l - 6" :y="t.px + 4" text-anchor="end">{{ tickLabels.y(t.v) }}</text>
            <text v-for="t in frame.ticks.x" :key="'tx' + t.v" :x="t.px" :y="area.b + 15" text-anchor="middle">{{ tickLabels.x(t.v) }}</text>
          </g>
        </g>

        <!-- ground, with a height scale at the left -->
        <g v-if="config.background === 'ground'">
          <rect x="0" :y="frame.groundY" :width="w" :height="Math.max(0, h - frame.groundY)" fill="var(--sunken)" />
          <line x1="0" :x2="w" :y1="frame.groundY" :y2="frame.groundY" stroke="var(--muted)" stroke-width="2" />
          <g v-if="frame.ticks.y.length" font-size="11" fill="var(--muted)" class="tabular">
            <line :x1="plot.l - 2" :x2="plot.l - 2" :y1="frame.ticks.y[0].px" :y2="frame.ticks.y[frame.ticks.y.length - 1].px" stroke="var(--line)" />
            <g v-for="t in frame.ticks.y" :key="'gt' + t.v">
              <line :x1="plot.l - 6" :x2="plot.l - 2" :y1="t.px" :y2="t.px" stroke="var(--muted)" />
              <text :x="plot.l - 9" :y="t.px + 4" text-anchor="end">{{ tickLabels.y(t.v) }}</text>
            </g>
          </g>
        </g>

        <!-- traces -->
        <g fill="none" stroke-linejoin="round" stroke-linecap="round">
          <polyline v-for="t in traces" :key="'tr' + t.id" :points="t.points" :stroke="t.color" stroke-width="2"
                    :stroke-dasharray="t.dash" stroke-opacity="0.85" />
        </g>

        <!-- pendulum rods -->
        <g v-for="o in frame.objects.filter((o) => o.rod)" :key="'rod' + o.id">
          <line :x1="o.rod.x1 - 18" :x2="o.rod.x1 + 18" :y1="o.rod.y1" :y2="o.rod.y1" stroke="var(--muted)" stroke-width="3" stroke-linecap="round" />
          <line :x1="o.rod.x1" :y1="o.rod.y1" :x2="o.rod.x2" :y2="o.rod.y2" stroke="var(--ink)" stroke-width="1.5" />
          <circle :cx="o.rod.x1" :cy="o.rod.y1" r="3" fill="var(--ink)" />
        </g>

        <!-- sprites -->
        <g v-for="o in frame.objects.filter((o) => o.visible)" :key="'o' + o.id"
           :transform="`translate(${o.x} ${o.y}) rotate(${o.rotation})${o.mirror ? ' scale(-1 1)' : ''}`">
          <image :href="spriteSrc(o.sprite)" :data-sprite="o.sprite" :x="-o.size / 2" :y="-o.size / 2" :width="o.size" :height="o.size" />
        </g>

        <!-- labels -->
        <g font-size="12" font-weight="700" fill="var(--ink)" stroke="var(--sheet)" stroke-width="4" paint-order="stroke" stroke-linejoin="round" text-anchor="middle">
          <text v-for="o in frame.objects.filter((o) => o.visible && o.label)" :key="'l' + o.id"
                :x="o.x" :y="Math.max(12, o.y - o.size / 2 - 6)">{{ o.label }}</text>
        </g>

        <text v-if="!frame.objects.length" :x="w / 2" :y="h / 2" text-anchor="middle" font-size="14" fill="var(--muted)">{{ $t('animation.empty') }}</text>
      </svg>
    </div>

    <!-- readout -->
    <div class="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm tabular" aria-hidden="true">
      <span class="font-semibold">{{ $t('animation.stepOf', { n: frame.index, total: steps }) }}</span>
      <span v-for="r in readout" :key="r.name"><span class="font-mono text-muted">{{ r.label }}</span> = {{ fmt(r.value, 6) }}</span>
    </div>

    <!-- playback -->
    <div class="flex flex-col gap-3">
      <div class="flex flex-wrap items-center gap-2">
        <div class="flex items-center gap-1">
          <button type="button" class="btn btn-quiet" :aria-label="$t('animation.toStart')" :title="$t('animation.toStart')" @click="seek(0)">
            <SkipBack :size="18" aria-hidden="true" />
          </button>
          <button type="button" class="btn btn-quiet" :aria-label="$t('animation.stepBack')" :title="$t('animation.stepBack')" @click="stepBy(-1)">
            <StepBack :size="18" aria-hidden="true" />
          </button>
          <button type="button" class="btn btn-primary min-w-[7.5rem] justify-center" :aria-pressed="String(playing)" @click="toggle">
            <component :is="playing ? 'Pause' : 'Play'" :size="18" aria-hidden="true" />
            {{ playing ? $t('animation.pause') : $t('animation.play') }}
          </button>
          <button type="button" class="btn btn-quiet" :aria-label="$t('animation.stepForward')" :title="$t('animation.stepForward')" @click="stepBy(1)">
            <StepForward :size="18" aria-hidden="true" />
          </button>
        </div>
        <label class="flex min-w-[12rem] flex-1 items-center gap-2 text-sm">
          <span class="font-semibold">{{ $t('animation.step') }}</span>
          <input type="range" class="w-full accent-[var(--accent)]" min="0" :max="steps" step="1" :value="frame.index"
                 :aria-valuetext="$t('animation.stepOf', { n: frame.index, total: steps })" @input="seek(+$event.target.value)" />
        </label>
      </div>
      <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
        <label class="flex items-center gap-2 text-sm">
          <span class="font-semibold">{{ $t('animation.speed') }}</span>
          <select class="field !w-auto" :value="config.speed" @change="update((a) => { a.speed = +$event.target.value })">
            <option v-for="s in speeds" :key="s" :value="s">{{ fmt(s) }}×</option>
          </select>
        </label>
        <div class="flex flex-wrap items-center gap-2 text-sm" role="group" :aria-labelledby="uid + '-loop'">
          <span :id="uid + '-loop'" class="font-semibold">{{ $t('animation.loop') }}</span>
          <div class="seg">
            <button v-for="m in loopModes" :key="m" type="button" :class="{ 'is-selected': config.loop === m }"
                    :aria-pressed="String(config.loop === m)" @click="update((a) => { a.loop = m })">{{ $t('animation.loopModes.' + m) }}</button>
          </div>
        </div>
      </div>
      <p v-if="reducedMotion" class="text-sm text-muted">{{ $t('animation.reducedMotion') }}</p>
    </div>

    <ul v-if="problems.length" class="flex flex-col gap-1 rounded-lg border border-bad bg-bad-soft px-3 py-2 text-sm">
      <li v-for="(p, i) in problems" :key="i">{{ problemText(p) }}</li>
    </ul>

    <!-- settings -->
    <details class="panel" :open="settingsOpen" @toggle="settingsOpen = $event.target.open">
      <summary class="flex cursor-pointer items-center gap-2 rounded-[0.9rem] px-3 py-2 font-semibold">
        <Settings2 :size="18" aria-hidden="true" /> {{ $t('animation.settings') }}
      </summary>
      <div class="flex flex-col gap-4 border-t border-line p-3">
        <fieldset v-for="(o, oi) in config.objects" :key="o.id" class="flex flex-col gap-3 rounded-lg border border-line p-3">
          <legend class="px-1 font-semibold">{{ $t('animation.object', { n: oi + 1, name: spriteName(o.sprite) }) }}</legend>

          <div class="flex flex-col gap-1">
            <span :id="`${uid}-sprite-${o.id}`" class="text-sm font-semibold">{{ $t('animation.sprite') }}</span>
            <div class="grid gap-1 [grid-template-columns:repeat(auto-fill,minmax(2.75rem,1fr))]" role="group" :aria-labelledby="`${uid}-sprite-${o.id}`">
              <button v-for="s in sprites" :key="s.id" type="button"
                      class="grid h-11 place-items-center rounded-lg border hover:border-accent"
                      :class="o.sprite === s.id ? 'is-selected' : 'border-line bg-sheet'" :aria-pressed="String(o.sprite === s.id)"
                      :aria-label="spriteName(s.id)" :title="spriteName(s.id)" @click="setSprite(oi, s)">
                <img :src="s.src" alt="" width="28" height="28" draggable="false" />
              </button>
            </div>
          </div>

          <div class="grid gap-3 sm:grid-cols-3">
            <label v-for="f in ['x', 'y', 'angle']" :key="f" class="flex flex-col gap-1 text-sm">
              <span class="font-semibold">{{ $t('animation.fields.' + f) }}</span>
              <select class="field" :value="selectValue(o[f])" @change="setField(oi, f, $event.target.value)">
                <option value="">{{ $t('animation.none') }}</option>
                <option v-if="typeof o[f] === 'number'" :value="'#' + o[f]">{{ $t('animation.fixed', { value: fmt(o[f]) }) }}</option>
                <option v-for="n in variableOptions" :key="n.name" :value="n.name">{{ n.label }}</option>
              </select>
            </label>
          </div>

          <div class="flex flex-wrap items-end gap-3">
            <label v-if="o.angle" class="flex flex-col gap-1 text-sm">
              <span class="font-semibold">{{ $t('animation.angleUnit') }}</span>
              <select class="field !w-auto" :value="o.angleUnit" @change="update((a) => { a.objects[oi].angleUnit = $event.target.value })">
                <option value="deg">{{ $t('animation.units.deg') }}</option>
                <option value="rad">{{ $t('animation.units.rad') }}</option>
              </select>
            </label>
            <label v-if="!(o.radius > 0)" class="flex flex-col gap-1 text-sm">
              <span class="font-semibold">{{ $t('animation.size') }}</span>
              <input type="number" class="field !w-24" min="8" max="160" step="4" :value="o.size"
                     @change="setSize(oi, $event.target.value)" />
            </label>
            <div v-else class="flex flex-col gap-1 text-sm">
              <span>{{ $t('animation.toScale', { r: fmt(o.radius) }) }}</span>
              <button type="button" class="btn-link text-sm" @click="update((a) => { a.objects[oi].radius = null })">{{ $t('animation.usePixelSize') }}</button>
            </div>
            <label class="flex min-w-[10rem] flex-1 flex-col gap-1 text-sm">
              <span class="font-semibold">{{ $t('animation.label') }}</span>
              <input type="text" class="field" :value="o.label" @change="update((a) => { a.objects[oi].label = $event.target.value })" />
            </label>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <label class="toggle">
              <input type="checkbox" :checked="o.trace" @change="update((a) => { a.objects[oi].trace = $event.target.checked })" />
              {{ $t('animation.trace') }}
            </label>
            <label v-if="o.angle && o.x == null && o.y == null" class="toggle">
              <input type="checkbox" :checked="o.arm > 0" @change="update((a) => { a.objects[oi].arm = $event.target.checked ? 0.8 : 0 })" />
              {{ $t('animation.pendulum') }}
            </label>
            <label v-if="o.y" class="toggle">
              <input type="checkbox" :checked="o.anchor === 'bottom'" @change="update((a) => { a.objects[oi].anchor = $event.target.checked ? 'bottom' : 'center' })" />
              {{ $t('animation.standsOnValue') }}
            </label>
            <button type="button" class="btn btn-quiet ml-auto text-bad" @click="removeObject(oi)">
              <Trash2 :size="16" aria-hidden="true" /> {{ $t('animation.remove') }}
              <span class="sr-only">{{ $t('animation.object', { n: oi + 1, name: spriteName(o.sprite) }) }}</span>
            </button>
          </div>
        </fieldset>

        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn" @click="addObject"><Plus :size="16" aria-hidden="true" /> {{ $t('animation.add') }}</button>
          <button type="button" class="btn btn-quiet" @click="reset"><RotateCcw :size="16" aria-hidden="true" /> {{ $t('animation.reset') }}</button>
        </div>

        <div class="flex flex-col gap-3 border-t border-line pt-3">
          <div class="flex flex-wrap items-center gap-2">
            <label class="toggle">
              <input type="checkbox" :checked="config.equalScale" @change="update((a) => { a.equalScale = $event.target.checked })" />
              {{ $t('animation.equalScale') }}
            </label>
            <label class="toggle">
              <input type="checkbox" :checked="config.flipY" @change="update((a) => { a.flipY = $event.target.checked })" />
              {{ $t('animation.flipY') }}
            </label>
          </div>
          <div class="flex flex-wrap items-center gap-2 text-sm" role="group" :aria-labelledby="uid + '-bg'">
            <span :id="uid + '-bg'" class="font-semibold">{{ $t('animation.background') }}</span>
            <div class="seg">
              <button v-for="b in backgrounds" :key="b" type="button" :class="{ 'is-selected': config.background === b }"
                      :aria-pressed="String(config.background === b)" @click="update((a) => { a.background = b })">{{ $t('animation.backgrounds.' + b) }}</button>
            </div>
          </div>
        </div>
      </div>
    </details>

    <p class="sr-only" aria-live="polite">{{ liveText }}</p>
    <p :id="helpId" class="text-sm text-muted">{{ $t('animation.help') }}</p>
  </section>
</template>

<script>
import { Pause, Play, Plus, RotateCcw, Settings2, SkipBack, StepBack, StepForward, Trash2 } from 'lucide-vue-next'
import { SPRITES, findSprite } from '../assets/sprites/index.js'
import { formatNumber } from '../engine/model.js'
import { numberLocale } from '../i18n/index.js'
import { seriesColor, seriesDash } from '../chartStyle.js'
import {
  BACKGROUNDS, LOOP_MODES, SPEEDS, advance, cloneAnimation, computeLayout, defaultAnimation, findTimeName,
  frameAt, makeObject, normalizeAnimation, stepsPerSecond, suggestSprite, tracePoints, usedVariables, validateAnimation,
} from '../engine/animation.js'

const LIVE_INTERVAL = 2000 // ms between announcements while playing

export default {
  name: 'ResultAnimation',
  components: { Pause, Play, Plus, RotateCcw, Settings2, SkipBack, StepBack, StepForward, Trash2 },
  props: {
    result: { type: Object, required: true },
    // animation configuration (see src/engine/animation.js); null = preset from the result
    modelValue: { type: Object, default: null },
    // Map NAME → 'state' | 'rate' | 'constant' | 'time'
    roles: { type: Map, default: null },
    // model title or id: helps to pick sprites for the preset
    context: { type: String, default: '' },
    autoplay: { type: Boolean, default: true },
  },
  emits: ['update:modelValue'],
  data() {
    return {
      w: 640, index: 0, pos: 0, dir: 1, playing: false, onScreen: true, pageVisible: true,
      reducedMotion: false, settingsOpen: false, liveText: '', lastLive: 0,
      raf: 0, lastTs: 0, ro: null, io: null, motionQuery: null, liveTimer: 0, dataUris: {},
      speeds: SPEEDS, loopModes: LOOP_MODES, backgrounds: BACKGROUNDS, sprites: SPRITES,
    }
  },
  computed: {
    uid() { return `anim-${this.$.uid}` },
    helpId() { return `${this.uid}-help` },
    steps() { return Math.max(0, this.result.steps ?? 0) },
    names() { return this.result.names ?? Object.keys(this.result.series) },
    preset() { return defaultAnimation(this.result, this.roles, { context: this.context }) },
    config() { return normalizeAnimation(this.modelValue ?? this.preset) },
    h() {
      const both = this.config.equalScale && this.config.objects.some((o) => o.x != null) && this.config.objects.some((o) => o.y != null)
      if (both) return Math.round(Math.min(480, Math.max(280, this.w * 0.75)))
      return this.w < 520 ? 300 : 380
    },
    layout() { return computeLayout(this.result, this.config, { width: this.w, height: this.h }) },
    plot() { return this.layout.plot },
    area() { return this.layout.area },
    frame() { return frameAt(this.result, this.config, this.index, this.layout) },
    traces() {
      return this.config.objects.map((o, i) => ({ o, i })).filter(({ o }) => o.trace).map(({ o, i }, k) => ({
        id: o.id, points: tracePoints(this.result, this.layout, i, this.frame.index), color: seriesColor(k), dash: seriesDash(k),
      }))
    },
    // one format per axis: plain integers (years!), or a shared power of ten for large/small values
    tickLabels() {
      const make = (ticks) => {
        const max = Math.max(0, ...ticks.map((t) => Math.abs(t.v)))
        if (max >= 1e5 || (max > 0 && max < 1e-3)) {
          const e = Math.floor(Math.log10(max))
          const sup = String(e).replace(/-/g, '⁻').replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d])
          return (v) => (v === 0 ? '0' : `${this.fmt(v / 10 ** e, 3).replace('-', '−')}·10${sup}`)
        }
        if (ticks.every((t) => Number.isInteger(t.v)) && max < 1e5) return (v) => String(v).replace('-', '−')
        return (v) => this.fmt(v).replace('-', '−')
      }
      return { x: make(this.frame.ticks.x), y: make(this.frame.ticks.y) }
    },
    timeName() { return findTimeName(this.result, this.roles) },
    readout() {
      const list = [this.timeName, ...usedVariables(this.config).filter((n) => n !== this.timeName)].filter((n) => n && this.result.series[n])
      return list.map((name) => ({ name, label: this.label(name), value: this.result.series[name][this.frame.index] }))
    },
    variableOptions() {
      const order = { state: 0, time: 1, rate: 2, constant: 3 }
      const list = this.names.filter((n) => this.result.series[n])
      if (this.roles) list.sort((a, b) => (order[this.roles.get(a)] ?? 2) - (order[this.roles.get(b)] ?? 2))
      return list.map((name) => ({ name, label: this.label(name) }))
    },
    problems() { return validateAnimation(this.result, this.config, { sprites: SPRITES.map((s) => s.id) }) },
    summary() {
      const objects = this.config.objects.map((o) => {
        const vars = ['x', 'y', 'angle'].filter((f) => typeof o[f] === 'string').map((f) => this.label(o[f]))
        return vars.length ? this.$t('animation.summaryObject', { name: this.spriteName(o.sprite), vars: vars.join(', ') }) : this.spriteName(o.sprite)
      })
      return this.$t('animation.summary', { steps: this.steps, objects: objects.join('; ') || this.$t('animation.empty') })
    },
    running() { return this.playing && this.onScreen && this.pageVisible },
    usedSprites() { return [...new Set(this.config.objects.map((o) => o.sprite))] },
  },
  watch: {
    running(on) { if (on) this.startLoop(); else this.stopLoop() },
    result() {
      this.index = Math.min(this.index, this.steps)
      this.pos = this.index
    },
    'frame.index'() { this.scheduleLive() },
    playing(on) { if (!on) this.announce() },
    usedSprites: { handler() { this.preloadSprites() }, immediate: false },
  },
  mounted() {
    this.ro = new ResizeObserver(([e]) => { this.w = Math.max(280, Math.round(e.contentRect.width)) })
    this.ro.observe(this.$refs.box)
    if ('IntersectionObserver' in window) {
      this.io = new IntersectionObserver(([e]) => { this.onScreen = e.isIntersecting })
      this.io.observe(this.$refs.box)
    }
    this.onVisibility = () => { this.pageVisible = document.visibilityState !== 'hidden' }
    document.addEventListener('visibilitychange', this.onVisibility)
    this.onVisibility()
    this.motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)') ?? null
    this.reducedMotion = !!this.motionQuery?.matches
    this.onMotion = (e) => { this.reducedMotion = e.matches; if (e.matches) this.playing = false }
    this.motionQuery?.addEventListener?.('change', this.onMotion)
    this.preloadSprites()
    if (this.autoplay && !this.reducedMotion && this.steps > 0) this.playing = true
  },
  beforeUnmount() {
    this.playing = false
    this.stopLoop()
    clearTimeout(this.liveTimer)
    this.ro?.disconnect()
    this.io?.disconnect()
    document.removeEventListener('visibilitychange', this.onVisibility)
    this.motionQuery?.removeEventListener?.('change', this.onMotion)
  },
  methods: {
    fmt(v, d = 4) { return formatNumber(v, d, numberLocale()) },
    label(name) { return this.result.display?.get?.(name) ?? name },
    locale() { return this.$i18n?.locale ?? 'de' },
    spriteName(id) { const s = findSprite(id); return s.name[this.locale()] ?? s.name.en },
    spriteSrc(id) { return this.dataUris[id] ?? findSprite(id).src },

    // ---- configuration (always emits a copy) ----
    update(change) {
      const copy = cloneAnimation(this.config)
      change(copy)
      this.$emit('update:modelValue', copy)
    },
    selectValue(v) { return v == null ? '' : typeof v === 'number' ? '#' + v : v },
    setField(oi, field, value) {
      this.update((a) => {
        const o = a.objects[oi]
        o[field] = value === '' ? null : value.startsWith('#') ? Number(value.slice(1)) : value
        if (field === 'angle' && o[field]) o.angleUnit = /GRAD|DEG/i.test(o[field]) ? 'deg' : o.angleUnit
      })
    },
    setSprite(oi, sprite) {
      this.update((a) => {
        const o = a.objects[oi]
        if (o.size === findSprite(o.sprite).size) o.size = sprite.size
        o.sprite = sprite.id
      })
    },
    setSize(oi, value) {
      const v = Math.round(Number(value))
      if (Number.isFinite(v)) this.update((a) => { a.objects[oi].size = Math.min(160, Math.max(8, v)) })
    },
    addObject() {
      this.update((a) => {
        const y = this.names.find((n) => n !== this.timeName && this.roles?.get(n) !== 'constant' && this.result.series[n]?.some((v) => v !== this.result.series[n][0])) ?? null
        const sprite = findSprite(suggestSprite(y ?? '', this.context, 'ball'))
        a.objects.push(makeObject({ sprite: sprite.id, size: sprite.size, x: y ? this.timeName : null, y, trace: !!y }, a.objects))
      })
    },
    removeObject(oi) { this.update((a) => { a.objects.splice(oi, 1) }) },
    reset() { this.$emit('update:modelValue', cloneAnimation(this.preset)) },
    problemText(p) {
      return this.$t(`animation.problems.${p.code}`, { name: p.name ? this.label(p.name) : '', field: p.field ? this.$t('animation.fields.' + p.field) : '' })
    },

    // ---- playback ----
    toggle() {
      if (this.playing) { this.playing = false; return }
      if (this.config.loop === 'once' && this.index >= this.steps) this.seek(0)
      this.dir = this.dir || 1
      this.playing = this.steps > 0
    },
    seek(i) {
      this.index = Math.min(this.steps, Math.max(0, Math.round(i)))
      this.pos = this.index
    },
    stepBy(d) { this.playing = false; this.seek(this.index + d) },
    startLoop() {
      if (this.raf) return
      this.lastTs = 0
      const tick = (ts) => {
        if (!this.running) { this.raf = 0; return }
        if (this.lastTs) {
          const dt = Math.min(0.1, (ts - this.lastTs) / 1000)
          const next = advance(this.pos, this.dir, dt * stepsPerSecond(this.result, this.config.speed), this.steps, this.config.loop)
          this.pos = next.pos
          this.dir = next.dir
          this.index = Math.min(this.steps, Math.round(next.pos))
          if (next.done) { this.playing = false; this.dir = 1; this.raf = 0; return }
        }
        this.lastTs = ts
        this.raf = requestAnimationFrame(tick)
      }
      this.raf = requestAnimationFrame(tick)
    },
    stopLoop() {
      if (this.raf) cancelAnimationFrame(this.raf)
      this.raf = 0
    },
    onKey(ev) {
      if (ev.key === ' ' || ev.key === 'Spacebar') this.toggle()
      else if (ev.key === 'ArrowRight') this.stepBy(ev.shiftKey ? 10 : 1)
      else if (ev.key === 'ArrowLeft') this.stepBy(ev.shiftKey ? -10 : -1)
      else if (ev.key === 'PageDown') this.stepBy(Math.max(1, Math.round(this.steps / 20)))
      else if (ev.key === 'PageUp') this.stepBy(-Math.max(1, Math.round(this.steps / 20)))
      else if (ev.key === 'Home') this.stepBy(-this.steps)
      else if (ev.key === 'End') this.stepBy(this.steps)
      else return
      ev.preventDefault()
    },

    // ---- announcements (throttled while playing) ----
    liveMessage() {
      const values = this.readout.map((r) => `${r.label} ${this.fmt(r.value, 6)}`).join(', ')
      return this.$t('animation.live', { n: this.frame.index, total: this.steps, values })
    },
    announce() {
      clearTimeout(this.liveTimer)
      this.liveTimer = 0
      this.lastLive = Date.now()
      this.liveText = this.liveMessage()
    },
    scheduleLive() {
      if (this.liveTimer) return
      const wait = this.playing ? Math.max(0, LIVE_INTERVAL - (Date.now() - this.lastLive)) : 250
      this.liveTimer = setTimeout(() => { this.liveTimer = 0; this.announce() }, wait)
    },

    // ---- export ----
    async preloadSprites() {
      for (const id of this.usedSprites) {
        if (this.dataUris[id]) continue
        const src = findSprite(id).src
        if (src.startsWith('data:')) { this.dataUris = { ...this.dataUris, [id]: src }; continue }
        try {
          const text = await (await fetch(src)).text()
          this.dataUris = { ...this.dataUris, [id]: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(text) }
        } catch {
          // offline or blocked: the export then references the file
        }
      }
    },
    /** Standalone SVG of the current frame: theme colours resolved, sprites embedded as data URIs. */
    toSvgString() {
      const clone = this.$refs.svg.cloneNode(true)
      const css = getComputedStyle(document.documentElement)
      const resolve = (v) => v.replace(/var\((--[\w-]+)\)/g, (_, name) => css.getPropertyValue(name).trim() || '#000')
      for (const el of [clone, ...clone.querySelectorAll('*')]) {
        for (const attr of [...el.attributes]) if (attr.value.includes('var(')) el.setAttribute(attr.name, resolve(attr.value))
      }
      for (const img of clone.querySelectorAll('image[data-sprite]')) {
        const id = img.getAttribute('data-sprite')
        img.setAttribute('href', this.dataUris[id] ?? findSprite(id).src)
        img.removeAttribute('data-sprite')
      }
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
      clone.setAttribute('font-family', 'Atkinson Hyperlegible Next, Arial, sans-serif')
      for (const a of ['class', 'tabindex', 'aria-describedby']) clone.removeAttribute(a)
      return new XMLSerializer().serializeToString(clone)
    },
    /** Like toSvgString, but waits until every sprite is available as a data URI. */
    async toSvgStringAsync() {
      await this.preloadSprites()
      return this.toSvgString()
    },
  },
}
</script>
