<template>
  <section class="panel flex min-w-0 flex-col gap-5 p-4 sm:p-5" aria-labelledby="model-heading">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 id="model-heading" class="flex items-center gap-2 text-xl font-bold"><span class="step">1</span> {{ $t('app.model') }}</h2>
      <div role="tablist" class="seg" :aria-label="$t('app.modelViews')" @keydown="tabKeys">
        <button v-for="t in tabs" :id="`tab-${t.id}`" :key="t.id" type="button" role="tab"
                :aria-selected="tab === t.id" :aria-controls="`panel-${t.id}`" :tabindex="tab === t.id ? 0 : -1"
                @click="$emit('update:tab', t.id)">
          <component :is="t.icon" :size="18" aria-hidden="true" /> {{ $t(`app.tabs.${t.id}`) }}
        </button>
      </div>
    </div>

    <div :id="`panel-${tab}`" role="tabpanel" :aria-labelledby="`tab-${tab}`" class="flex flex-col gap-4">
      <template v-if="tab === 'sentences'">
        <div v-if="sim.origin !== 'sentences' && conversion.ok" class="flex flex-col gap-3 rounded-xl border border-accent bg-accent-soft p-4">
          <p>{{ $t('sentences.convertible') }}</p>
          <div>
            <button type="button" class="btn btn-primary" @click="convert"><MessageSquareText :size="18" aria-hidden="true" /> {{ $t('sentences.convert') }}</button>
          </div>
        </div>
        <div v-else-if="sim.origin !== 'sentences'" class="flex flex-col gap-3 rounded-xl border border-line bg-sunken p-4" role="note">
          <p class="flex items-center gap-2 font-bold"><Info :size="18" aria-hidden="true" class="text-accent" /> {{ $t('sentences.onlyProgram') }}</p>
          <p v-if="conversion.reason">{{ $t(`sentences.reasons.${conversion.reason}`) }}</p>
          <figure v-if="conversion.line" class="flex flex-col gap-1">
            <figcaption class="text-sm font-semibold text-muted">{{ $t('app.lineN', { n: conversion.line }) }}</figcaption>
            <code class="block overflow-x-auto rounded-lg border border-line bg-sheet px-3 py-2 font-mono text-[0.95rem] whitespace-pre">{{ sourceLine(conversion.line) }}</code>
          </figure>
          <div class="flex flex-wrap gap-2">
            <button v-if="conversion.line" type="button" class="btn" @click="gotoLine(conversion.line)"><Code :size="18" aria-hidden="true" /> {{ $t('sentences.showLine') }}</button>
            <button type="button" class="btn" @click="$emit('new-model')"><FilePlus :size="18" aria-hidden="true" /> {{ $t('sentences.startNew') }}</button>
          </div>
        </div>
        <SentenceEditor v-if="sim.origin === 'sentences'"
                        :sentences="sim.sentences" :simplified="sim.simplified"
                        @update:sentences="patch({ sentences: $event, origin: 'sentences' })"
                        @update:simplified="patch({ simplified: $event, origin: 'sentences' })" />
        <div v-if="sim.origin === 'sentences' && sim.sentences.length" class="rounded-xl bg-sunken p-3">
          <p class="eyebrow mb-1 flex items-center gap-1"><ArrowRight :size="14" aria-hidden="true" /> {{ $t('app.becomesProgram') }}</p>
          <pre class="overflow-x-auto font-mono text-sm leading-6">{{ source }}</pre>
        </div>
      </template>

      <slot v-else-if="tab === 'diagram'" name="diagram" />

      <template v-else>
        <ProgramEditor ref="program" :model-value="source" :errors="analysis.program.errors" @update:model-value="patch({ source: $event, origin: 'program' })" />
        <MacroEditor :macros="sim.macros" @update:macros="patch({ macros: $event })" @expand="expandMacro" @from-selection="macroFromSelection" />
      </template>
    </div>

    <hr class="border-line" />
    <h2 class="flex items-center gap-2 text-xl font-bold"><span class="step">2</span> {{ $t('app.startValues') }}</h2>
    <StartValues :analysis="analysis" :values="sim.start" :steps="sim.steps" :reset-key="resetKey"
                 @update:values="patch({ start: $event })" @update:steps="patch({ steps: $event })" />

    <div v-if="usesRandom" class="flex flex-wrap items-end gap-3 rounded-xl bg-sunken p-3">
      <label class="flex flex-col gap-1">
        <span class="font-semibold">{{ $t('random.seed') }}</span>
        <input id="random-seed" class="field !w-40 tabular font-mono" inputmode="numeric" autocomplete="off" :value="sim.seed"
               @input="setSeed($event.target.value)" />
      </label>
      <button type="button" class="btn" @click="patch({ seed: newSeed() })"><Dices :size="18" aria-hidden="true" /> {{ $t('random.reroll') }}</button>
      <p class="max-w-[48ch] text-sm text-muted">{{ $t('random.hint') }}</p>
    </div>
  </section>
