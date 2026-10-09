<template>
  <div class="app-shell flex min-h-screen flex-col">
    <a href="#main" class="btn btn-primary sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50">{{ $t('app.skip') }}</a>

    <header class="border-b border-line bg-sheet">
      <div class="mx-auto flex max-w-[96rem] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
        <component :is="homeHref ? 'a' : 'div'" :href="homeHref" class="flex items-center gap-3 rounded-lg no-underline" :title="homeHref ? $t('app.home') : null">
          <img :src="logoUrl" width="36" height="36" alt="" />
          <span class="leading-tight">
            <span class="block text-lg font-extrabold tracking-tight text-ink">Modellwerk</span>
            <span class="block text-xs text-muted">{{ $t('app.tagline') }}</span>
          </span>
        </component>

        <nav class="order-3 flex basis-full flex-wrap items-center gap-2 lg:order-none lg:basis-auto lg:flex-1" :aria-label="$t('app.toolsNav')">
          <button type="button" class="btn" @click="newModel"><FilePlus :size="18" aria-hidden="true" /> {{ $t('app.new') }}</button>
          <label class="btn cursor-pointer has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent" :title="$t('app.openHint')">
            <FolderOpen :size="18" aria-hidden="true" /> {{ $t('app.open') }}
            <input id="open-file" type="file" accept=".json,.prg,.PRG" class="sr-only" @change="openFile($event)" />
          </label>
          <button type="button" class="btn" @click="saveProject"><Save :size="18" aria-hidden="true" /> {{ $t('app.save') }}</button>
          <button type="button" class="btn" @click="$refs.examples.show()"><BookOpen :size="18" aria-hidden="true" /> {{ $t('app.examples') }}</button>
        </nav>

        <div class="ml-auto flex items-center gap-1" role="group" :aria-label="$t('app.display')">
          <button type="button" class="btn btn-quiet" :aria-label="`${$t('app.language')}: ${otherLocale.name}`" :lang="otherLocale.code" @click="setLocale(otherLocale.code)">
            <Languages :size="20" aria-hidden="true" /> <span class="text-sm">{{ otherLocale.code.toUpperCase() }}</span>
          </button>
          <button type="button" class="btn btn-quiet" :title="$t('app.textSmaller')" :aria-label="$t('app.textSmaller')" @click="setScale(-1)"><AArrowDown :size="20" aria-hidden="true" /></button>
          <button type="button" class="btn btn-quiet" :title="$t('app.textLarger')" :aria-label="$t('app.textLarger')" @click="setScale(1)"><AArrowUp :size="20" aria-hidden="true" /></button>
          <button type="button" class="btn btn-quiet" :title="$t(`app.theme.${theme}`)" :aria-label="$t(`app.theme.${theme}`)" @click="cycleTheme">
            <Sun v-if="theme === 'light'" :size="20" aria-hidden="true" /><Moon v-else-if="theme === 'dark'" :size="20" aria-hidden="true" /><Monitor v-else :size="20" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>

    <main id="main" class="mx-auto flex w-full max-w-[96rem] flex-1 flex-col gap-5 px-4 py-5 sm:px-6">
      <div class="min-w-0 max-w-[70ch]">
        <p class="eyebrow">{{ texts.topic }}</p>
        <label v-if="!project.example" class="block">
          <span class="sr-only">{{ $t('app.modelTitle') }}</span>
          <input id="model-title" v-model="project.title" :placeholder="$t('app.untitled')" autocomplete="off"
                 class="w-full rounded-lg border border-transparent bg-transparent px-1 -mx-1 text-2xl font-extrabold tracking-tight hover:border-line focus:border-accent sm:text-3xl" />
        </label>
        <h1 v-else class="text-2xl font-extrabold tracking-tight sm:text-3xl">{{ texts.title }}</h1>
        <p class="mt-1 text-muted">{{ texts.description }}</p>
        <p v-if="openError" class="mt-2 flex items-start gap-2 rounded-lg bg-bad-soft px-3 py-2 text-[0.95rem]" role="alert">
          <TriangleAlert :size="18" aria-hidden="true" class="mt-0.5 flex-none text-bad" /> {{ $t('app.openFailed', { message: openError }) }}
        </p>
        <p v-if="restored" class="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted" role="status">
          <History :size="16" aria-hidden="true" /> {{ $t('app.restored') }}
          <button type="button" class="btn-link font-semibold" @click="loadExample(examples[0])">{{ $t('app.startOver') }}</button>
        </p>
        <details v-if="currentExample?.sources?.length" class="mt-2 text-sm">
          <summary class="cursor-pointer font-semibold text-muted">{{ $t('app.sources') }} ({{ currentExample.sources.length }})</summary>
          <ul class="mt-2 flex flex-col gap-1.5">
            <li v-for="(src, i) in currentExample.sources" :key="i">
              <a :href="src.url" target="_blank" rel="noopener" class="font-semibold text-accent-strong underline underline-offset-2">{{ src.title }}</a>
              <span class="text-muted"> – {{ src.publisher }} · {{ src.license }}</span>
            </li>
          </ul>
        </details>
      </div>

      <SimulationBar :names="simNames" :active="project.active" :raw-name="sim.name"
                     @select="selectSim" @copy="copySim" @remove="removeSim" @rename="patchSim({ name: $event })" />

      <div class="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <ModelPanel ref="modelPanel" :sim="sim" :source="source" :analysis="analysis" :conversion="conversion" :tab="modelTab"
                    :reset-key="`${loadCount}-${project.active}`"
                    @patch="patchSim" @update:tab="modelTab = $event" @new-model="newModel" @announce="announce">
          <template #diagram>
            <ModelDiagram :analysis="analysis" @enlarge="$refs.diagram.showModal()" />
          </template>
        </ModelPanel>

        <ResultPanel :runs="runs" :active="project.active" :sim-names="simNames" :variables="variableList" :time-var="timeVar"
                     :view="view" :steps="sim.steps" :max-steps="maxSteps" :continue-by="continueBy" :file-name="fileName"
                     @update:view="Object.assign(view, $event)" @continue="continueRun" @goto-program="gotoProgram"
                     @report="printReport" @announce="announce" />
      </div>
    </main>

    <AppFooter @compare="$refs.compare.show()" />
  </div>

  <div class="app-dialogs">
    <ExamplesDialog ref="examples" :current="project.example" @load="loadExample" />

    <dialog ref="diagram" class="m-auto w-[calc(100vw-2rem)] max-w-[110rem] max-h-[calc(100vh-2rem)] rounded-2xl border border-line bg-sheet p-0 text-ink shadow-2xl backdrop:bg-black/50" aria-labelledby="diagram-dialog-title">
      <div class="flex flex-col gap-3 p-5">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h2 id="diagram-dialog-title" class="text-xl font-bold">{{ $t('app.diagramDialog') }} · {{ texts.title }}</h2>
            <p class="text-muted">{{ $t('diagram.intro') }}</p>
          </div>
          <button type="button" class="btn btn-quiet" :aria-label="$t('app.close')" @click="$refs.diagram.close()"><X :size="20" aria-hidden="true" /></button>
        </div>
        <ModelDiagram :analysis="analysis" large />
      </div>
    </dialog>

    <CompareDialog ref="compare" @open-simulation="(s, file) => loadPrg([s], file)" />
  </div>

  <ReportView v-if="report" v-bind="report" />

  <p class="sr-only" aria-live="polite">{{ announcement }}</p>
