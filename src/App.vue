<template>
  <a href="#main" class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 btn btn-primary">Zum Inhalt springen</a>

  <div class="flex min-h-full flex-col">
    <header class="border-b border-line bg-sheet">
      <div class="mx-auto flex max-w-[96rem] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
        <div class="flex items-center gap-3">
          <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
            <rect x="1" y="1" width="32" height="32" rx="9" fill="var(--accent)" />
            <path d="M7 24 C 12 24, 13 10, 18 10 S 24 20, 27 12" fill="none" stroke="var(--accent-ink)" stroke-width="2.6" stroke-linecap="round" />
            <circle cx="27" cy="12" r="2.6" fill="var(--accent-ink)" />
          </svg>
          <div class="leading-tight">
            <p class="text-lg font-extrabold tracking-tight">Modellwerk</p>
            <p class="text-xs text-muted">Modellbildung &amp; Simulation</p>
          </div>
        </div>

        <nav class="order-3 flex basis-full flex-wrap items-center gap-2 lg:order-none lg:basis-auto lg:flex-1" aria-label="Datei und Werkzeuge">
          <button type="button" class="btn" @click="$refs.examples.showModal()"><BookOpen :size="18" aria-hidden="true" /> Beispiele</button>
          <label class="btn cursor-pointer">
            <FolderOpen :size="18" aria-hidden="true" /> Moebius-Datei öffnen
            <input id="open-prg" type="file" accept=".prg,.PRG" class="sr-only" @change="openPrg($event)" />
          </label>
          <button type="button" class="btn" @click="$refs.verify.show()"><ShieldCheck :size="18" aria-hidden="true" /> Mit Original vergleichen</button>
        </nav>

        <div class="ml-auto flex items-center gap-1" role="group" aria-label="Darstellung">
          <button type="button" class="btn btn-quiet" title="Schrift kleiner" aria-label="Schrift kleiner" @click="setScale(-1)"><AArrowDown :size="20" aria-hidden="true" /></button>
          <button type="button" class="btn btn-quiet" title="Schrift größer" aria-label="Schrift größer" @click="setScale(1)"><AArrowUp :size="20" aria-hidden="true" /></button>
          <button type="button" class="btn btn-quiet" :title="themeLabel" :aria-label="themeLabel" @click="cycleTheme">
            <Sun v-if="theme === 'light'" :size="20" aria-hidden="true" /><Moon v-else-if="theme === 'dark'" :size="20" aria-hidden="true" /><Monitor v-else :size="20" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>

    <main id="main" class="mx-auto flex w-full max-w-[96rem] flex-1 flex-col gap-5 px-4 py-5 sm:px-6">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div class="min-w-0 max-w-[70ch]">
          <p class="eyebrow">{{ model.topic }}</p>
          <h1 class="text-2xl font-extrabold tracking-tight sm:text-3xl">{{ model.title }}</h1>
          <p class="mt-1 text-muted">{{ model.description }}</p>
        </div>
        <p class="chip role-time !text-sm" role="status">
          <Sigma :size="15" aria-hidden="true" /> rechnet wie Moebius 3.0 – bitgenau geprüft
        </p>
      </div>

      <div class="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <!-- Modell -->
        <section class="panel flex min-w-0 flex-col gap-5 p-4 sm:p-5" aria-labelledby="model-heading">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h2 id="model-heading" class="flex items-center gap-2 text-xl font-bold"><span class="step">1</span> Modell</h2>
            <div role="tablist" aria-label="Darstellung des Modells" class="flex flex-wrap gap-1 rounded-xl bg-sunken p-1" @keydown="tabKeys($event, modelTabs, 'modelTab')">
              <button v-for="t in modelTabs" :id="`tab-${t.id}`" :key="t.id" type="button" role="tab" class="btn !border-transparent"
                      :aria-selected="modelTab === t.id" :aria-controls="`panel-${t.id}`" :tabindex="modelTab === t.id ? 0 : -1"
                      @click="modelTab = t.id">
                <component :is="t.icon" :size="18" aria-hidden="true" /> {{ t.label }}
              </button>
            </div>
          </div>

          <div :id="`panel-${modelTab}`" role="tabpanel" :aria-labelledby="`tab-${modelTab}`">
            <SentenceEditor v-if="modelTab === 'sentences'"
                            :sentences="model.sentences" :simplified="model.simplified" :out-of-sync="model.origin === 'program' && model.sentences.length > 0"
                            @update:sentences="setSentences" @update:simplified="setSimplified" @resync="model.origin = 'sentences'" />
            <ModelDiagram v-else-if="modelTab === 'diagram'" :analysis="analysis" />
            <ProgramEditor v-else :model-value="source" :errors="analysis.program.errors" @update:model-value="setSource" />
          </div>

          <div v-if="modelTab === 'sentences' && model.sentences.length" class="rounded-xl bg-sunken p-3">
            <p class="eyebrow mb-1 flex items-center gap-1"><ArrowRight :size="14" aria-hidden="true" /> Daraus wird dieses Programm</p>
            <pre class="overflow-x-auto font-mono text-sm leading-6">{{ source }}</pre>
          </div>
          <p v-if="modelTab === 'sentences' && !model.sentences.length" class="rounded-xl bg-sunken p-3 text-muted">
            Dieses Modell wurde direkt als Programm geschrieben. Du kannst es unter „Programm“ ansehen oder hier mit Sätzen neu beginnen.
          </p>

          <hr class="border-line" />
          <div class="flex items-center gap-2"><span class="step">2</span><span class="text-xl font-bold">Startwerte</span></div>
          <StartValues :analysis="analysis" :values="model.start" :steps="model.steps" :reset-key="loadCount"
                       @update:values="model.start = $event" @update:steps="model.steps = $event" />
        </section>

        <!-- Ergebnis -->
        <section class="panel flex min-w-0 flex-col gap-4 p-4 sm:p-5 xl:sticky xl:top-4" aria-labelledby="result-heading">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h2 id="result-heading" class="flex items-center gap-2 text-xl font-bold"><span class="step">3</span> Ergebnis</h2>
            <div role="tablist" aria-label="Darstellung des Ergebnisses" class="flex gap-1 rounded-xl bg-sunken p-1" @keydown="tabKeys($event, resultTabs, 'resultTab')">
              <button v-for="t in resultTabs" :id="`tab-${t.id}`" :key="t.id" type="button" role="tab" class="btn !border-transparent"
                      :aria-selected="resultTab === t.id" :aria-controls="`panel-${t.id}`" :tabindex="resultTab === t.id ? 0 : -1"
                      @click="resultTab = t.id">
                <component :is="t.icon" :size="18" aria-hidden="true" /> {{ t.label }}
              </button>
            </div>
          </div>

          <div v-if="run.error" class="flex items-start gap-3 rounded-xl border border-bad bg-bad-soft p-4" role="alert">
            <TriangleAlert :size="22" aria-hidden="true" class="mt-0.5 flex-none text-bad" />
            <div>
              <p class="font-bold">Das Modell kann noch nicht berechnet werden.</p>
              <p>{{ run.error.line ? `Zeile ${run.error.line}: ` : '' }}{{ run.error.message }}</p>
              <button type="button" class="btn mt-2" @click="modelTab = 'program'"><Code :size="16" aria-hidden="true" /> Zum Programm</button>
            </div>
          </div>

          <template v-else>
            <fieldset class="flex flex-col gap-3">
              <legend class="sr-only">Achsen wählen</legend>
              <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
                <label class="inline-flex items-center gap-2">
                  <span class="font-semibold">{{ resultTab === 'chart' ? 'Waagrechte Achse' : 'Sortiert nach' }}</span>
                  <select id="plot-x" v-model="plotX" class="field !w-auto font-mono">
                    <option v-for="v in variableList" :key="v.name" :value="v.name">{{ v.label }}</option>
                  </select>
                </label>
                <span v-if="resultTab === 'chart' && plotX !== timeVar" class="chip role-constant">Phasendiagramm</span>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-semibold">{{ resultTab === 'chart' ? 'Kurven' : 'Spalten' }}:</span>
                <label v-for="v in variableList" :key="v.name" :class="`role-${v.role}`"
                       class="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-sm has-[:checked]:border-[var(--role)] has-[:checked]:bg-[var(--role-soft)]">
                  <input :id="`plot-y-${v.name}`" v-model="plotY" type="checkbox" :value="v.name" class="size-4 accent-[var(--role)]" />
                  <span class="font-mono font-semibold">{{ v.label }}</span>
                </label>
              </div>
            </fieldset>

            <div :id="`panel-${resultTab}`" role="tabpanel" :aria-labelledby="`tab-${resultTab}`">
              <ResultChart v-if="resultTab === 'chart'" :result="run.result" :x="plotX" :ys="plotY" />
              <ResultTable v-else :result="run.result" :columns="[plotX, ...plotY.filter((y) => y !== plotX)]" />
            </div>

            <p class="text-sm text-muted tabular">
              {{ model.steps }} Schritte · {{ variableList.length }} Größen · berechnet in {{ run.ms }} ms
            </p>
          </template>
        </section>
      </div>
    </main>

    <footer class="border-t border-line px-4 py-4 text-center text-sm text-muted sm:px-6">
      Modellwerk – Mockup einer Neuentwicklung. Rechenkern geprüft gegen die mitgelieferten Ergebnisse von Moebius 3.0 (Detlef Hoche).
    </footer>
  </div>

  <dialog ref="examples" class="m-auto w-[min(52rem,calc(100vw-2rem))] max-h-[calc(100vh-2rem)] rounded-2xl border border-line bg-sheet p-0 text-ink shadow-2xl backdrop:bg-black/50" aria-labelledby="examples-title">
    <div class="flex flex-col gap-4 p-5">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h2 id="examples-title" class="text-xl font-bold">Beispiel öffnen</h2>
          <p class="text-muted">Jedes Beispiel lässt sich frei verändern.</p>
        </div>
        <button type="button" class="btn btn-quiet" aria-label="Schließen" @click="$refs.examples.close()"><X :size="20" aria-hidden="true" /></button>
      </div>
      <ul class="grid gap-3 sm:grid-cols-2">
        <li v-for="ex in examples" :key="ex.id">
          <button type="button" class="flex h-full w-full flex-col items-start gap-1 rounded-xl border border-line p-4 text-left hover:border-accent hover:bg-accent-soft"
                  :aria-current="model.id === ex.id ? 'true' : undefined" @click="loadExample(ex); $refs.examples.close()">
            <span class="eyebrow">{{ ex.topic }}</span>
            <span class="text-lg font-bold">{{ ex.title }}</span>
            <span class="text-sm text-muted">{{ ex.description }}</span>
            <span class="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-accent">
              <component :is="ex.mode === 'sentences' ? 'MessageSquareText' : 'Code'" :size="15" aria-hidden="true" />
              {{ ex.mode === 'sentences' ? 'in Sätzen beschrieben' : 'als Programm geschrieben' }}
            </span>
          </button>
        </li>
      </ul>
    </div>
  </dialog>

  <VerifyDialog ref="verify" @open-simulation="loadSimulation" />

  <p class="sr-only" aria-live="polite">{{ announcement }}</p>
