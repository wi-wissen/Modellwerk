<template>
  <a href="#main" class="btn btn-primary sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50">{{ $t('app.skip') }}</a>

  <div class="flex min-h-screen flex-col">
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
          <button type="button" class="btn" @click="$refs.examples.showModal()"><BookOpen :size="18" aria-hidden="true" /> {{ $t('app.examples') }}</button>
        </nav>

        <div class="ml-auto flex items-center gap-1" role="group" :aria-label="$t('app.display')">
          <button type="button" class="btn btn-quiet" :aria-label="`${$t('app.language')}: ${otherLocale.name}`" :lang="otherLocale.code" @click="switchLocale">
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
        <label v-if="model.imported?.kind === 'project'" class="block">
          <span class="sr-only">{{ $t('app.modelTitle') }}</span>
          <input id="model-title" v-model="model.imported.title" :placeholder="$t('app.untitled')" autocomplete="off"
                 class="w-full rounded-lg border border-transparent bg-transparent px-1 -mx-1 text-2xl font-extrabold tracking-tight hover:border-line focus:border-accent sm:text-3xl" />
        </label>
        <h1 v-else class="text-2xl font-extrabold tracking-tight sm:text-3xl">{{ texts.title }}</h1>
        <p class="mt-1 text-muted">{{ texts.description }}</p>
        <p v-if="restored" class="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted" role="status">
          <History :size="16" aria-hidden="true" /> {{ $t('app.restored') }}
          <button type="button" class="btn-link font-semibold" @click="restored = false; loadExample(examples[0])">{{ $t('app.startOver') }}</button>
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

      <div class="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <!-- model -->
        <section class="panel flex min-w-0 flex-col gap-5 p-4 sm:p-5" aria-labelledby="model-heading">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h2 id="model-heading" class="flex items-center gap-2 text-xl font-bold"><span class="step">1</span> {{ $t('app.model') }}</h2>
            <div role="tablist" class="seg" :aria-label="$t('app.modelViews')" @keydown="tabKeys($event, modelTabs, 'modelTab')">
              <button v-for="t in modelTabs" :id="`tab-${t.id}`" :key="t.id" type="button" role="tab"
                      :aria-selected="modelTab === t.id" :aria-controls="`panel-${t.id}`" :tabindex="modelTab === t.id ? 0 : -1"
                      @click="modelTab = t.id">
                <component :is="t.icon" :size="18" aria-hidden="true" /> {{ $t(`app.tabs.${t.id}`) }}
              </button>
            </div>
          </div>

          <div :id="`panel-${modelTab}`" role="tabpanel" :aria-labelledby="`tab-${modelTab}`" class="flex flex-col gap-4">
            <template v-if="modelTab === 'sentences'">
              <div v-if="model.origin === 'program'" class="flex flex-col gap-3 rounded-xl border p-4"
                   :class="conversion.ok ? 'border-accent bg-accent-soft' : 'border-line bg-sunken'">
                <p v-if="!model.sentences.length" class="text-muted">{{ $t('app.writtenAsProgram') }}</p>
                <p v-if="conversion.ok">{{ $t('sentences.convertible') }}</p>
                <p v-else-if="conversion.line" class="text-muted">{{ $t('sentences.notConvertible', { line: conversion.line }) }}</p>
                <div v-if="conversion.ok">
                  <button type="button" class="btn btn-primary" @click="convertToSentences"><MessageSquareText :size="18" aria-hidden="true" /> {{ $t('sentences.convert') }}</button>
                </div>
              </div>
              <SentenceEditor v-if="model.sentences.length || model.origin === 'sentences'"
                              :sentences="model.sentences" :simplified="model.simplified" :out-of-sync="model.origin === 'program' && model.sentences.length > 0 && !conversion.ok"
                              @update:sentences="setSentences" @update:simplified="setSimplified" @resync="model.origin = 'sentences'" />
              <div v-if="model.origin === 'sentences' && model.sentences.length" class="rounded-xl bg-sunken p-3">
                <p class="eyebrow mb-1 flex items-center gap-1"><ArrowRight :size="14" aria-hidden="true" /> {{ $t('app.becomesProgram') }}</p>
                <pre class="overflow-x-auto font-mono text-sm leading-6">{{ source }}</pre>
              </div>
            </template>
            <ModelDiagram v-else-if="modelTab === 'diagram'" :analysis="analysis" @enlarge="$refs.diagram.showModal()" />
            <ProgramEditor v-else :model-value="source" :errors="analysis.program.errors" @update:model-value="setSource" />
          </div>

          <hr class="border-line" />
          <h2 class="flex items-center gap-2 text-xl font-bold"><span class="step">2</span> {{ $t('app.startValues') }}</h2>
          <StartValues :analysis="analysis" :values="model.start" :steps="model.steps" :reset-key="loadCount"
                       @update:values="model.start = $event" @update:steps="model.steps = $event" />
        </section>

        <!-- result -->
        <section class="panel flex min-w-0 flex-col gap-4 p-4 sm:p-5 xl:sticky xl:top-4" aria-labelledby="result-heading">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h2 id="result-heading" class="flex items-center gap-2 text-xl font-bold"><span class="step">3</span> {{ $t('app.result') }}</h2>
            <div role="tablist" class="seg" :aria-label="$t('app.resultViews')" @keydown="tabKeys($event, resultTabs, 'resultTab')">
              <button v-for="t in resultTabs" :id="`tab-${t.id}`" :key="t.id" type="button" role="tab"
                      :aria-selected="resultTab === t.id" :aria-controls="`panel-${t.id}`" :tabindex="resultTab === t.id ? 0 : -1"
                      @click="resultTab = t.id">
                <component :is="t.icon" :size="18" aria-hidden="true" /> {{ $t(`app.tabs.${t.id}`) }}
              </button>
            </div>
          </div>

          <div v-if="run.error" class="flex items-start gap-3 rounded-xl border border-bad bg-bad-soft p-4" role="alert">
            <TriangleAlert :size="22" aria-hidden="true" class="mt-0.5 flex-none text-bad" />
            <div>
              <p class="font-bold">{{ $t('app.cannotCompute') }}</p>
              <p>{{ run.error.line ? `${$t('app.lineN', { n: run.error.line })}: ` : '' }}{{ $errorText(run.error) }}</p>
              <button type="button" class="btn mt-2" @click="modelTab = 'program'"><Code :size="16" aria-hidden="true" /> {{ $t('app.toProgram') }}</button>
            </div>
          </div>

          <template v-else>
            <fieldset class="flex flex-col gap-3">
              <legend class="sr-only">{{ $t('app.axes') }}</legend>
              <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
                <label class="inline-flex items-center gap-2">
                  <span class="font-semibold">{{ $t(resultTab === 'chart' ? 'app.xAxis' : 'app.sortBy') }}</span>
                  <select id="plot-x" v-model="plotX" class="field !w-auto font-mono">
                    <option v-for="v in variableList" :key="v.name" :value="v.name">{{ v.label }}</option>
                  </select>
                </label>
                <span v-if="resultTab === 'chart' && plotX !== timeVar" class="chip role-constant">{{ $t('app.phase') }}</span>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-semibold">{{ $t(resultTab === 'chart' ? 'app.curves' : 'app.columns') }}:</span>
                <label v-for="v in variableList" :key="v.name" class="toggle">
                  <input :id="`plot-y-${v.name}`" v-model="plotY" type="checkbox" :value="v.name" />
                  <svg class="spark" viewBox="0 0 40 16" aria-hidden="true">
                    <polyline :points="sparkline(v.name)" fill="none" stroke-linecap="round" stroke-linejoin="round"
                              :stroke="plotY.includes(v.name) ? seriesColor(plotY.indexOf(v.name)) : 'var(--muted)'"
                              :stroke-width="plotY.includes(v.name) ? 2.4 : 1.4"
                              :stroke-dasharray="plotY.includes(v.name) ? seriesDash(plotY.indexOf(v.name)) : null"
                              :opacity="plotY.includes(v.name) ? 1 : 0.7" />
                  </svg>
                  <span class="font-mono font-semibold">{{ v.label }}</span>
                </label>
              </div>
            </fieldset>

            <div :id="`panel-${resultTab}`" role="tabpanel" :aria-labelledby="`tab-${resultTab}`">
              <ResultChart v-if="resultTab === 'chart'" :result="run.result" :x="plotX" :ys="plotY" />
              <ResultTable v-else :result="run.result" :columns="[plotX, ...plotY.filter((y) => y !== plotX)]" />
            </div>

            <div class="flex flex-wrap items-center justify-between gap-3">
              <p class="text-sm text-muted tabular">{{ $t('app.stats', { steps: model.steps, vars: variableList.length, ms: run.ms }) }}</p>
              <div class="flex flex-wrap gap-2">
                <button type="button" class="btn" @click="copyTable"><ClipboardCopy :size="18" aria-hidden="true" /> {{ $t('app.copyTable') }}</button>
                <button type="button" class="btn" @click="downloadCsv"><Download :size="18" aria-hidden="true" /> {{ $t('app.saveCsv') }}</button>
              </div>
            </div>
          </template>
        </section>
      </div>
    </main>

    <footer class="mt-6 border-t border-line bg-sheet">
      <div class="mx-auto grid max-w-[96rem] gap-6 px-4 py-6 text-sm sm:px-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div class="flex flex-col gap-2">
          <p class="flex items-center gap-2 font-bold"><img :src="logoUrl" width="22" height="22" alt="" /> Modellwerk</p>
          <p class="max-w-[46ch] text-muted">{{ $t('footer.about') }}</p>
          <p class="text-muted tabular">{{ $t('footer.version', { v: version }) }}</p>
        </div>
        <div class="flex flex-col gap-2">
          <h2 class="font-bold">{{ $t('footer.compatTitle') }}</h2>
          <p class="text-muted">{{ $t('footer.compatText') }}</p>
          <p><button type="button" class="btn-link font-semibold" @click="$refs.compare.show()">{{ $t('footer.compatButton') }}</button></p>
        </div>
        <div class="flex flex-col gap-2">
          <h2 class="font-bold">{{ $t('footer.privacyTitle') }}</h2>
          <p class="text-muted">{{ $t('footer.privacyText') }}</p>
          <label class="mt-1 inline-flex items-center gap-2">
            <span class="font-semibold">{{ $t('app.language') }}</span>
            <select id="footer-locale" class="field !w-auto" :value="$i18n.locale" @change="setLocale($event.target.value)">
              <option v-for="(l, code) in locales" :key="code" :value="code" :lang="code">{{ l.name }}</option>
            </select>
          </label>
        </div>
      </div>
    </footer>
  </div>

  <dialog ref="examples" class="m-auto w-[min(52rem,calc(100vw-2rem))] max-h-[calc(100vh-2rem)] rounded-2xl border border-line bg-sheet p-0 text-ink shadow-2xl backdrop:bg-black/50" aria-labelledby="examples-title">
    <div class="flex flex-col gap-4 p-5">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h2 id="examples-title" class="text-xl font-bold">{{ $t('app.examplesTitle') }}</h2>
          <p class="text-muted">{{ $t('app.examplesHint') }}</p>
        </div>
        <button type="button" class="btn btn-quiet" :aria-label="$t('app.close')" @click="$refs.examples.close()"><X :size="20" aria-hidden="true" /></button>
      </div>
      <ul class="grid gap-3 sm:grid-cols-2">
        <li v-for="ex in examples" :key="ex.id">
          <button type="button" class="flex h-full w-full flex-col items-start gap-1 rounded-xl border p-4 text-left hover:border-accent"
                  :class="model.id === ex.id ? 'is-selected' : 'border-line'"
                  :aria-current="model.id === ex.id ? 'true' : undefined" @click="loadExample(ex); $refs.examples.close()">
            <span class="eyebrow">{{ exampleText(ex, 'topic') }}</span>
            <span class="text-lg font-bold text-ink">{{ exampleText(ex, 'title') }}</span>
            <span class="text-sm text-muted">{{ exampleText(ex, 'description') }}</span>
            <span v-if="ex.sources?.length" class="text-xs text-muted">{{ $t('app.sourceShort', { publisher: ex.sources[0].publisher, n: ex.sources.length }) }}</span>
            <span class="mt-1 inline-flex items-center gap-1 text-sm font-semibold">
              <component :is="ex.mode === 'sentences' ? 'MessageSquareText' : 'Code'" :size="15" aria-hidden="true" />
              {{ $t(ex.mode === 'sentences' ? 'app.inSentences' : 'app.asProgram') }}
            </span>
          </button>
        </li>
      </ul>
    </div>
  </dialog>

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

  <CompareDialog ref="compare" @open-simulation="loadSimulation" />

  <p class="sr-only" aria-live="polite">{{ announcement }}</p>