</template>

<script>
import { AArrowDown, AArrowUp, BookOpen, FilePlus, FolderOpen, History, Languages, Monitor, Moon, Save, Sun, TriangleAlert, X } from 'lucide-vue-next'
import ModelPanel from './components/ModelPanel.vue'
import ModelDiagram from './components/ModelDiagram.vue'
import ResultPanel from './components/ResultPanel.vue'
import SimulationBar from './components/SimulationBar.vue'
import CompareDialog from './components/CompareDialog.vue'
import ExamplesDialog from './components/ExamplesDialog.vue'
import AppFooter from './components/AppFooter.vue'
import ReportView from './components/ReportView.vue'
import { analyse, formatNumber, programToSentences, sentencesToProgram } from './engine/model.js'
import { MAX_STEPS, simulate } from './engine/simulate.js'
import { readPrg } from './engine/prg.js'
import { tableRows } from './engine/export.js'
import { PROJECT_EXTENSION, cleanSimulation, parseProject, projectToText, toProject } from './engine/project.js'
import { EXAMPLES } from './examples.js'
import { exampleText } from './guides/data.js'
import { LOCALES, i18n, numberLocale, setLocale } from './i18n/index.js'
import { download, fileBase } from './site/download.js'
import { THEMES, applyTheme, loadTheme } from './site/theme.js'
import { siteLink } from './site/links.js'
import logoUrl from './assets/logo.svg'

