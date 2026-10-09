<template>
  <section class="panel flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-5" :aria-label="$t('sim.title')">
    <label class="inline-flex min-w-0 items-center gap-2">
      <Layers :size="18" aria-hidden="true" class="flex-none text-muted" />
      <span class="font-semibold">{{ $t('sim.label') }}</span>
      <select id="sim-select" class="field !w-auto max-w-[18rem]" :value="active" @change="$emit('select', Number($event.target.value))">
        <option v-for="(name, i) in names" :key="i" :value="i">{{ name }}</option>
      </select>
    </label>
    <label v-if="renaming" class="inline-flex items-center gap-2">
      <span class="sr-only">{{ $t('sim.name') }}</span>
      <input id="sim-name" ref="name" class="field !w-56" :value="rawName" autocomplete="off"
             @keydown.enter="finishRename($event.target.value)" @keydown.escape="renaming = false" @blur="finishRename($event.target.value)" />
    </label>
    <div class="flex flex-wrap gap-2">
      <button v-if="!renaming" type="button" class="btn btn-quiet" @click="startRename"><Pencil :size="16" aria-hidden="true" /> {{ $t('sim.rename') }}</button>
      <button type="button" class="btn btn-quiet" :title="$t('sim.copyHint')" @click="$emit('copy')"><Copy :size="16" aria-hidden="true" /> {{ $t('sim.copy') }}</button>
      <button v-if="names.length > 1" type="button" class="btn btn-quiet" @click="$emit('remove')"><Trash2 :size="16" aria-hidden="true" /> {{ $t('sim.remove') }}</button>
    </div>
    <p v-if="names.length > 1" class="text-sm text-muted">{{ $t('sim.count', { n: names.length }) }}</p>
  </section>
</template>

<script>
import { Copy, Layers, Pencil, Trash2 } from 'lucide-vue-next'

export default {
  name: 'SimulationBar',
  components: { Copy, Layers, Pencil, Trash2 },
  props: {
    names: { type: Array, required: true },
    active: { type: Number, required: true },
    rawName: { type: String, default: '' },
  },
  emits: ['select', 'copy', 'remove', 'rename'],
  data() {
    return { renaming: false }
  },
  methods: {
    startRename() {
      this.renaming = true
      this.$nextTick(() => this.$refs.name?.select())
    },
    finishRename(value) {
      if (!this.renaming) return
      this.renaming = false
      this.$emit('rename', value.trim())
    },
  },
}
</script>
