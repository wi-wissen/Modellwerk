<template>
  <div class="flex flex-col gap-3">
  <div class="flex flex-wrap gap-2">
    <button type="button" class="btn" :title="$t('macros.fromSelectionHint')" @click="$emit('from-selection')"><Group :size="16" aria-hidden="true" /> {{ $t('macros.fromSelection') }}</button>
  </div>
  <details class="rounded-xl border border-line" :open="macros.length > 0 || null">
    <summary class="cursor-pointer px-3 py-2 font-semibold">
      {{ $t('macros.title') }} <span class="text-muted">({{ macros.length }})</span>
    </summary>
    <div class="flex flex-col gap-3 border-t border-line p-3">
      <p class="max-w-[62ch] text-sm text-muted">{{ $t('macros.intro') }}</p>
      <ul v-if="macros.length" class="flex flex-col gap-3">
        <li v-for="(m, i) in macros" :key="i" class="flex flex-col gap-2 rounded-lg bg-sunken p-3">
          <div class="flex flex-wrap items-end gap-2">
            <label class="flex flex-col gap-1">
              <span class="text-sm font-semibold text-muted">{{ $t('macros.name') }}</span>
              <input :id="`macro-name-${i}`" class="field !w-48 font-mono" :value="m.name" autocomplete="off" spellcheck="false"
                     :aria-invalid="!validName(m.name)" @input="update(i, 'name', $event.target.value)" />
            </label>
            <button type="button" class="btn btn-quiet" @click="$emit('expand', m.name)"><ListTree :size="16" aria-hidden="true" /> {{ $t('macros.expand') }}</button>
            <button type="button" class="btn btn-quiet" @click="remove(i)"><Trash2 :size="16" aria-hidden="true" /> {{ $t('macros.remove') }}</button>
          </div>
          <span v-if="!validName(m.name)" class="text-sm text-bad">{{ $t('macros.invalidName') }}</span>
          <label class="flex flex-col gap-1">
            <span class="text-sm font-semibold text-muted">{{ $t('macros.body') }}</span>
            <textarea :id="`macro-body-${i}`" class="field min-h-20 font-mono text-[0.95rem]" :value="m.body" spellcheck="false" autocapitalize="off"
                      @input="update(i, 'body', $event.target.value)"></textarea>
          </label>
        </li>
      </ul>
      <div class="flex flex-wrap gap-2">
        <button type="button" class="btn" @click="add"><Plus :size="16" aria-hidden="true" /> {{ $t('macros.add') }}</button>
      </div>
    </div>
  </details>
  </div>
</template>

<script>
import { Group, ListTree, Plus, Trash2 } from 'lucide-vue-next'
import { FUNCTIONS } from '../engine/language.js'

export default {
  name: 'MacroEditor',
  components: { Group, ListTree, Plus, Trash2 },
  props: {
    macros: { type: Array, required: true },
  },
  emits: ['update:macros', 'expand', 'from-selection'],
  methods: {
    validName(name) {
      return /^[A-Za-zÄÖÜäöüß_][A-Za-z0-9ÄÖÜäöüß_]*$/.test(name) && !FUNCTIONS[name.toUpperCase()] && !['IF', 'THEN', 'WHILE', 'DO'].includes(name.toUpperCase())
    },
    update(i, key, value) {
      this.$emit('update:macros', this.macros.map((m, j) => (j === i ? { ...m, [key]: value } : m)))
    },
    add() {
      const n = this.macros.length + 1
      this.$emit('update:macros', [...this.macros, { name: this.$t('macros.defaultName', { n }), body: '' }])
      this.$nextTick(() => document.getElementById(`macro-name-${n - 1}`)?.focus())
    },
    remove(i) {
      this.$emit('update:macros', this.macros.filter((_, j) => j !== i))
    },
  },
}
</script>