function store(key, value) {
  try {
    if (value === undefined) return JSON.parse(localStorage.getItem(`modellwerk.${key}`))
    localStorage.setItem(`modellwerk.${key}`, JSON.stringify(value))
  } catch {
    return null
  }
}

const freshAxes = () => ({ auto: true, xMin: null, xMax: null, yMin: null, yMax: null })

function simulationFromExample(ex) {
  return cleanSimulation({ ...ex, example: ex.id, name: '', origin: ex.mode === 'sentences' ? 'sentences' : 'program' })
}

function viewFor(plot, saved = {}) {
  return {
    plotX: plot.x, plotY: [...plot.y], plotY3: null, plotZ: null, resultTab: 'chart',
    axes: freshAxes(), overlay: true, curveMode: 'line', animation: null, ...saved,
  }
}

function sourceOf(sim) {
  return sim.origin === 'sentences'
    ? sentencesToProgram(sim.sentences, { simplified: sim.simplified, timeName: sim.timeName, dtName: sim.dtName })
    : sim.source
}

/** Sensible axes for a model: time on x, stocks as curves. */
function defaultPlot(source, options) {
  const roles = [...analyse(source, options).roles]
  return {
    x: roles.find(([, r]) => r === 'time')?.[0] ?? roles[0]?.[0] ?? '',
    y: roles.filter(([, r]) => r === 'state').map(([n]) => n).slice(0, 4),
  }
}