</template>

<script>
import { AArrowDown, AArrowUp, ArrowRight, BookOpen, ChartLine, Code, FolderOpen, MessageSquareText, Monitor, Moon, ShieldCheck, Sigma, Sun, Table, TriangleAlert, Workflow, X } from 'lucide-vue-next'
import SentenceEditor from './components/SentenceEditor.vue'
import ProgramEditor from './components/ProgramEditor.vue'
import ModelDiagram from './components/ModelDiagram.vue'
import StartValues from './components/StartValues.vue'
import ResultChart from './components/ResultChart.vue'
import ResultTable from './components/ResultTable.vue'
import VerifyDialog from './components/VerifyDialog.vue'
import { analyse, sentencesToProgram } from './engine/model.js'
import { simulate } from './engine/simulate.js'
import { readPrg } from './engine/prg.js'
import { EXAMPLES } from './examples.js'

const THEMES = ['system', 'light', 'dark']

function modelFromExample(ex) {
  return {
    id: ex.id,
    title: ex.title,
    topic: ex.topic,
    description: ex.description,
    simplified: ex.simplified ?? true,
    sentences: ex.sentences ? ex.sentences.map((s) => ({ ...s })) : [],
    origin: ex.mode === 'sentences' ? 'sentences' : 'program',
    source: ex.source ?? '',
    start: { ...ex.start },
    steps: ex.steps,
    caseSensitive: false,
  }
}

