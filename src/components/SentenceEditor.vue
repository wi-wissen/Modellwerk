<template>
  <section aria-labelledby="sentences-title" class="flex flex-col gap-4">
    <div>
      <h3 id="sentences-title" class="text-lg font-bold">Beschreibe dein Modell in Sätzen</h3>
      <p class="text-muted text-[0.95rem] max-w-[62ch]">
        Jeder Satz sagt, wie sich eine Größe verändert. Daraus entsteht automatisch das Programm,
        das in jedem Zeitschritt einmal durchlaufen wird.
      </p>
    </div>

    <p v-if="outOfSync" class="flex flex-wrap items-center gap-3 rounded-lg border border-rate bg-rate-soft px-3 py-2 text-[0.95rem]" role="status">
      <TriangleAlert :size="18" aria-hidden="true" class="text-rate" />
      <span class="min-w-0 flex-1">Das Programm wurde direkt bearbeitet. Die Sätze gelten erst wieder, wenn du sie übernimmst.</span>
      <button type="button" class="btn" @click="$emit('resync')">
        <RotateCcw :size="16" aria-hidden="true" /> Sätze übernehmen
      </button>
    </p>

    <ol class="flex flex-col gap-3" aria-label="Sätze des Modells">
      <li v-for="(s, i) in sentences" :key="i" class="panel grid gap-2 p-3 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,12rem)_minmax(0,1.2fr)_auto] sm:items-end">
        <label class="flex flex-col gap-1">
          <span class="text-sm font-semibold text-muted">Größe</span>
          <input :id="`s-subject-${i}`" class="field font-mono" :value="s.subject" autocomplete="off" spellcheck="false"
                 @input="update(i, 'subject', $event.target.value)" />
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-sm font-semibold text-muted">verändert sich so</span>
          <select :id="`s-pred-${i}`" class="field" :value="s.predicate" @change="update(i, 'predicate', $event.target.value)">
            <option v-for="p in predicates" :key="p.id" :value="p.id">{{ p.text }}</option>
          </select>
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-sm font-semibold text-muted">{{ s.predicate === 'const' ? 'Wert' : s.predicate === 'prop' ? 'Term' : 'Veränderungsrate' }}</span>
          <input :id="`s-object-${i}`" class="field font-mono" :value="s.object" autocomplete="off" spellcheck="false"
                 @input="update(i, 'object', $event.target.value)" />
        </label>
        <button type="button" class="btn btn-quiet justify-self-start" :aria-label="`Satz ${i + 1} löschen`" title="Satz löschen" @click="remove(i)">
          <Trash2 :size="18" aria-hidden="true" /><span class="sm:sr-only">Satz löschen</span>
        </button>
        <p class="text-sm text-muted sm:col-span-4">
          <span class="font-semibold text-ink">„{{ s.subject || '…' }} {{ predicateText(s.predicate) }} {{ s.object || '…' }}“</span>
          – {{ predicateHint(s.predicate) }}
        </p>
      </li>
    </ol>

    <div class="flex flex-wrap items-center gap-3">
      <button type="button" class="btn" @click="add"><Plus :size="18" aria-hidden="true" /> Satz hinzufügen</button>
      <label class="inline-flex items-center gap-2">
        <input id="simplified" type="checkbox" class="size-5 accent-[var(--accent)]" :checked="simplified" @change="$emit('update:simplified', $event.target.checked)" />
        <span>Zeitschritt 1 (vereinfachtes Modell)</span>
      </label>
      <details class="text-sm text-muted">
        <summary class="cursor-pointer font-semibold">Was heißt das?</summary>
        <p class="mt-1 max-w-[56ch]">Eingeschaltet wird jede Rate einmal pro Schritt addiert, z. B. pro Tag. Ausgeschaltet wird sie mit dem Zeitschritt <code class="font-mono">DeltaT</code> multipliziert – so rechnet man in der Physik.</p>
      </details>
    </div>
  </section>
</template>

<script>
import { Plus, RotateCcw, Trash2, TriangleAlert } from 'lucide-vue-next'
import { PREDICATES } from '../engine/model.js'

export default {
  name: 'SentenceEditor',
  components: { Plus, RotateCcw, Trash2, TriangleAlert },
  props: {
    sentences: { type: Array, required: true },
    simplified: { type: Boolean, default: true },
    outOfSync: { type: Boolean, default: false },
  },
  emits: ['update:sentences', 'update:simplified', 'resync'],
  data() {
    return { predicates: PREDICATES }
  },
  methods: {
    predicateText(id) { return PREDICATES.find((p) => p.id === id)?.text ?? '' },
    predicateHint(id) { return PREDICATES.find((p) => p.id === id)?.hint ?? '' },
    update(i, key, value) {
      const next = this.sentences.map((s, j) => (j === i ? { ...s, [key]: value } : s))
      this.$emit('update:sentences', next)
    },
    add() {
      this.$emit('update:sentences', [...this.sentences, { subject: '', predicate: 'zu', object: '' }])
      this.$nextTick(() => document.getElementById(`s-subject-${this.sentences.length - 1}`)?.focus())
    },
    remove(i) {
      this.$emit('update:sentences', this.sentences.filter((_, j) => j !== i))
    },
  },
}
</script>
