<template>
  <section class="panel flex min-w-0 flex-col gap-4 p-4 sm:p-5 xl:sticky xl:top-4" aria-labelledby="result-heading">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 id="result-heading" class="flex items-center gap-2 text-xl font-bold"><span class="step">3</span> {{ $t('app.result') }}</h2>
      <div role="tablist" class="seg" :aria-label="$t('app.resultViews')" @keydown="tabKeys">
        <button v-for="t in tabs" :id="`tab-${t.id}`" :key="t.id" type="button" role="tab"
                :aria-selected="view.resultTab === t.id" :aria-controls="`panel-${t.id}`" :tabindex="view.resultTab === t.id ? 0 : -1"
                @click="set({ resultTab: t.id })">
          <component :is="t.icon" :size="18" aria-hidden="true" /> {{ $t(`app.tabs.${t.id}`) }}
        </button>
      </div>
    </div>

    <div v-if="run.error" class="flex items-start gap-3 rounded-xl border border-bad bg-bad-soft p-4" role="alert">
      <TriangleAlert :size="22" aria-hidden="true" class="mt-0.5 flex-none text-bad" />
      <div>
        <p class="font-bold">{{ $t('app.cannotCompute') }}</p>
        <p>{{ run.error.line ? `${$t('app.lineN', { n: run.error.line })}: ` : '' }}{{ $errorText(run.error) }}</p>
        <button type="button" class="btn mt-2" @click="$emit('goto-program', run.error.line)"><Code :size="16" aria-hidden="true" /> {{ $t('app.toProgram') }}</button>
      </div>
    </div>

    <template v-else>
      <fieldset v-if="tab !== 'animation'" class="flex flex-col gap-3">
        <legend class="sr-only">{{ $t('app.axes') }}</legend>
        <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
          <label class="inline-flex items-center gap-2">
            <span class="font-semibold">{{ $t(tab === 'table' ? 'app.sortBy' : 'app.xAxis') }}</span>
            <select id="plot-x" class="field !w-auto font-mono" :value="view.plotX" @change="set({ plotX: $event.target.value })">
              <option v-for="v in variables" :key="v.name" :value="v.name">{{ v.label }}</option>
            </select>
          </label>
          <template v-if="tab === 'chart3d'">
            <label class="inline-flex items-center gap-2">
              <span class="font-semibold">{{ $t('app.yAxis') }}</span>
              <select id="plot-y3" class="field !w-auto font-mono" :value="y3" @change="set({ plotY3: $event.target.value })">
                <option v-for="v in variables" :key="v.name" :value="v.name">{{ v.label }}</option>
              </select>
            </label>
            <label class="inline-flex items-center gap-2">
              <span class="font-semibold">{{ $t('app.zAxis') }}</span>
              <select id="plot-z" class="field !w-auto font-mono" :value="z3" @change="set({ plotZ: $event.target.value })">
                <option v-for="v in variables" :key="v.name" :value="v.name">{{ v.label }}</option>
              </select>
            </label>
          </template>
          <span v-if="tab === 'chart' && view.plotX !== timeVar" class="chip role-constant">{{ $t('app.phase') }}</span>
          <button v-if="tab === 'chart'" type="button" class="btn btn-quiet ml-auto" :aria-expanded="axesOpen" aria-controls="axes-panel" @click="axesOpen = !axesOpen">
            <Ruler :size="18" aria-hidden="true" /> {{ $t('app.axesSettings') }}
          </button>
        </div>

        <div v-if="tab === 'chart' && axesOpen" id="axes-panel" class="flex flex-col gap-3 rounded-xl bg-sunken p-3">
          <div class="flex flex-wrap items-end gap-3">
            <label class="inline-flex items-center gap-2 self-center">
              <input id="axes-auto" type="checkbox" class="size-5" :checked="view.axes.auto" @change="setAxes({ auto: $event.target.checked })" />
              <span class="font-semibold">{{ $t('app.autoScale') }}</span>
            </label>
            <label v-for="k in ['xMin', 'xMax', 'yMin', 'yMax']" :key="k" class="flex w-28 flex-col gap-1 text-sm">
              <span class="font-semibold">{{ $t(`app.${k}`) }}</span>
              <input :id="`axes-${k}`" class="field tabular font-mono" inputmode="decimal" :disabled="view.axes.auto" autocomplete="off"
                     :value="view.axes[k] ?? ''" :placeholder="$t('app.auto')" @input="setAxes({ [k]: parseLimit($event.target.value) })" />
            </label>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <span class="font-semibold">{{ $t('app.curveMode') }}</span>
            <div class="seg" role="group" :aria-label="$t('app.curveMode')">
              <button v-for="m in ['line', 'points', 'both']" :key="m" type="button" :aria-pressed="view.curveMode === m"
                      :class="{ 'is-selected': view.curveMode === m }" @click="set({ curveMode: m })">{{ $t(`app.curveModes.${m}`) }}</button>
            </div>
          </div>
          <details v-if="shownY.length" class="rounded-lg border border-line bg-sheet" :open="hasStyles || null">
            <summary class="cursor-pointer px-3 py-2 font-semibold">{{ $t('app.curveStyles') }}</summary>
            <div class="flex flex-col gap-3 border-t border-line p-3">
              <p class="max-w-[62ch] text-sm text-muted">{{ $t('app.curveStylesHint') }}</p>
              <div v-for="name in shownY" :key="name" class="flex flex-wrap items-end gap-2 border-b border-line pb-3 last:border-0 last:pb-0">
                <span class="min-w-24 self-center truncate font-mono font-semibold">{{ labelOf(name) }}</span>
                <label class="flex flex-col gap-1 text-sm">
                  <span class="font-semibold">{{ $t('app.color') }}</span>
                  <input :id="`style-color-${name}`" type="color" class="h-10 w-14 cursor-pointer rounded-lg border border-line bg-sheet p-1"
                         :value="shownHex(styleOf(name).color) ?? '#000000'" @input="setStyle(name, { color: $event.target.value })" />
                </label>
                <label class="flex flex-col gap-1 text-sm">
                  <span class="font-semibold">{{ $t('app.curveLook') }}</span>
                  <select :id="`style-mode-${name}`" class="field !w-auto" :value="styleOf(name).mode" @change="setStyle(name, { mode: $event.target.value })">
                    <option v-for="m in curveModes" :key="m" :value="m">{{ $t(`app.curveModes.${m}`) }}</option>
                  </select>
                </label>
                <label class="flex flex-col gap-1 text-sm">
                  <span class="font-semibold">{{ $t('app.lineStyle') }}</span>
                  <select :id="`style-dash-${name}`" class="field !w-auto" :value="styleOf(name).dash" @change="setStyle(name, { dash: Number($event.target.value) })">
                    <option v-for="(_, d) in 6" :key="d" :value="d">{{ $t(`app.lineStyles.${d}`) }}</option>
                  </select>
                </label>
                <label class="flex flex-col gap-1 text-sm">
                  <span class="font-semibold">{{ $t('app.lineWidth') }}</span>
                  <select :id="`style-width-${name}`" class="field !w-auto tabular" :value="styleOf(name).width" @change="setStyle(name, { width: Number($event.target.value) })">
                    <option v-for="wd in 5" :key="wd" :value="wd">{{ wd }}</option>
                  </select>
                </label>
                <label class="flex flex-col gap-1 text-sm">
                  <span class="font-semibold">{{ $t('app.marker') }}</span>
                  <select :id="`style-marker-${name}`" class="field !w-auto" :value="styleOf(name).marker" @change="setStyle(name, { marker: $event.target.value })">
                    <option v-for="mk in markers" :key="mk" :value="mk">{{ $t(`app.markers.${mk}`) }}</option>
                  </select>
                </label>
                <button v-if="activeStyles[name]" type="button" class="btn btn-quiet" @click="resetStyle(name)">
                  <RotateCcw :size="16" aria-hidden="true" /> {{ $t('app.styleAuto') }}
                </button>
              </div>
            </div>
          </details>
        </div>

        <div v-if="tab !== 'chart3d'" class="flex flex-wrap items-center gap-2">
          <span class="font-semibold">{{ $t(tab === 'chart' ? 'app.curves' : 'app.columns') }}:</span>
          <label v-for="v in variables" :key="v.name" class="toggle">
            <input :id="`plot-y-${v.name}`" type="checkbox" :value="v.name" :checked="view.plotY.includes(v.name)" @change="toggleY(v.name, $event.target.checked)" />
            <svg class="spark" viewBox="0 0 40 16" aria-hidden="true">
              <polyline :points="sparkline(v.name)" fill="none" stroke-linecap="round" stroke-linejoin="round"
                        :stroke="view.plotY.includes(v.name) ? lookOf(v.name).color : 'var(--muted)'"
                        :stroke-width="view.plotY.includes(v.name) ? 2.4 : 1.4"
                        :stroke-dasharray="view.plotY.includes(v.name) && !overlayOn ? (lookOf(v.name).dash || null) : null"
                        :opacity="view.plotY.includes(v.name) ? 1 : 0.7" />
            </svg>
            <span class="font-mono font-semibold">{{ v.label }}</span>
          </label>
        </div>

        <div v-if="tab === 'chart' && simNames.length > 1" class="flex flex-wrap items-center gap-3">
          <label class="inline-flex items-center gap-2">
            <input id="overlay" type="checkbox" class="size-5" :checked="view.overlay" @change="set({ overlay: $event.target.checked })" />
            <span class="font-semibold">{{ $t('sim.overlay') }}</span>
          </label>
          <ul v-if="overlayOn" class="flex flex-wrap gap-3 text-sm" :aria-label="$t('sim.legend')">
            <li v-for="(name, i) in simNames" :key="i" class="flex items-center gap-1.5">
              <svg width="26" height="8" aria-hidden="true"><line x1="1" y1="4" x2="25" y2="4" v-bind="simLegend(i)" /></svg>
              <span :class="{ 'font-bold': i === active }">{{ name }}</span>
            </li>
          </ul>
        </div>
      </fieldset>

      <div :id="`panel-${tab}`" role="tabpanel" :aria-labelledby="`tab-${tab}`">
        <ResultChart v-if="tab === 'chart'" ref="chart" :result="run.result" :x="view.plotX" :ys="view.plotY" :range="view.axes"
                     :overlays="overlays" :mode="view.curveMode" :styles="activeStyles"
                     :labels="view.labels ?? []" :placing="placingId !== null" @place="placeLabel" />
        <ResultChart3D v-else-if="tab === 'chart3d'" ref="chart3d" :result="run.result" :x="view.plotX" :y="y3" :z="z3" />
        <ResultTable v-else-if="tab === 'table'" :result="run.result" :columns="[view.plotX, ...view.plotY.filter((y) => y !== view.plotX)]" />
        <slot v-else name="animation" :result="run.result" />
      </div>
      <ChartLabels v-if="tab === 'chart'" :labels="view.labels ?? []" :center="labelCenter" :placing-id="placingId"
                   @update:labels="set({ labels: $event })" @update:placing="placingId = $event" @announce="$emit('announce', $event)" />

      <div class="flex flex-wrap items-center justify-between gap-3">
        <p class="text-sm text-muted tabular">{{ $t('app.stats', { steps, vars: variables.length, ms: run.ms }) }}</p>
        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn" :disabled="steps >= maxSteps" @click="$emit('continue')">
            <FastForward :size="18" aria-hidden="true" /> {{ $t('app.continue', { n: continueBy }) }}
          </button>
          <template v-if="tab === 'chart' || tab === 'chart3d' || tab === 'animation'">
            <button type="button" class="btn" @click="saveImage('png')"><ImageDown :size="18" aria-hidden="true" /> PNG</button>
            <button type="button" class="btn" @click="saveImage('svg')"><ImageDown :size="18" aria-hidden="true" /> SVG</button>
          </template>
          <button type="button" class="btn" @click="copyTable"><ClipboardCopy :size="18" aria-hidden="true" /> {{ $t('app.copyTable') }}</button>
          <button type="button" class="btn" @click="saveCsv"><Download :size="18" aria-hidden="true" /> {{ $t('app.saveCsv') }}</button>
          <button type="button" class="btn" @click="$emit('report')"><Printer :size="18" aria-hidden="true" /> {{ $t('report.button') }}</button>
        </div>
      </div>
    </template>
  </section>