export default {
  name: 'App',
  components: {
    AArrowDown, AArrowUp, BookOpen, FilePlus, FolderOpen, History, Languages, Monitor, Moon, Save, Sun, TriangleAlert, X,
    ModelPanel, ModelDiagram, ResultPanel, SimulationBar, CompareDialog, ExamplesDialog, AppFooter, ReportView,
  },
  data() {
    // deep link from the guide pages: app/#<example-id>; otherwise restore the last session
    const linked = EXAMPLES.find((e) => e.id === location.hash.slice(1))
    const first = linked ?? EXAMPLES[0]
    let saved = null
    if (!linked) {
      try { saved = parseProject(store('autosave')) } catch { saved = null }
    }
    const project = saved
      ? { title: saved.title, file: saved.view.file ?? '', example: saved.view.example ?? null, simulations: saved.simulations, active: saved.active }
      : { title: '', file: '', example: first.id, simulations: [simulationFromExample(first)], active: 0 }
    const { file, example, ...savedView } = saved?.view ?? {}
    return {
      project,
      view: viewFor(first.plot, savedView),
      modelTab: (saved ? saved.simulations[saved.active].origin : first.mode) === 'sentences' ? 'sentences' : 'program',
      restored: Boolean(saved),
      openError: '',
      repeatChunk: project.simulations[project.active].steps,
      loadCount: 0,
      maxSteps: MAX_STEPS,
      examples: EXAMPLES,
      logoUrl,
      // the standalone builds (desktop/mobile app, offline file) have no landing page
      homeHref: ['app', 'single'].includes(import.meta.env.MODE) ? null : siteLink('../'),
      theme: loadTheme(),
      textScale: store('textScale') ?? 1,
      announcement: '',
      report: null,
    }
  },
  computed: {
    sim() { return this.project.simulations[this.project.active] },
    currentExample() { return EXAMPLES.find((e) => e.id === this.project.example) ?? null },
    sources() { return this.project.simulations.map(sourceOf) },
    analyses() {
      return this.project.simulations.map((s, i) => analyse(this.sources[i], { caseSensitive: s.caseSensitive, macros: s.macros }))
    },
    runs() {
      return this.project.simulations.map((s, i) => {
        const t0 = performance.now()
        try {
          const result = simulate(this.analyses[i].program, s.start, s.steps, { caseSensitive: s.caseSensitive, seed: s.seed })
          return { result, ms: Math.max(1, Math.round(performance.now() - t0)) }
        } catch (error) {
          return { error }
        }
      })
    },
    source() { return this.sources[this.project.active] },
    analysis() { return this.analyses[this.project.active] },
    conversion() {
      return this.sim.origin === 'sentences' ? { ok: false, line: null } : programToSentences(this.source, { macros: this.sim.macros })
    },
    variableList() {
      return [...this.analysis.program.variables].map(([name, label]) => ({ name, label, role: this.analysis.roles.get(name) }))
    },
    timeVar() { return this.variableList.find((v) => v.role === 'time')?.name ?? this.variableList[0]?.name ?? '' },
    simNames() {
      return this.project.simulations.map((s, i) => s.name || this.$t('sim.default', { n: i + 1 }))
    },
    texts() {
      const ex = this.currentExample
      if (ex) return { title: exampleText(ex, 'title'), topic: exampleText(ex, 'topic'), description: exampleText(ex, 'description') }
      const prg = /\.prg$/i.test(this.project.file)
      return {
        title: this.project.title || this.$t('app.untitled'),
        topic: this.project.file ? this.$t('app.importedFrom', { file: this.project.file }) : this.$t('app.ownModel'),
        description: prg ? this.$t('app.importedDescription') : this.$t('app.projectDescription'),
      }
    },
    fileName() { return fileBase(this.texts.title) },
    continueBy() { return Math.max(1, Math.min(this.repeatChunk, MAX_STEPS - this.sim.steps)) },
    otherLocale() {
      const code = i18n.locale === 'de' ? 'en' : 'de'
      return { code, name: LOCALES[code].name }
    },
    autosaveState() { return [this.project, this.view] },
  },
  watch: {
    // keep the current work in the browser so a reload does not lose it
    autosaveState: {
      deep: true,
      handler() {
        clearTimeout(this.autosaveTimer)
        this.autosaveTimer = setTimeout(() => store('autosave', this.currentProject()), 600)
      },
    },
    variableList(list) {
      const names = new Set(list.map((v) => v.name))
      if (!names.has(this.view.plotX)) this.view.plotX = this.timeVar
      const ys = this.view.plotY.filter((n) => names.has(n))
      if (ys.length !== this.view.plotY.length) this.view.plotY = ys
    },
    theme: { immediate: true, handler: applyTheme },
    textScale: {
      immediate: true,
      handler(s) {
        document.documentElement.style.setProperty('--text-scale', s)
        store('textScale', s)
      },
    },
  },
  methods: {
    setLocale,
    announce(text) {
      this.announcement = ''
      this.$nextTick(() => { this.announcement = text })
    },
    patchSim(changes) {
      Object.assign(this.sim, changes)
    },
    // ---- loading and saving --------------------------------------------------
    startProject(project, view, tab) {
      this.project = project
      this.view = view
      this.modelTab = tab
      this.repeatChunk = project.simulations[project.active].steps
      this.restored = false
      this.openError = ''
      this.loadCount++
    },
    loadExample(ex) {
      this.startProject(
        { title: '', file: '', example: ex.id, simulations: [simulationFromExample(ex)], active: 0 },
        viewFor(ex.plot),
        ex.mode === 'sentences' ? 'sentences' : 'program',
      )
      this.announce(this.$t('app.exampleLoaded', { title: exampleText(ex, 'title') }))
    },
    loadPrg(sims, file) {
      const simulations = sims.map((s) => cleanSimulation({
        name: s.name,
        source: s.source,
        steps: s.steps,
        caseSensitive: s.variables.some((v) => v.name !== v.name.toUpperCase()),
        start: Object.fromEntries(s.variables.map((v) => [v.name, v.start])),
      }))
      const first = simulations[0]
      this.startProject({ title: file.replace(/\.prg$/i, ''), file, example: null, simulations, active: 0 },
        viewFor(defaultPlot(first.source, { caseSensitive: first.caseSensitive })), 'program')
      this.announce(this.$t('app.modelOpened', { title: this.texts.title }))
    },
    newModel() {
      const sim = cleanSimulation({ origin: 'sentences', sentences: [{ subject: '', predicate: 'increase', object: '' }], steps: 50 })
      this.startProject({ title: '', file: '', example: null, simulations: [sim], active: 0 }, viewFor({ x: 'ZEIT', y: [] }), 'sentences')
      this.announce(this.$t('app.newModel'))
    },
    currentProject() {
      return toProject({
        title: this.project.example ? this.texts.title : this.project.title,
        simulations: this.project.simulations,
        active: this.project.active,
        view: { ...this.view, file: this.project.file, example: this.project.example },
      })
    },
    saveProject() {
      download(new Blob([projectToText(this.currentProject())], { type: 'application/json' }), `${this.fileName}${PROJECT_EXTENSION}`)
      this.announce(this.$t('app.saved'))
    },
    async openFile(ev) {
      const file = ev.target.files[0]
      ev.target.value = ''
      if (!file) return
      try {
        if (/\.prg$/i.test(file.name)) {
          const sims = readPrg(new Uint8Array(await file.arrayBuffer()))
          if (!sims.length) throw new Error(this.$t('app.noModelInFile'))
          this.loadPrg(sims, file.name)
          return
        }
        const p = parseProject(await file.text())
        const { file: _f, example, ...savedView } = p.view
        const s = p.simulations[p.active]
        this.startProject({ title: p.title, file: file.name, example: example ?? null, simulations: p.simulations, active: p.active },
          viewFor(defaultPlot(sourceOf(s), { caseSensitive: s.caseSensitive, macros: s.macros }), savedView),
          s.origin === 'sentences' ? 'sentences' : 'program')
        this.announce(this.$t('app.modelOpened', { title: this.texts.title }))
      } catch (e) {
        this.openError = e.code ? this.$t(`app.${e.code}`) : e.message
        this.announce(this.$t('app.openFailed', { message: this.openError }))
      }
    },
    // ---- simulations -----------------------------------------------------------
    selectSim(i) {
      this.project.active = i
      this.repeatChunk = this.sim.steps
      this.modelTab = this.sim.origin === 'sentences' && this.modelTab === 'program' ? 'sentences' : this.modelTab
      this.announce(this.$t('sim.selected', { name: this.simNames[i] }))
    },
    copySim() {
      const copy = JSON.parse(JSON.stringify(this.sim))
      copy.name = this.$t('sim.copyName', { name: this.simNames[this.project.active] })
      this.project.simulations.splice(this.project.active + 1, 0, copy)
      this.project.active += 1
      this.view.overlay = true
      this.announce(this.$t('sim.copied', { name: copy.name }))
    },
    removeSim() {
      if (this.project.simulations.length < 2) return
      const name = this.simNames[this.project.active]
      this.project.simulations.splice(this.project.active, 1)
      this.project.active = Math.min(this.project.active, this.project.simulations.length - 1)
      this.announce(this.$t('sim.removed', { name }))
    },
    // the legacy "Weiterrechnen": the run is deterministic, so continuing equals more steps
    continueRun() {
      this.sim.steps = Math.min(MAX_STEPS, this.sim.steps + this.continueBy)
      this.announce(this.$t('app.continued', { n: this.sim.steps }))
    },
    gotoProgram(line) {
      this.modelTab = 'program'
      if (line) this.$nextTick(() => this.$refs.modelPanel?.$refs.program?.goto(line))
    },
    // ---- report ------------------------------------------------------------------
    printReport() {
      const fmt = (x) => formatNumber(x, 10, numberLocale())
      const sims = this.project.simulations.map((s, i) => {
        const a = this.analyses[i]
        return {
          name: this.simNames[i],
          source: this.sources[i],
          macros: s.macros,
          steps: s.steps,
          start: [...a.program.variables].filter(([n]) => a.roles.get(n) !== 'rate')
            .map(([name, label]) => ({ name, label, value: fmt(s.start[name] ?? 0), role: a.roles.get(name) })),
        }
      })
      const run = this.runs[this.project.active]
      let table = { header: [], rows: [], every: 1 }
      if (run.result) {
        const columns = [this.view.plotX, ...this.view.plotY.filter((y) => y !== this.view.plotX)]
        const every = Math.max(1, Math.ceil((run.result.steps + 1) / 40))
        table = {
          every,
          header: [this.$t('table.step'), ...columns.map((c) => run.result.display.get(c) ?? c)],
          rows: tableRows(run.result, columns, every).map((r) => [r[0], ...r.slice(1).map(fmt)]),
        }
      }
      const chart = document.querySelector('#panel-chart svg[role="img"], #panel-chart3d svg[role="img"]')
      this.report = {
        title: this.texts.title,
        topic: this.texts.topic,
        description: this.texts.description,
        sims,
        chartSvg: chart ? chart.outerHTML : '',
        table,
      }
      this.$nextTick(() => {
        window.addEventListener('afterprint', () => { this.report = null }, { once: true })
        window.print()
      })
    },
    // ---- display settings ----------------------------------------------------------
    cycleTheme() {
      this.theme = THEMES[(THEMES.indexOf(this.theme) + 1) % THEMES.length]
      this.announce(this.$t(`app.theme.${this.theme}`))
    },
    setScale(d) {
      const steps = [0.875, 1, 1.125, 1.25, 1.5]
      const i = steps.indexOf(this.textScale)
      this.textScale = steps[Math.min(steps.length - 1, Math.max(0, (i < 0 ? 1 : i) + d))]
    },
  },
}
</script>