</template>

<script>
import { ArrowRight, Code, Dices, FilePlus, Info, MessageSquareText, Workflow } from 'lucide-vue-next'
import SentenceEditor from './SentenceEditor.vue'
import ProgramEditor from './ProgramEditor.vue'
import StartValues from './StartValues.vue'
import MacroEditor from './MacroEditor.vue'

export default {
  name: 'ModelPanel',
  components: { ArrowRight, Code, Dices, FilePlus, Info, MessageSquareText, Workflow, SentenceEditor, ProgramEditor, StartValues, MacroEditor },
  props: {
    sim: { type: Object, required: true },
    source: { type: String, required: true },
    analysis: { type: Object, required: true },
    conversion: { type: Object, required: true },
    tab: { type: String, required: true },
    resetKey: { type: [String, Number], default: 0 },
  },
  emits: ['patch', 'update:tab', 'new-model', 'announce'],
  data() {
    return {
      tabs: [
        { id: 'sentences', icon: 'MessageSquareText' },
        { id: 'diagram', icon: 'Workflow' },
        { id: 'program', icon: 'Code' },
      ],
    }
  },
  computed: {
    usesRandom() {
      return /\brandom\s*\(/i.test(this.source) || this.sim.macros.some((m) => /\brandom\s*\(/i.test(m.body))
    },
  },
  methods: {
    patch(changes) {
      this.$emit('patch', changes)
    },
    tabKeys(ev) {
      const i = this.tabs.findIndex((t) => t.id === this.tab)
      let j = i
      if (ev.key === 'ArrowRight') j = (i + 1) % this.tabs.length
      else if (ev.key === 'ArrowLeft') j = (i - 1 + this.tabs.length) % this.tabs.length
      else if (ev.key === 'Home') j = 0
      else if (ev.key === 'End') j = this.tabs.length - 1
      else return
      ev.preventDefault()
      this.$emit('update:tab', this.tabs[j].id)
      this.$nextTick(() => document.getElementById(`tab-${this.tabs[j].id}`)?.focus())
    },
    sourceLine(n) {
      return this.source.split('\n')[n - 1] ?? ''
    },
    gotoLine(n) {
      this.$emit('update:tab', 'program')
      this.$nextTick(() => this.$refs.program?.goto(n))
    },
    convert() {
      const c = this.conversion
      if (!c.ok) return
      this.patch({ sentences: c.sentences, simplified: c.simplified, timeName: c.timeName, dtName: c.dtName, origin: 'sentences' })
      this.$emit('announce', this.$t('sentences.converted'))
    },
    newSeed() {
      return Math.floor(Math.random() * 2 ** 31)
    },
    setSeed(raw) {
      const n = Number(raw)
      if (Number.isInteger(n) && n >= 0 && n < 2 ** 32) this.patch({ seed: n })
    },
    // replaces each line that only calls the macro by the macro's lines
    expandMacro(name) {
      const macro = this.sim.macros.find((m) => m.name === name)
      if (!macro) return
      const call = new RegExp(`^\\s*${name}\\s*(//.*)?$`, this.sim.caseSensitive ? '' : 'i')
      const lines = this.source.split('\n').flatMap((line) => (call.test(line) ? macro.body.split('\n') : [line]))
      this.patch({ source: lines.join('\n'), origin: 'program' })
      this.$emit('announce', this.$t('macros.expanded', { name }))
    },
    // turns the selected program lines into a new macro and calls it instead
    macroFromSelection() {
      const sel = this.$refs.program?.selection()
      if (!sel || !sel.text.trim()) {
        this.$emit('announce', this.$t('macros.selectFirst'))
        return
      }
      const used = new Set(this.sim.macros.map((m) => m.name.toUpperCase()))
      let n = this.sim.macros.length + 1
      while (used.has(this.$t('macros.defaultName', { n }).toUpperCase())) n++
      const name = this.$t('macros.defaultName', { n })
      // extend the selection to whole lines
      const start = this.source.lastIndexOf('\n', sel.start - 1) + 1
      const endBreak = this.source.indexOf('\n', sel.end - (sel.text.endsWith('\n') ? 1 : 0))
      const end = endBreak === -1 ? this.source.length : endBreak
      const body = this.source.slice(start, end)
      const source = this.source.slice(0, start) + name + this.source.slice(end)
      this.patch({ source, origin: 'program', macros: [...this.sim.macros, { name, body }] })
      this.$emit('announce', this.$t('macros.created', { name }))
    },
  },
}
</script>