</template>

<script>
import { AArrowDown, AArrowUp, ArrowRight, BookOpen, ChartLine, ClipboardCopy, Code, Download, FilePlus, FolderOpen, History, Save, Languages, MessageSquareText, Monitor, Moon, Sun, Table, TriangleAlert, Workflow, X } from 'lucide-vue-next'
import SentenceEditor from './components/SentenceEditor.vue'
import ProgramEditor from './components/ProgramEditor.vue'
import ModelDiagram from './components/ModelDiagram.vue'
import StartValues from './components/StartValues.vue'
import ResultChart from './components/ResultChart.vue'
import ResultTable from './components/ResultTable.vue'
import CompareDialog from './components/CompareDialog.vue'
import { analyse, programToSentences, sentencesToProgram } from './engine/model.js'
import { simulate } from './engine/simulate.js'
import { readPrg } from './engine/prg.js'
import { tableRows, toCsv, toTsv } from './engine/export.js'
import { PROJECT_EXTENSION, parseProject, projectToText, toProject } from './engine/project.js'
import { EXAMPLES } from './examples.js'
import { LOCALES, i18n, setLocale } from './i18n/index.js'
import { seriesColor, seriesDash, sparkPoints } from './chartStyle.js'
import logoUrl from './assets/logo.svg'
import { siteLink } from './site/links.js'
import pkg from '../package.json' with { type: 'json' }

