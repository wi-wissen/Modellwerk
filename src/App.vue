<template>
  <div class="app-shell flex min-h-screen flex-col">
    <a href="#main" class="btn btn-primary sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50">{{ $t('app.skip') }}</a>

    <header v-if="!board" class="border-b border-line bg-sheet">
      <div class="flex flex-wrap items-center gap-x-5 gap-y-3 px-4 py-2.5 sm:px-6">
        <component :is="homeHref ? 'a' : 'div'" :href="homeHref" class="flex flex-none items-center gap-2.5 rounded-lg no-underline" :title="homeHref ? $t('app.home') : $t('app.tagline')">
          <img :src="logoUrl" width="32" height="32" alt="" />
          <span class="text-lg font-extrabold tracking-tight text-ink max-sm:sr-only">Modellwerk</span>
        </component>

        <div class="order-last flex min-w-0 basis-full flex-col sm:order-none sm:flex-1 sm:basis-0 sm:border-l sm:border-line sm:pl-5">
          <label v-if="!project.example" class="block">
            <span class="sr-only">{{ $t('app.modelTitle') }}</span>
            <input id="model-title" v-model="project.title" :placeholder="$t('app.untitled')" autocomplete="off"
                   class="w-full rounded-md border border-transparent bg-transparent px-1 -mx-1 text-lg font-bold leading-tight hover:border-line focus:border-accent" />
          </label>
          <h1 v-else class="truncate text-lg font-bold leading-tight">{{ texts.title }}</h1>
          <p class="flex min-w-0 items-center gap-1.5 text-sm text-muted">
            <span class="truncate">{{ texts.topic }}</span>
            <template v-if="guideHref">
              <span aria-hidden="true">·</span>
              <a :href="guideHref" :title="$t('app.guideLink')" class="inline-flex flex-none items-center gap-1 font-semibold text-accent-strong underline underline-offset-2"><GraduationCap :size="15" aria-hidden="true" /> {{ $t('app.guideShort') }}</a>
            </template>
          </p>
        </div>

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

    <!-- board view: one column large on the projector, everything else out of the way -->
    <div v-else class="border-b border-line bg-sheet">
      <div class="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 sm:px-6" role="toolbar" :aria-label="$t('board.title')">
        <span class="font-bold">{{ $t('board.title') }}</span>
        <span class="min-w-0 truncate text-muted">{{ texts.title }}</span>
        <div class="seg ml-auto" role="group" :aria-label="$t('board.show')">
          <button v-for="b in boardViews" :key="b.id" type="button" :aria-pressed="board === b.id ? 'true' : 'false'"
                  :class="{ 'is-selected': board === b.id }" @click="board = b.id">{{ b.label }}</button>
        </div>
        <span class="flex gap-1">
          <button type="button" class="btn btn-quiet" :title="$t('app.textSmaller')" :aria-label="$t('app.textSmaller')" @click="setScale(-1)"><AArrowDown :size="20" aria-hidden="true" /></button>
          <button type="button" class="btn btn-quiet" :title="$t('app.textLarger')" :aria-label="$t('app.textLarger')" @click="setScale(1)"><AArrowUp :size="20" aria-hidden="true" /></button>
        </span>
        <button type="button" class="btn" :title="$t('board.leaveHint')" @click="leaveBoard">
          <Minimize :size="18" aria-hidden="true" /> {{ $t('board.leave') }} <kbd class="text-xs text-muted">Esc</kbd>
        </button>
      </div>
    </div>

    <main id="main" class="mx-auto flex w-full max-w-[134rem] flex-1 flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5">
      <nav v-if="!board" class="panel flex flex-wrap items-center gap-2 p-2" :aria-label="$t('app.toolsNav')">
        <button type="button" class="btn" :title="$t('app.new')" @click="newModel"><FilePlus :size="18" aria-hidden="true" /> <span class="max-sm:sr-only">{{ $t('app.new') }}</span></button>
        <label class="btn cursor-pointer has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent" :title="$t('app.openHint')">
          <FolderOpen :size="18" aria-hidden="true" /> <span class="max-sm:sr-only">{{ $t('app.open') }}</span>
          <input id="open-file" type="file" accept=".json,.prg,.PRG" class="sr-only" @change="openFile($event)" />
        </label>
        <button type="button" class="btn" :title="$t('app.save')" @click="saveProject"><Save :size="18" aria-hidden="true" /> <span class="max-sm:sr-only">{{ $t('app.save') }}</span></button>
        <button type="button" class="btn" :title="$t('app.examples')" @click="$refs.examples.show()"><BookOpen :size="18" aria-hidden="true" /> <span class="max-sm:sr-only">{{ $t('app.examples') }}</span></button>
        <span class="ml-auto flex gap-1" role="group" :aria-label="$t('app.history')">
          <button type="button" class="btn btn-quiet" :disabled="!history.past.length" :title="$t('app.undoHint')" @click="undo"><Undo2 :size="18" aria-hidden="true" /> <span class="max-lg:sr-only">{{ $t('app.undo') }}</span></button>
          <button type="button" class="btn btn-quiet" :disabled="!history.future.length" :title="$t('app.redoHint')" @click="redo"><Redo2 :size="18" aria-hidden="true" /> <span class="max-lg:sr-only">{{ $t('app.redo') }}</span></button>
        </span>
      </nav>

      <p v-if="openError" class="flex items-start gap-2 self-center rounded-lg bg-bad-soft px-3 py-2 text-[0.95rem]" role="alert">
        <TriangleAlert :size="18" aria-hidden="true" class="mt-0.5 flex-none text-bad" /> {{ $t('app.openFailed', { message: openError }) }}
      </p>
      <p v-if="restored && !board" class="flex flex-wrap items-center gap-2 self-center text-sm text-muted" role="status">
        <History :size="16" aria-hidden="true" /> {{ $t('app.restored') }}
        <button type="button" class="btn-link font-semibold" @click="loadExample(examples[0])">{{ $t('app.startOver') }}</button>
      </p>

      <!-- full width, but no column grows wider than it can use -->
      <div class="flex flex-col gap-5" :class="stacked ? '' : 'xl:flex-row xl:items-start xl:justify-center'">
        <section v-show="board !== 'result'" class="panel flex min-w-0 flex-col" :class="workClass" :aria-label="$t('steps.label')">
          <div class="flex items-stretch border-b border-line">
            <div role="tablist" class="grid min-w-0 flex-1 grid-cols-3" :aria-label="$t('steps.label')" @keydown="stepKeys">
              <button v-for="(s, i) in steps" :id="`step-${s.id}`" :key="s.id" type="button" role="tab" class="step-tab"
                      :aria-selected="step === s.id" aria-controls="step-panel" :tabindex="step === s.id ? 0 : -1" @click="step = s.id">
                <span class="step" :class="{ 'step-open': step !== s.id }">{{ i + 1 }}</span>
                <span class="flex min-w-0 flex-col items-start">
                  <span class="font-bold">{{ s.label }}</span>
                  <span class="max-w-full truncate text-xs text-muted">{{ s.summary }}</span>
                </span>
              </button>
            </div>
            <button type="button" class="btn btn-quiet m-1.5 !px-2.5 self-center max-md:hidden" :aria-pressed="board === 'work' ? 'true' : 'false'"
                    :title="$t(board === 'work' ? 'board.leaveHint' : 'board.enter')" :aria-label="$t(board === 'work' ? 'board.leaveHint' : 'board.enter')"
                    @click="toggleBoard('work')">
              <component :is="board === 'work' ? 'Minimize' : 'Maximize'" :size="20" aria-hidden="true" />
            </button>
          </div>

          <div id="step-panel" role="tabpanel" :aria-labelledby="`step-${step}`" class="flex flex-col gap-5 p-4 sm:p-5">
            <template v-if="step === 'sim'">
              <div class="flex flex-col gap-2">
                <p class="max-w-[62ch] text-muted">{{ texts.description }}</p>
                <details v-if="currentExample?.sources?.length" class="text-sm">
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
            </template>
            <ModelPanel v-else ref="modelPanel" :part="step === 'start' ? 'start' : 'model'"
                        :sim="sim" :source="source" :analysis="analysis" :conversion="conversion" :graph-conversion="graphConversion" :tab="modelTab" :wide="wideModel" @update:wide="wideModel = $event"
                        :reset-key="`${loadCount}-${project.active}`"
                        @patch="patchSim" @update:tab="modelTab = $event" @new-model="newModel" @announce="announce">
              <template #diagram>
                <ModelDiagram :analysis="analysis" @enlarge="$refs.diagram.showModal()" />
              </template>
            </ModelPanel>
          </div>
        </section>

        <ResultPanel v-show="board !== 'work'" :class="resultClass" :board="board === 'result'" @board="toggleBoard('result')"
                     :runs="runs" :active="project.active" :sim-names="simNames" :variables="variableList" :time-var="timeVar"
                     :view="view" :sim-styles="project.simulations.map((s) => s.curveStyles ?? {})" :steps="sim.steps" :max-steps="maxSteps" :continue-by="continueBy" :file-name="fileName"
                     @update:view="Object.assign(view, $event)" @continue="continueRun" @goto-program="gotoProgram"
                     :has-animation="!!runs[project.active].result" :animation-svg="() => $refs.animation?.toSvgString()"
                     @report="printReport" @announce="announce">
          <template #animation="{ result }">
            <ResultAnimation ref="animation" :result="result" :roles="analysis.roles" :context="project.example || texts.title"
                             :model-value="view.animation" @update:model-value="view.animation = $event" />
          </template>
        </ResultPanel>
      </div>
    </main>

    <AppFooter v-if="!board" @compare="$refs.compare.show()" />
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
import { AArrowDown, AArrowUp, BookOpen, FilePlus, FolderOpen, History, Languages, GraduationCap, Maximize, Minimize, Monitor, Moon, Redo2, Save, Sun, TriangleAlert, Undo2, X } from 'lucide-vue-next'
import ModelPanel from './components/ModelPanel.vue'
import ModelDiagram from './components/ModelDiagram.vue'
import ResultPanel from './components/ResultPanel.vue'
import ResultAnimation from './components/ResultAnimation.vue'
import SimulationBar from './components/SimulationBar.vue'
import CompareDialog from './components/CompareDialog.vue'
import ExamplesDialog from './components/ExamplesDialog.vue'
import AppFooter from './components/AppFooter.vue'
import ReportView from './components/ReportView.vue'
import { analyse, formatNumber, programToSentences, sentencesToProgram } from './engine/model.js'
import { MAX_STEPS, simulate } from './engine/simulate.js'
import { readPrg } from './engine/prg.js'
import { tableRows } from './engine/export.js'
import { graphToProgram, programToGraph } from './engine/graph.js'
import { curveStyle } from './chartStyle.js'
import { PROJECT_EXTENSION, cleanSimulation, parseProject, projectToText, toProject } from './engine/project.js'
import { EXAMPLES } from './examples.js'
import { exampleText, findGuide } from './guides/data.js'
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
    axes: freshAxes(), overlay: true, curveMode: 'line', curveStyles: plot.styles ?? {}, animation: null, ...saved,
  }
}

