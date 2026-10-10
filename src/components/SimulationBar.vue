<template>
  <div class="flex flex-col gap-3">
    <ul class="flex flex-col gap-2" :aria-label="$t('sim.title')">
      <li v-for="(name, i) in names" :key="i">
        <label v-if="renaming && i === active" class="flex">
          <span class="sr-only">{{ $t('sim.name') }}</span>
          <input id="sim-name" ref="name" class="field" :value="rawName" autocomplete="off"
                 @keydown.enter="finishRename($event.target.value)" @keydown.escape="renaming = false" @blur="finishRename($event.target.value)" />
        </label>
        <button v-else type="button" class="btn w-full !justify-between text-left" :class="{ '!border-accent !bg-accent-soft': i === active }"
                :aria-pressed="i === active ? 'true' : 'false'" @click="$emit('select', i)">
          <span class="flex min-w-0 items-center gap-2"><Layers :size="18" aria-hidden="true" class="flex-none text-muted" /> <span class="truncate">{{ name }}</span></span>
          <span v-if="i === active" class="text-sm text-accent-strong">{{ $t('sim.active') }}</span>
        </button>
      </li>
    </ul>
    <div class="flex flex-wrap gap-2">
      <button type="button" class="btn" :title="$t('sim.copyHint')" @click="$emit('copy')"><Copy :size="16" aria-hidden="true" /> {{ $t('sim.copy') }}</button>
      <button type="button" class="btn btn-quiet" @click="startRename"><Pencil :size="16" aria-hidden="true" /> {{ $t('sim.rename') }}</button>
      <button v-if="names.length > 1" type="button" class="btn btn-quiet" @click="$emit('remove')"><Trash2 :size="16" aria-hidden="true" /> {{ $t('sim.remove') }}</button>
    </div>
    <p class="max-w-[60ch] text-sm text-muted">{{ $t('sim.hint') }}</p>
  </div>
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
      this.$nextTick(() => [this.$refs.name].flat()[0]?.select())
    },
    finishRename(value) {
      if (!this.renaming) return
      this.renaming = false
      this.$emit('rename', value.trim())
    },
  },
}
</script>