const THEMES = ['system', 'light', 'dark']

function store(key, value) {
  try {
    if (value === undefined) return JSON.parse(localStorage.getItem(`modellwerk.${key}`))
    localStorage.setItem(`modellwerk.${key}`, JSON.stringify(value))
  } catch {
    return null
  }
}

function modelFromExample(ex) {
  return {
    id: ex.id,
    texts: ex.texts ?? null,
    imported: null,
    simplified: ex.simplified ?? true,
    sentences: ex.sentences ? ex.sentences.map((s) => ({ ...s })) : [],
    origin: ex.mode === 'sentences' ? 'sentences' : 'program',
    source: ex.source ?? '',
    start: { ...ex.start },
    steps: ex.steps,
    caseSensitive: false,
    timeName: 'Zeit',
    dtName: 'DeltaT',
  }
}

function modelFromProject(m, file = '') {
  return {
    ...modelFromExample({ id: null, mode: m.origin === 'sentences' ? 'sentences' : 'program', source: m.source, sentences: m.sentences, start: m.start, steps: m.steps, simplified: m.simplified }),
    imported: m.title || file ? { title: m.title, file, kind: 'project' } : null,
    caseSensitive: m.caseSensitive,
    timeName: m.timeName,
    dtName: m.dtName,
  }
}