function sourceOf(sim) {
  const options = { simplified: sim.simplified, timeName: sim.timeName, dtName: sim.dtName }
  if (sim.origin === 'sentences') return sentencesToProgram(sim.sentences, options)
  if (sim.origin === 'graph' && sim.graph) return graphToProgram(sim.graph, { ...options, extended: sim.extended }).source
  return sim.source
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
    AArrowDown, AArrowUp, BookOpen, FilePlus, FolderOpen, History, Languages, GraduationCap, Maximize, Minimize, Monitor, Moon, Redo2, Save, Sun, TriangleAlert, Undo2, X,
    ModelPanel, ModelDiagram, ResultPanel, SimulationBar, CompareDialog, ExamplesDialog, AppFooter, ReportView, ResultAnimation,
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
      wideModel: false,
      // work step shown in the left column: 'sim', 'model' or 'start'
      step: 'model',
      // board view for the projector: null, 'work' (left column), 'result' or 'both'
      board: null,
      history: { past: [], future: [], lastKeys: '', lastAt: 0 },
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
    // the student guide of the open example (website only; the desktop app has no guides)
    guideHref() {
      const id = this.project.example
      return this.homeHref && id && findGuide(id) ? siteLink('../', `examples/${id}/`) : null
    },
    conversion() {
      return this.sim.origin === 'sentences' ? { ok: false, line: null } : programToSentences(this.source, { macros: this.sim.macros })
    },
    graphConversion() {
      if (this.sim.origin === 'graph') return { ok: false, line: null }
      if (this.sim.macros.length && this.sim.macros.some((m) => new RegExp(`^\\s*${m.name}\\s*(//.*)?$`, 'im').test(this.source))) {
        const line = this.source.split('\n').findIndex((l) => this.sim.macros.some((m) => l.trim().toUpperCase() === m.name.toUpperCase())) + 1
        return { ok: false, line: line || null, reason: 'macro' }
      }
      return programToGraph(this.source)
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
    steps() {
      const n = this.project.simulations.length
      const name = this.simNames[this.project.active]
      const tab = this.$t(`app.tabs.${this.modelTab}`)
      const error = this.analysis.program.errors[0]
      const lines = this.source.split('\n').filter((l) => l.trim()).length
      const values = this.variableList.filter((v) => v.role !== 'rate').length
      return [
        { id: 'sim', label: this.$t('sim.label'), summary: n > 1 ? this.$t('steps.simOf', { name, i: this.project.active + 1, n }) : name },
        {
          id: 'model',
          label: this.$t('app.model'),
          summary: error
            ? this.$t(error.line ? 'steps.error' : 'steps.errorNoLine', { tab, line: error.line })
            : this.$t(lines === 1 ? 'steps.line' : 'steps.lines', { tab, n: lines }),
        },
        { id: 'start', label: this.$t('app.startValues'), summary: this.$t('steps.start', { n: values, steps: this.sim.steps }) },
      ]
    },
    boardViews() {
      const work = this.steps.find((s) => s.id === this.step).label
      return [
        { id: 'work', label: work },
        { id: 'both', label: this.$t('board.both') },
        { id: 'result', label: this.$t('app.result') },
      ]
    },
    // the wide graph editor puts the result below the model
    stacked() { return this.wideModel && this.board !== 'work' && this.board !== 'result' },
    workClass() {
      if (this.board === 'work') return 'w-full xl:max-w-[90rem] xl:flex-1'
      return this.stacked ? '' : 'xl:max-w-[52rem] xl:flex-[1_1_0]'
    },
    resultClass() {
      if (this.board === 'result') return 'w-full xl:max-w-[110rem] xl:flex-1'
      return this.stacked ? '' : 'xl:max-w-[80rem] xl:flex-[1.1_1_0]'
    },
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
    // the board view enlarges everything on top of the chosen text size
    board(b) {
      document.documentElement.style.setProperty('--board-scale', b ? 1.2 : 1)
    },
    textScale: {
      immediate: true,
      handler(s) {
        document.documentElement.style.setProperty('--text-scale', s)
        store('textScale', s)
      },
    },
  },
  mounted() {
    window.addEventListener('hashchange', this.onHash)
    window.addEventListener('keydown', this.onKey)
  },
  beforeUnmount() {
    window.removeEventListener('hashchange', this.onHash)
    window.removeEventListener('keydown', this.onKey)
  },
  methods: {
    // a changed app/#<example-id> link loads that example without a reload
    onHash() {
      const ex = EXAMPLES.find((e) => e.id === location.hash.slice(1))
      if (ex && ex.id !== this.project.example) this.loadExample(ex)
    },
    setLocale,
    announce(text) {
      this.announcement = ''
      this.$nextTick(() => { this.announcement = text })
    },
    patchSim(changes) {
      this.remember(Object.keys(changes).sort().join())
      Object.assign(this.sim, changes)
    },
    // ---- undo / redo ---------------------------------------------------------------
    snapshot() {
      return JSON.stringify({ simulations: this.project.simulations, active: this.project.active })
    },
    // records the state before a change; quick changes of the same fields (typing,
    // dragging a node) are merged into one step
    remember(keys = '') {
      const h = this.history
      const now = Date.now()
      const merge = keys && keys === h.lastKeys && now - h.lastAt < 1200
      h.lastKeys = keys
      h.lastAt = now
      if (merge) return
      h.past.push(this.snapshot())
      if (h.past.length > 100) h.past.shift()
      h.future = []
    },
    restore(text) {
      const state = JSON.parse(text)
      this.project.simulations = state.simulations
      this.project.active = Math.min(state.active, state.simulations.length - 1)
      this.repeatChunk = this.sim.steps
      this.history.lastKeys = ''
      this.loadCount++
    },
    undo() {
      if (!this.history.past.length) return
      this.history.future.push(this.snapshot())
      this.restore(this.history.past.pop())
      this.announce(this.$t('app.undone'))
    },
    redo() {
      if (!this.history.future.length) return
      this.history.past.push(this.snapshot())
      this.restore(this.history.future.pop())
      this.announce(this.$t('app.redone'))
    },
    // Ctrl+Z / Ctrl+Y outside text fields (text fields keep their own undo)
    onKey(ev) {
      if (ev.key === 'Escape' && this.board && !document.querySelector('dialog[open]')) {
        this.leaveBoard()
        return
      }
      if (!(ev.ctrlKey || ev.metaKey) || ev.altKey) return
      const t = ev.target
      if (t.closest?.('input, textarea, select, [contenteditable="true"]')) return
      const key = ev.key.toLowerCase()
      if (key === 'z' && !ev.shiftKey) { ev.preventDefault(); this.undo() }
      else if (key === 'y' || (key === 'z' && ev.shiftKey)) { ev.preventDefault(); this.redo() }
    },
    // ---- loading and saving --------------------------------------------------
    startProject(project, view, tab) {
      this.history = { past: [], future: [], lastKeys: '', lastAt: 0 }
      this.project = project
      this.view = view
      this.modelTab = tab
      this.step = 'model'
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
        curveStyles: s.plot?.styles ?? {},
      }))
      const first = simulations[0]
      // use the graph settings stored in the file when it names curves; otherwise choose
      const stored = sims[0].plot
      const plot = stored?.y.length ? stored : defaultPlot(first.source, { caseSensitive: first.caseSensitive })
      // labels set with the legacy text tool, placed in data units of the stored results
      const range = (name) => {
        const values = sims[0].variables.find((v) => v.name === name)?.values ?? []
        let lo = Infinity
        let hi = -Infinity
        for (const v of values) if (Number.isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v) }
        return lo === Infinity ? [0, 1] : [lo, hi]
      }
      const [x0, x1] = range(plot.x)
      const [y0, y1] = plot.y.map(range).reduce(([a, b], [c, d]) => [Math.min(a, c), Math.max(b, d)], [Infinity, -Infinity])
      const page = sims[0].page ?? { labels: [], axes: null }
      const labels = page.labels.map((l, i) => ({
        id: i + 1, text: l.text, size: l.size, bold: l.bold,
        x: l.x ?? x0 + l.fx * (x1 - x0),
        y: l.y ?? (Number.isFinite(y0) ? y0 + l.fy * (y1 - y0) : 0),
      }))
      this.startProject({ title: file.replace(/\.prg$/i, ''), file, example: null, simulations, active: 0 },
        viewFor({ ...plot, styles: {} }, { labels, ...(page.axes && stored?.y.length ? { axes: { auto: false, ...page.axes } } : {}) }), 'program')
      this.announce(this.$t('app.modelOpened', { title: this.texts.title }))
    },
    newModel(kind = 'sentences') {
      const sim = kind === 'graph'
        ? cleanSimulation({ origin: 'graph', graph: { nodes: [], links: [] }, steps: 50 })
        : cleanSimulation({ origin: 'sentences', sentences: [{ subject: '', predicate: 'increase', object: '' }], steps: 50 })
      this.startProject({ title: '', file: '', example: null, simulations: [sim], active: 0 }, viewFor({ x: 'ZEIT', y: [] }), kind === 'graph' ? 'diagram' : 'sentences')
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
          s.origin === 'sentences' ? 'sentences' : s.origin === 'graph' ? 'diagram' : 'program')
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
      this.remember()
      const copy = JSON.parse(JSON.stringify(this.sim))
      copy.name = this.$t('sim.copyName', { name: this.simNames[this.project.active] })
      this.project.simulations.splice(this.project.active + 1, 0, copy)
      this.project.active += 1
      this.view.overlay = true
      this.announce(this.$t('sim.copied', { name: copy.name }))
    },
    removeSim() {
      if (this.project.simulations.length < 2) return
      this.remember()
      const name = this.simNames[this.project.active]
      this.project.simulations.splice(this.project.active, 1)
      this.project.active = Math.min(this.project.active, this.project.simulations.length - 1)
      this.announce(this.$t('sim.removed', { name }))
    },
    // the legacy "Weiterrechnen": the run is deterministic, so continuing equals more steps
    continueRun() {
      this.remember()
      this.sim.steps = Math.min(MAX_STEPS, this.sim.steps + this.continueBy)
      this.announce(this.$t('app.continued', { n: this.sim.steps }))
    },
    gotoProgram(line) {
      this.step = 'model'
      if (this.board === 'result') this.board = 'both'
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
          analysis: a.program.errors.length ? null : a,
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
      const legend = run.result && document.querySelector('#panel-chart svg[role="img"]')
        ? this.view.plotY.filter((y) => y !== this.view.plotX)
          .map((y) => {
            const look = curveStyle(this.view.plotY.indexOf(y), this.view.curveStyles?.[y], this.view.curveMode)
            return { label: run.result.display.get(y) ?? y, color: look.color, dash: look.dash }
          })
        : []
      this.report = {
        title: this.texts.title,
        topic: this.texts.topic,
        description: this.texts.description,
        sims,
        chartSvg: chart ? chart.outerHTML : '',
        legend,
        table,
      }
      this.$nextTick(() => {
        window.addEventListener('afterprint', () => { this.report = null }, { once: true })
        window.print()
      })
    },
    // ---- work steps and board view -------------------------------------------------
    stepKeys(ev) {
      const ids = this.steps.map((s) => s.id)
      const i = ids.indexOf(this.step)
      let j = i
      if (ev.key === 'ArrowRight') j = (i + 1) % ids.length
      else if (ev.key === 'ArrowLeft') j = (i - 1 + ids.length) % ids.length
      else if (ev.key === 'Home') j = 0
      else if (ev.key === 'End') j = ids.length - 1
      else return
      ev.preventDefault()
      this.step = ids[j]
      this.$nextTick(() => document.getElementById(`step-${ids[j]}`)?.focus())
    },
    toggleBoard(which) {
      if (this.board === which) {
        this.leaveBoard()
        return
      }
      this.board = which
      this.announce(this.$t('board.entered'))
    },
    leaveBoard() {
      this.board = null
      this.announce(this.$t('board.left'))
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
