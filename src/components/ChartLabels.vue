<template>
  <details class="rounded-xl border border-line" :open="labels.length > 0 || placingId !== null || null">
    <summary class="cursor-pointer px-3 py-2 font-semibold">{{ $t('labels.title') }} <span class="text-muted">({{ labels.length }})</span></summary>
    <div class="flex flex-col gap-3 border-t border-line p-3">
      <p class="max-w-[62ch] text-sm text-muted">{{ $t('labels.intro') }}</p>
      <p v-if="placingId !== null" class="flex flex-wrap items-center gap-2 rounded-lg bg-accent-soft px-3 py-2 text-sm" role="status">
        <MousePointerClick :size="16" aria-hidden="true" /> {{ $t('labels.placing') }}
        <button type="button" class="btn btn-quiet !min-h-8 !py-1" @click="$emit('update:placing', null)">{{ $t('labels.cancel') }}</button>
      </p>
      <ul v-if="labels.length" class="flex flex-col gap-3">
        <li v-for="(l, i) in labels" :key="l.id" class="flex flex-wrap items-end gap-2 border-b border-line pb-3 last:border-0 last:pb-0">
          <label class="flex min-w-48 flex-1 flex-col gap-1 text-sm">
            <span class="font-semibold">{{ $t('labels.text') }}</span>
            <input :id="`label-text-${l.id}`" class="field" :value="l.text" autocomplete="off" @input="update(i, { text: $event.target.value })" />
          </label>
          <label class="flex flex-col gap-1 text-sm">
            <span class="font-semibold">{{ $t('labels.size') }}</span>
            <select :id="`label-size-${l.id}`" class="field !w-auto" :value="l.size" @change="update(i, { size: $event.target.value })">
              <option v-for="s in ['s', 'm', 'l']" :key="s" :value="s">{{ $t(`labels.sizes.${s}`) }}</option>
            </select>
          </label>
          <label class="inline-flex items-center gap-2 self-center text-sm">
            <input :id="`label-bold-${l.id}`" type="checkbox" class="size-5" :checked="l.bold" @change="update(i, { bold: $event.target.checked })" />
            <span class="font-semibold">{{ $t('labels.bold') }}</span>
          </label>
          <label v-for="k in ['x', 'y']" :key="k" class="flex flex-col gap-1 text-sm">
            <span class="font-semibold">{{ $t(`labels.${k}`) }}</span>
            <input :id="`label-${k}-${l.id}`" class="field !w-28 tabular font-mono" inputmode="decimal" autocomplete="off"
                   :value="text[`${l.id}-${k}`] ?? format(l[k])" :aria-invalid="bad.has(`${l.id}-${k}`)"
                   @input="setNumber(i, k, $event.target.value)" />
          </label>
          <button type="button" class="btn btn-quiet" :aria-pressed="placingId === l.id ? 'true' : 'false'" @click="$emit('update:placing', placingId === l.id ? null : l.id)">
            <Crosshair :size="16" aria-hidden="true" /> {{ $t('labels.place') }}
          </button>
          <button type="button" class="btn btn-quiet" @click="remove(i)"><Trash2 :size="16" aria-hidden="true" /> {{ $t('labels.remove') }}</button>
        </li>
      </ul>
      <div>
        <button type="button" class="btn" @click="add"><Plus :size="16" aria-hidden="true" /> {{ $t('labels.add') }}</button>
      </div>
    </div>
  </details>
</template>

<script>
import { Crosshair, MousePointerClick, Plus, Trash2 } from 'lucide-vue-next'
import { parseNumber } from '../engine/model.js'
import { numberLocale } from '../i18n/index.js'

// Text labels in the graph, like the text tool of the legacy program. Positions are
// in data units, so a label stays next to its point when the axes change.
export default {
  name: 'ChartLabels',
  components: { Crosshair, MousePointerClick, Plus, Trash2 },
  props: {
    labels: { type: Array, required: true }, // [{ id, text, x, y, size: 's'|'m'|'l', bold }]
    // where a new label goes when it is not placed by clicking: the middle of the graph
    center: { type: Object, required: true }, // { x, y }
    placingId: { type: Number, default: null },
  },
  emits: ['update:labels', 'update:placing', 'announce'],
  data() {
    return { text: {}, bad: new Set() }
  },
  methods: {
    // plain number for editing: decimal comma in German, no thousands separator
    format(v) {
      const text = String(Number(v.toPrecision(6)))
      return numberLocale().startsWith('de') ? text.replace('.', ',') : text
    },
    update(i, changes) {
      this.$emit('update:labels', this.labels.map((l, j) => (j === i ? { ...l, ...changes } : l)))
    },
    setNumber(i, k, raw) {
      const key = `${this.labels[i].id}-${k}`
      this.text = { ...this.text, [key]: raw }
      const v = parseNumber(raw)
      const bad = new Set(this.bad)
      if (v === null) bad.add(key)
      else { bad.delete(key); this.update(i, { [k]: v }) }
      this.bad = bad
    },
    add() {
      const id = Math.max(0, ...this.labels.map((l) => l.id)) + 1
      this.$emit('update:labels', [...this.labels, { id, text: this.$t('labels.default'), x: this.center.x, y: this.center.y, size: 'm', bold: false }])
      this.$emit('update:placing', id)
      this.$nextTick(() => { const el = document.getElementById(`label-text-${id}`); el?.focus(); el?.select() })
    },
    remove(i) {
      if (this.placingId === this.labels[i].id) this.$emit('update:placing', null)
      this.$emit('update:labels', this.labels.filter((_, j) => j !== i))
      this.$emit('announce', this.$t('labels.removed'))
    },
  },
  watch: {
    // after placing by click, show the new position instead of what was typed
    placingId() { this.text = {}; this.bad = new Set() },
  },
}
</script>