export default {
  name: 'App',
  components: {
    AArrowDown, AArrowUp, ArrowRight, BookOpen, ChartLine, ClipboardCopy, Code, Download, FilePlus, FolderOpen, History, Save, Languages, MessageSquareText, Monitor, Moon, Sun, Table, TriangleAlert, Workflow, X,
    SentenceEditor, ProgramEditor, ModelDiagram, StartValues, ResultChart, ResultTable, CompareDialog,
  },
  data() {
    // deep link from the guide pages: app/#<example-id>; otherwise restore the last session
    const linked = EXAMPLES.find((e) => e.id === location.hash.slice(1))
    const first = linked ?? EXAMPLES[0]
    let saved = null
    if (!linked) {
      try { saved = parseProject(JSON.stringify(store('autosave'))) } catch { saved = null }
    }
    return {
      restored: Boolean(saved),
      logoUrl,
      version: pkg.version,
      // the standalone builds (desktop/mobile app, offline file) have no landing page
      homeHref: ['app', 'single'].includes(import.meta.env.MODE) ? null : siteLink('../'),
      locales: LOCALES,
      examples: EXAMPLES,
      model: saved ? modelFromProject(saved.model) : modelFromExample(first),
      loadCount: 0,
      modelTab: saved ? (saved.model.origin === 'sentences' ? 'sentences' : 'program') : first.mode === 'sentences' ? 'sentences' : 'program',
      resultTab: saved?.view.resultTab === 'table' ? 'table' : 'chart',
      plotX: saved?.view.plotX ?? first.plot.x,
      plotY: saved?.view.plotY ?? [...first.plot.y],
      theme: store('theme') ?? 'system',
      textScale: store('textScale') ?? 1,
      announcement: '',
      modelTabs: [
        { id: 'sentences', icon: 'MessageSquareText' },
        { id: 'diagram', icon: 'Workflow' },
        { id: 'program', icon: 'Code' },
      ],
      resultTabs: [
        { id: 'chart', icon: 'ChartLine' },
        { id: 'table', icon: 'Table' },
      ],
    }
  },
  computed: {
    texts() {
      const m = this.model
      if (m.imported) {
        const project = m.imported.kind === 'project'
        return {
          title: m.imported.title || (project ? this.$t('app.untitled') : this.$t('app.importedTitle')),
          topic: m.imported.file ? this.$t('app.importedFrom', { file: m.imported.file }) : this.$t('app.ownModel'),
          description: m.imported.error ? this.$t('app.openFailed', { message: m.imported.error })
            : project ? this.$t('app.projectDescription') : this.$t('app.importedDescription'),
        }
      }
      const ex = EXAMPLES.find((e) => e.id === m.id)
      return { title: this.exampleText(ex, 'title'), topic: this.exampleText(ex, 'topic'), description: this.exampleText(ex, 'description') }
    },
    currentExample() {
      return EXAMPLES.find((e) => e.id === this.model.id) ?? null
    },
    autosaveState() {
      return [this.model, this.plotX, this.plotY, this.resultTab]
    },
    otherLocale() {
      const code = i18n.locale === 'de' ? 'en' : 'de'
      return { code, name: LOCALES[code].name }
    },
    source() {
      if (this.model.origin === 'sentences') {
        return sentencesToProgram(this.model.sentences, { simplified: this.model.simplified, timeName: this.model.timeName, dtName: this.model.dtName })
      }
      return this.model.source
    },
    conversion() {
      return this.model.origin === 'program' ? programToSentences(this.model.source) : { ok: false, line: null }
    },
    analysis() {
      return analyse(this.source, { caseSensitive: this.model.caseSensitive })
    },
    variableList() {
      return [...this.analysis.program.variables].map(([name, label]) => ({ name, label, role: this.analysis.roles.get(name) }))
    },
    timeVar() {
      return this.variableList.find((v) => v.role === 'time')?.name ?? this.variableList[0]?.name
    },
    run() {
      const t0 = performance.now()
      try {
        const result = simulate(this.analysis.program, this.model.start, this.model.steps, { caseSensitive: this.model.caseSensitive })
        return { result, ms: Math.max(1, Math.round(performance.now() - t0)) }
      } catch (error) {
        return { error }
      }
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
      if (!names.has(this.plotX)) this.plotX = this.timeVar
      const ys = this.plotY.filter((n) => names.has(n))
      if (ys.length !== this.plotY.length) this.plotY = ys
    },
    theme: {
      immediate: true,
      handler(t) {
        if (t === 'system') delete document.documentElement.dataset.theme
        else document.documentElement.dataset.theme = t
        store('theme', t)
      },
    },
    textScale: {
      immediate: true,
      handler(s) {
        document.documentElement.style.setProperty('--text-scale', s)
        store('textScale', s)
      },
    },
  },
  methods: {
    seriesColor,
    seriesDash,
    setLocale,
    exampleText(ex, key) {
      if (!ex) return ''
      return ex.texts ? ex.texts[key][i18n.locale] ?? ex.texts[key].de : this.$t(`examples.${ex.id}.${key}`)
    },
    sparkline(name) {
      return sparkPoints(this.run.result?.series[name])
    },
    switchLocale() {
      setLocale(this.otherLocale.code)
    },
    loadExample(ex) {
      this.restored = false
      this.model = modelFromExample(ex)
      this.modelTab = ex.mode === 'sentences' ? 'sentences' : 'program'
      this.plotX = ex.plot.x
      this.plotY = [...ex.plot.y]
      this.loadCount++
      this.announcement = this.$t('app.exampleLoaded', { title: this.exampleText(ex, 'title') })
    },
    loadSimulation(sim, file = '') {
      const caseSensitive = sim.variables.some((v) => v.name !== v.name.toUpperCase())
      this.model = {
        ...modelFromExample({ id: null, mode: 'program', source: sim.source, start: {}, steps: sim.steps }),
        imported: { title: sim.name, file },
        start: Object.fromEntries(sim.variables.map((v) => [v.name, v.start])),
        caseSensitive,
      }
      this.modelTab = 'program'
      const vars = [...analyse(sim.source, { caseSensitive }).roles]
      this.plotX = vars.find(([, r]) => r === 'time')?.[0] ?? vars[0]?.[0]
      this.plotY = vars.filter(([, r]) => r === 'state').map(([n]) => n).slice(0, 4)
      this.loadCount++
      this.announcement = this.$t('app.modelOpened', { title: this.texts.title })
    },
    currentProject() {
      return toProject({ ...this.model, title: this.texts.title }, { plotX: this.plotX, plotY: this.plotY, resultTab: this.resultTab })
    },
    newModel() {
      this.model = modelFromProject({ title: '', origin: 'sentences', sentences: [{ subject: '', predicate: 'increase', object: '' }], source: '', start: {}, steps: 50, simplified: true, timeName: 'Zeit', dtName: 'DeltaT' })
      this.model.imported = { title: '', file: '', kind: 'project' }
      this.modelTab = 'sentences'
      this.plotX = 'ZEIT'
      this.plotY = []
      this.restored = false
      this.loadCount++
      this.announcement = this.$t('app.newModel')
    },
    saveProject() {
      const blob = new Blob([projectToText(this.currentProject())], { type: 'application/json' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `${this.texts.title.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'modell'}${PROJECT_EXTENSION}`
      link.click()
      setTimeout(() => URL.revokeObjectURL(link.href), 1000)
      this.announcement = this.$t('app.saved')
    },
    async openFile(ev) {
      const file = ev.target.files[0]
      ev.target.value = ''
      if (!file) return
      if (!/\.prg$/i.test(file.name)) {
        try {
          const project = parseProject(await file.text())
          this.model = modelFromProject(project.model, file.name)
          this.modelTab = project.model.origin === 'sentences' ? 'sentences' : 'program'
          this.plotX = project.view.plotX ?? 'ZEIT'
          this.plotY = project.view.plotY ?? []
          this.restored = false
          this.loadCount++
          this.announcement = this.$t('app.modelOpened', { title: this.texts.title })
        } catch (e) {
          const message = e.code ? this.$t(`app.${e.code}`) : e.message
          this.model = { ...this.model, imported: { title: file.name, file: file.name, error: message } }
          this.announcement = this.$t('app.openFailed', { message })
        }
        return
      }
      try {
        const sims = readPrg(new Uint8Array(await file.arrayBuffer()))
        if (!sims.length) throw new Error(this.$t('app.noModelInFile'))
        this.loadSimulation(sims[0], file.name)
      } catch (e) {
        const message = e.code ? this.$t(`app.${e.code}`) : e.message
        this.model = { ...this.model, imported: { title: file.name, file: file.name, error: message } }
        this.announcement = this.$t('app.openFailed', { message })
      }
    },
    exportData() {
      const columns = [this.plotX, ...this.plotY.filter((y) => y !== this.plotX)]
      const display = this.run.result.display
      return { header: [this.$t('table.step'), ...columns.map((c) => display.get(c) ?? c)], rows: tableRows(this.run.result, columns) }
    },
    downloadCsv() {
      const { header, rows } = this.exportData()
      const blob = new Blob([toCsv(header, rows, i18n.locale)], { type: 'text/csv;charset=utf-8' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `${this.texts.title.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'modellwerk'}.csv`
      link.click()
      setTimeout(() => URL.revokeObjectURL(link.href), 1000)
      this.announcement = this.$t('app.csvSaved')
    },
    async copyTable() {
      const { header, rows } = this.exportData()
      try {
        await navigator.clipboard.writeText(toTsv(header, rows, i18n.locale))
        this.announcement = this.$t('app.tableCopied')
      } catch {
        this.announcement = this.$t('app.copyFailed')
      }
    },
    convertToSentences() {
      const c = this.conversion
      if (!c.ok) return
      Object.assign(this.model, { sentences: c.sentences, simplified: c.simplified, timeName: c.timeName, dtName: c.dtName, origin: 'sentences' })
      this.announcement = this.$t('sentences.converted')
    },
    setSentences(s) {
      this.model.sentences = s
      this.model.origin = 'sentences'
    },
    setSimplified(v) {
      this.model.simplified = v
      this.model.origin = 'sentences'
    },
    setSource(text) {
      this.model.origin = 'program'
      this.model.source = text
    },
    cycleTheme() {
      this.theme = THEMES[(THEMES.indexOf(this.theme) + 1) % THEMES.length]
      this.announcement = this.$t(`app.theme.${this.theme}`)
    },
    setScale(d) {
      const steps = [0.875, 1, 1.125, 1.25, 1.5]
      const i = steps.indexOf(this.textScale)
      this.textScale = steps[Math.min(steps.length - 1, Math.max(0, (i < 0 ? 1 : i) + d))]
    },
    tabKeys(ev, tabs, key) {
      const i = tabs.findIndex((t) => t.id === this[key])
      let j = i
      if (ev.key === 'ArrowRight') j = (i + 1) % tabs.length
      else if (ev.key === 'ArrowLeft') j = (i - 1 + tabs.length) % tabs.length
      else if (ev.key === 'Home') j = 0
      else if (ev.key === 'End') j = tabs.length - 1
      else return
      ev.preventDefault()
      this[key] = tabs[j].id
      this.$nextTick(() => document.getElementById(`tab-${tabs[j].id}`)?.focus())
    },
  },
}
</script>
