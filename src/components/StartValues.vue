<template>
  <section aria-labelledby="start-title" class="flex flex-col gap-3">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <p id="start-title" class="text-muted text-[0.95rem]">Womit beginnt die Simulation? Komma oder Punkt sind erlaubt, z. B. <span class="font-mono">0,5</span> oder <span class="font-mono">1,6E-19</span>.</p>
      <label class="flex items-center gap-2">
        <span class="font-semibold">Wiederhole</span>
        <input id="steps" type="number" min="1" :max="maxSteps" class="field w-24 tabular" :value="steps"
               aria-describedby="steps-hint" @input="onSteps($event.target.value)" />
        <span class="font-semibold">mal</span>
        <span id="steps-hint" class="sr-only">Anzahl der Zeitschritte, höchstens {{ maxSteps }}</span>
      </label>
    </div>

    <component :is="group.collapsed ? 'details' : 'div'" v-for="group in groups" :key="group.role" class="flex flex-col gap-2">
      <component :is="group.collapsed ? 'summary' : 'h4'" class="eyebrow" :class="{ 'cursor-pointer': group.collapsed }">{{ group.title }}</component>
      <div class="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(12.5rem,1fr))]">
        <label v-for="v in group.items" :key="v.name" :class="`role-${v.role}`"
               class="flex min-w-0 flex-col gap-1 rounded-lg border border-line bg-sheet p-2">
          <span class="flex min-w-0 items-center justify-between gap-2">
            <span class="truncate font-mono font-semibold" :title="v.label">{{ v.label }}</span>
            <span class="chip">{{ roleName(v.role) }}</span>
          </span>
          <input :id="`start-${v.name}`" class="field tabular font-mono" inputmode="decimal" autocomplete="off" spellcheck="false"
                 :value="text[v.name] ?? format(values[v.name] ?? 0)"
                 :aria-invalid="invalid.has(v.name)"
                 @input="onInput(v.name, $event.target.value)" />
          <span v-if="invalid.has(v.name)" class="text-sm text-bad">Bitte eine Zahl eingeben.</span>
        </label>
      </div>
    </component>
  </section>
</template>

<script>
import { parseNumber } from '../engine/model.js'
import { MAX_STEPS } from '../engine/simulate.js'

const ORDER = [
  { role: 'state', title: 'Zustandsgrößen' },
  { role: 'constant', title: 'Konstanten und Faktoren' },
  { role: 'time', title: 'Zeit' },
  { role: 'rate', title: 'Raten und Hilfsgrößen – werden in jedem Schritt neu berechnet', collapsed: true },
]

export default {
  name: 'StartValues',
  props: {
    analysis: { type: Object, required: true },
    values: { type: Object, required: true },
    steps: { type: Number, required: true },
    resetKey: { type: [String, Number], default: 0 },
  },
  emits: ['update:values', 'update:steps'],
  data() {
    return { text: {}, invalid: new Set(), maxSteps: MAX_STEPS }
  },
  computed: {
    groups() {
      const vars = [...this.analysis.program.variables].map(([name, label]) => ({ name, label, role: this.analysis.roles.get(name) }))
      return ORDER.map((g) => ({ ...g, items: vars.filter((v) => v.role === g.role) })).filter((g) => g.items.length)
    },
  },
  watch: {
    resetKey() {
      // Neues Modell geladen: Eingabetexte verwerfen
      this.text = {}
      this.invalid = new Set()
    },
  },
  methods: {
    roleName(r) {
      return { state: 'Zustand', rate: 'Rate', constant: 'Konstante', time: 'Zeit' }[r]
    },
    format(x) {
      return String(x).replace('.', ',')
    },
    onInput(name, raw) {
      this.text = { ...this.text, [name]: raw }
      const x = parseNumber(raw)
      const invalid = new Set(this.invalid)
      if (x === null) { invalid.add(name); this.invalid = invalid; return }
      invalid.delete(name)
      this.invalid = invalid
      this.$emit('update:values', { ...this.values, [name]: x })
    },
    onSteps(raw) {
      const n = Math.round(Number(raw))
      if (n >= 1 && n <= MAX_STEPS) this.$emit('update:steps', n)
    },
  },
}
</script>