function store(key, value) {
  try {
    if (value === undefined) return JSON.parse(localStorage.getItem(`modellwerk.${key}`))
    localStorage.setItem(`modellwerk.${key}`, JSON.stringify(value))
  } catch {
    return null
  }
}

export default {
  name: 'App',
  components: {
    AArrowDown, AArrowUp, ArrowRight, BookOpen, ChartLine, Code, FolderOpen, MessageSquareText, Monitor, Moon, ShieldCheck, Sigma, Sun, Table, TriangleAlert, Workflow, X,
    SentenceEditor, ProgramEditor, ModelDiagram, StartValues, ResultChart, ResultTable, VerifyDialog,
  },
  data() {
    return {
      examples: EXAMPLES,
      model: modelFromExample(EXAMPLES[0]),
      loadCount: 0,
      modelTab: EXAMPLES[0].mode === 'sentences' ? 'sentences' : 'program',
      resultTab: 'chart',
      plotX: EXAMPLES[0].plot.x,
      plotY: [...EXAMPLES[0].plot.y],
      theme: store('theme') ?? 'system',
      textScale: store('textScale') ?? 1,
      announcement: '',
      modelTabs: [
        { id: 'sentences', label: 'Sätze', icon: 'MessageSquareText' },
        { id: 'diagram', label: 'Diagramm', icon: 'Workflow' },
        { id: 'program', label: 'Programm', icon: 'Code' },
      ],
      resultTabs: [
        { id: 'chart', label: 'Schaubild', icon: 'ChartLine' },
        { id: 'table', label: 'Tabelle', icon: 'Table' },
      ],
    }
  },
  computed: {
    source() {
      if (this.model.origin === 'sentences') return sentencesToProgram(this.model.sentences, { simplified: this.model.simplified })
      return this.model.source
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
    themeLabel() {
      return { system: 'Farben: wie das System', light: 'Farben: hell', dark: 'Farben: dunkel' }[this.theme]
    },
  },
  watch: {
    variableList(list) {
      const names = new Set(list.map((v) => v.name))
      if (!names.has(this.plotX)) this.plotX = this.timeVar
      const ys = this.plotY.filter((n) => names.has(n))
      if (ys.length !== this.plotY.length) this.plotY = ys
    },
    theme: { immediate: true, handler(t) {
      if (t === 'system') delete document.documentElement.dataset.theme
      else document.documentElement.dataset.theme = t
      store('theme', t)
    } },
    textScale: { immediate: true, handler(s) {
      document.documentElement.style.setProperty('--text-scale', s)
      store('textScale', s)
    } },
  },
  methods: {
    loadExample(ex) {
      this.model = modelFromExample(ex)
      this.modelTab = ex.mode === 'sentences' ? 'sentences' : 'program'
      this.plotX = ex.plot.x
      this.plotY = [...ex.plot.y]
      this.loadCount++
      this.announcement = `Beispiel „${ex.title}“ geladen.`
    },
    loadSimulation(sim, fileName = '') {
      const caseSensitive = sim.variables.some((v) => v.name !== v.name.toUpperCase())
      this.model = {
        id: null,
        title: sim.name || fileName || 'Importiertes Modell',
        topic: `Aus Moebius-Datei${fileName ? ` „${fileName}“` : ''}`,
        description: 'Programm, Startwerte und Schrittzahl wurden aus der Originaldatei übernommen.',
        simplified: true,
        sentences: [],
        origin: 'program',
        source: sim.source,
        start: Object.fromEntries(sim.variables.map((v) => [v.name, v.start])),
        steps: sim.steps,
        caseSensitive,
      }
      this.modelTab = 'program'
      const a = analyse(sim.source, { caseSensitive })
      const vars = [...a.roles]
      this.plotX = vars.find(([, r]) => r === 'time')?.[0] ?? vars[0]?.[0]
      this.plotY = vars.filter(([, r]) => r === 'state').map(([n]) => n).slice(0, 4)
      this.loadCount++
      this.announcement = `Modell „${this.model.title}“ geöffnet.`
    },
    async openPrg(ev) {
      const file = ev.target.files[0]
      ev.target.value = ''
      if (!file) return
      try {
        const sims = readPrg(new Uint8Array(await file.arrayBuffer()))
        if (!sims.length) throw new Error('In dieser Datei wurde kein Modell mit gespeicherten Werten gefunden.')
        this.loadSimulation(sims[0], file.name)
      } catch (e) {
        this.announcement = e.message
        window.setTimeout(() => { this.announcement = '' }, 8000)
        this.model = { ...this.model, description: `Öffnen fehlgeschlagen: ${e.message}` }
      }
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
      if (this.model.origin === 'sentences') this.model.origin = 'program'
      this.model.source = text
    },
    cycleTheme() {
      this.theme = THEMES[(THEMES.indexOf(this.theme) + 1) % THEMES.length]
      this.announcement = this.themeLabel
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

<style>
.step {
  display: inline-grid; place-items: center; width: 1.75rem; height: 1.75rem; border-radius: 999px;
  background: var(--accent); color: var(--accent-ink); font-size: 0.95rem; font-weight: 800;
}
</style>
