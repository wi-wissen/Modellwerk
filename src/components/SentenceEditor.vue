<template>
  <section aria-labelledby="sentences-title" class="flex flex-col gap-4">
    <div>
      <h3 id="sentences-title" class="text-lg font-bold">{{ $t('sentences.title') }}</h3>
      <p class="text-muted text-[0.95rem] max-w-[62ch]">{{ $t('sentences.intro') }}</p>
    </div>

    <p v-if="outOfSync" class="flex flex-wrap items-center gap-3 rounded-lg border border-rate bg-rate-soft px-3 py-2 text-[0.95rem]" role="status">
      <TriangleAlert :size="18" aria-hidden="true" class="text-rate" />
      <span class="min-w-0 flex-1">{{ $t('sentences.outOfSync') }}</span>
      <button type="button" class="btn" @click="$emit('resync')">
        <RotateCcw :size="16" aria-hidden="true" /> {{ $t('sentences.resync') }}
      </button>
    </p>

    <ol class="flex flex-col gap-3" :aria-label="$t('sentences.list')">
      <li v-for="(s, i) in sentences" :key="i" class="panel grid gap-2 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,11.5rem)_minmax(0,1fr)_auto] sm:items-end">
        <label class="flex flex-col gap-1">
          <span class="text-sm font-semibold text-muted">{{ $t('sentences.quantity') }}</span>
          <input :id="`s-subject-${i}`" class="field font-mono" :value="s.subject" autocomplete="off" spellcheck="false"
                 @input="update(i, 'subject', $event.target.value)" />
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-sm font-semibold text-muted">{{ $t('sentences.changes') }}</span>
          <select :id="`s-pred-${i}`" class="field" :value="s.predicate" @change="update(i, 'predicate', $event.target.value)">
            <option v-for="p in predicates" :key="p" :value="p">{{ $t(`predicates.${p}.text`) }}</option>
          </select>
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-sm font-semibold text-muted">{{ $t(s.predicate === 'constant' ? 'sentences.value' : s.predicate === 'proportional' ? 'sentences.term' : 'sentences.rate') }}</span>
          <input :id="`s-object-${i}`" class="field font-mono" :value="s.object" autocomplete="off" spellcheck="false"
                 @input="update(i, 'object', $event.target.value)" />
        </label>
        <button type="button" class="btn btn-quiet justify-self-start" :aria-label="$t('sentences.removeN', { n: i + 1 })" :title="$t('sentences.remove')" @click="remove(i)">
          <Trash2 :size="18" aria-hidden="true" /><span class="sm:sr-only">{{ $t('sentences.remove') }}</span>
        </button>
        <p class="text-sm text-muted sm:col-span-4">
          <span class="font-semibold text-ink">„{{ s.subject || '…' }} {{ $t(`predicates.${s.predicate}.text`) }} {{ s.object || '…' }}“</span>
          – {{ $t(`predicates.${s.predicate}.hint`) }}
        </p>
      </li>
    </ol>

    <div class="flex flex-wrap items-center gap-3">
      <button type="button" class="btn" @click="add"><Plus :size="18" aria-hidden="true" /> {{ $t('sentences.add') }}</button>
      <label class="inline-flex items-center gap-2">
        <input id="simplified" type="checkbox" class="size-5 accent-[var(--accent)]" :checked="simplified" @change="$emit('update:simplified', $event.target.checked)" />
        <span>{{ $t('sentences.simplified') }}</span>
      </label>
      <details class="text-sm text-muted">
        <summary class="cursor-pointer font-semibold">{{ $t('sentences.whatMeans') }}</summary>
        <p class="mt-1 max-w-[56ch]">{{ $t('sentences.simplifiedHelp') }}</p>
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
    update(i, key, value) {
      const next = this.sentences.map((s, j) => (j === i ? { ...s, [key]: value } : s))
      this.$emit('update:sentences', next)
    },
    add() {
      this.$emit('update:sentences', [...this.sentences, { subject: '', predicate: 'increase', object: '' }])
      this.$nextTick(() => document.getElementById(`s-subject-${this.sentences.length - 1}`)?.focus())
    },
    remove(i) {
      this.$emit('update:sentences', this.sentences.filter((_, j) => j !== i))
    },
  },
}
</script>