</template>

<script>
import { Box, ChartLine, Clapperboard, ClipboardCopy, Code, Download, FastForward, ImageDown, Printer, RotateCcw, Ruler, Table, TriangleAlert } from 'lucide-vue-next'
import ResultChart from './ResultChart.vue'
import ChartLabels from './ChartLabels.vue'
import ResultChart3D from './ResultChart3D.vue'
import ResultTable from './ResultTable.vue'
import { parseNumber } from '../engine/model.js'
import { tableRows, toCsv, toTsv } from '../engine/export.js'
import { CURVE_MODES, MARKERS, curveStyle, seriesColor, seriesDash, shownHex, sparkPoints } from '../chartStyle.js'

// light-theme values of the automatic curve colours, as start values of the colour picker
const AUTO_HEX = ['#1d4fd8', '#d55e00', '#009e73', '#cc79a7', '#8a6d00', '#555f69']
import { i18n } from '../i18n/index.js'
import { download, downloadSvg } from '../site/download.js'

export default {
  name: 'ResultPanel',
  components: { Box, ChartLine, Clapperboard, ClipboardCopy, Code, Download, FastForward, ImageDown, Printer, RotateCcw, Ruler, Table, TriangleAlert, ResultChart, ResultChart3D, ResultTable, ChartLabels },
  props: {
    runs: { type: Array, required: true }, // [{ result, error, ms }] per simulation
    active: { type: Number, required: true },
    simNames: { type: Array, required: true },
    variables: { type: Array, required: true }, // [{ name, label, role }] of the active simulation
    timeVar: { type: String, default: '' },
    view: { type: Object, required: true },
    steps: { type: Number, required: true },
    maxSteps: { type: Number, required: true },
    continueBy: { type: Number, required: true },
    fileName: { type: String, required: true },
    hasAnimation: { type: Boolean, default: false },
    // curve styles per simulation (index = simulation)
    simStyles: { type: Array, default: () => [] },
    // returns the SVG of the current animation frame (animation tab only)
    animationSvg: { type: Function, default: null },
  },
  emits: ['update:view', 'continue', 'goto-program', 'report', 'announce'],
  data() {
    return { axesOpen: false, curveModes: CURVE_MODES, markers: MARKERS, placingId: null }
  },
  computed: {
    // styles of the active simulation (from a PRG file), overridden by the view's
    activeStyles() { return { ...(this.simStyles[this.active] ?? {}), ...(this.view.curveStyles ?? {}) } },
    shownY() { return this.view.plotY.filter((y) => y !== this.view.plotX) },
    // middle of the plotted data, where a new label starts
    labelCenter() {
      const r = this.run.result
      const span = (names) => {
        let lo = Infinity
        let hi = -Infinity
        for (const n of names) for (const v of r?.series[n] ?? []) if (Number.isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v) }
        return lo === Infinity ? 0 : Number(((lo + hi) / 2).toPrecision(3))
      }
      return { x: span([this.view.plotX]), y: span(this.shownY) }
    },
    hasStyles() { return Object.values(this.activeStyles).some(Boolean) },
    run() { return this.runs[this.active] },
    tabs() {
      return [
        { id: 'chart', icon: 'ChartLine' },
        ...(this.variables.length >= 3 ? [{ id: 'chart3d', icon: 'Box' }] : []),
        { id: 'table', icon: 'Table' },
        ...(this.hasAnimation ? [{ id: 'animation', icon: 'Clapperboard' }] : []),
      ]
    },
    tab() {
      return this.tabs.some((t) => t.id === this.view.resultTab) ? this.view.resultTab : 'chart'
    },
    names() { return this.variables.map((v) => v.name) },
    // variables that change during the run (constants make poor 3D axes)
    changing() { return this.variables.filter((v) => v.role !== 'constant').map((v) => v.name) },
    y3() {
      if (this.names.includes(this.view.plotY3)) return this.view.plotY3
      return [...this.view.plotY, ...this.changing].find((n) => n !== this.view.plotX) ?? this.names[0]
    },
    z3() {
      if (this.names.includes(this.view.plotZ)) return this.view.plotZ
      return [...this.view.plotY, ...this.changing].find((n) => n !== this.view.plotX && n !== this.y3) ?? this.names[0]
    },
    overlayOn() { return this.view.overlay && this.simNames.length > 1 },
    // the selected curves of all other simulations that have the same variables
    overlays() {
      if (!this.overlayOn) return []
      const out = []
      this.runs.forEach((r, i) => {
        if (i === this.active || !r.result) return
        const xs = r.result.series[this.view.plotX]
        if (!xs) return
        this.view.plotY.forEach((y, k) => {
          const data = r.result.series[y]
          if (data) out.push({ key: `${i}-${y}`, label: `${r.result.display.get(y) ?? y} · ${this.simNames[i]}`, xs, data, colorIndex: k, dashIndex: i, style: this.view.curveStyles?.[y] ? null : this.simStyles[i]?.[y] ?? null })
        })
      })
      return out
    },
  },
  methods: {
    shownHex,
    labelOf(name) { return this.variables.find((v) => v.name === name)?.label ?? name },
    // the curves in the graph, in the order that decides their automatic colour
    // same numbering as the graph, which colours the curves in the order of plotY
    lookOf(name) { return curveStyle(this.view.plotY.indexOf(name), this.activeStyles[name], this.view.curveMode) },
    styleOf(name) {
      const i = this.view.plotY.indexOf(name)
      return this.activeStyles[name] ?? { mode: this.view.curveMode, dash: 0, width: 1, color: AUTO_HEX[i % AUTO_HEX.length], marker: 'disc', markerSize: 4, markerColor: null }
    },
    setStyle(name, changes) {
      this.set({ curveStyles: { ...(this.view.curveStyles ?? {}), [name]: { ...this.styleOf(name), ...changes } } })
    },
    placeLabel({ x, y }) {
      const labels = (this.view.labels ?? []).map((l) => (l.id === this.placingId ? { ...l, x, y } : l))
      this.placingId = null
      this.set({ labels })
      this.$emit('announce', this.$t('labels.placed'))
    },
    resetStyle(name) {
      const { [name]: _, ...rest } = this.view.curveStyles ?? {}
      // a style stored with the simulation is switched off by null
      this.set({ curveStyles: this.simStyles[this.active]?.[name] ? { ...rest, [name]: null } : rest })
    },
    seriesColor,
    seriesDash,
    // legend line of simulation i: its own stored look, else ink with the simulation's dash
    simLegend(i) {
      const style = this.view.curveStyles?.[this.shownY[0]] ? null : this.simStyles[i]?.[this.shownY[0]]
      if (style) {
        const look = curveStyle(0, style)
        return { stroke: look.color, 'stroke-width': 2.5, 'stroke-dasharray': look.dash || null }
      }
      return { stroke: 'var(--ink)', 'stroke-width': 2, 'stroke-dasharray': i === this.active ? null : this.dashFor(i) }
    },
    dashFor(i) { return seriesDash(i + 1) || '6 4' },
    set(changes) { this.$emit('update:view', changes) },
    setAxes(changes) { this.set({ axes: { ...this.view.axes, ...changes } }) },
    parseLimit(raw) { return raw.trim() === '' ? null : parseNumber(raw) },
    toggleY(name, on) {
      const ys = on ? [...this.view.plotY, name] : this.view.plotY.filter((n) => n !== name)
      this.set({ plotY: ys })
    },
    sparkline(name) { return sparkPoints(this.run.result?.series[name]) },
    tabKeys(ev) {
      const i = this.tabs.findIndex((t) => t.id === this.tab)
      let j = i
      if (ev.key === 'ArrowRight') j = (i + 1) % this.tabs.length
      else if (ev.key === 'ArrowLeft') j = (i - 1 + this.tabs.length) % this.tabs.length
      else if (ev.key === 'Home') j = 0
      else if (ev.key === 'End') j = this.tabs.length - 1
      else return
      ev.preventDefault()
      this.set({ resultTab: this.tabs[j].id })
      this.$nextTick(() => document.getElementById(`tab-${this.tabs[j].id}`)?.focus())
    },
    /** SVG of the visible graphic (chart, 3D chart or animation frame). */
    currentSvg() {
      if (this.tab === 'chart') return this.$refs.chart?.toSvgString()
      if (this.tab === 'chart3d') return this.$refs.chart3d?.toSvgString()
      return this.animationSvg?.()
    },
    saveImage(kind) {
      const svg = this.currentSvg()
      if (!svg) return
      downloadSvg(svg, this.fileName, kind)
      this.$emit('announce', this.$t('app.imageSaved'))
    },
    exportData() {
      const columns = [this.view.plotX, ...this.view.plotY.filter((y) => y !== this.view.plotX)]
      const display = this.run.result.display
      return { header: [this.$t('table.step'), ...columns.map((c) => display.get(c) ?? c)], rows: tableRows(this.run.result, columns) }
    },
    saveCsv() {
      const { header, rows } = this.exportData()
      download(new Blob([toCsv(header, rows, i18n.locale)], { type: 'text/csv;charset=utf-8' }), `${this.fileName}.csv`)
      this.$emit('announce', this.$t('app.csvSaved'))
    },
    async copyTable() {
      const { header, rows } = this.exportData()
      try {
        await navigator.clipboard.writeText(toTsv(header, rows, i18n.locale))
        this.$emit('announce', this.$t('app.tableCopied'))
      } catch {
        this.$emit('announce', this.$t('app.copyFailed'))
      }
    },
  },
}
</script>
