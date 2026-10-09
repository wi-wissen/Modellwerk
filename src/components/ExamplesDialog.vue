<template>
  <dialog ref="dlg" class="m-auto w-[min(60rem,calc(100vw-2rem))] max-h-[calc(100vh-2rem)] rounded-2xl border border-line bg-sheet p-0 text-ink shadow-2xl backdrop:bg-black/50" aria-labelledby="examples-title">
    <div class="flex flex-col gap-4 p-5">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h2 id="examples-title" class="text-xl font-bold">{{ $t('app.examplesTitle') }}</h2>
          <p class="text-muted">{{ $t('app.examplesHint') }}</p>
        </div>
        <button type="button" class="btn btn-quiet" :aria-label="$t('app.close')" @click="close"><X :size="20" aria-hidden="true" /></button>
      </div>
      <ul class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <li v-for="ex in examples" :key="ex.id">
          <button type="button" class="flex h-full w-full flex-col items-start gap-1 rounded-xl border p-4 text-left hover:border-accent"
                  :class="current === ex.id ? 'is-selected' : 'border-line'"
                  :aria-current="current === ex.id ? 'true' : undefined" @click="pick(ex)">
            <span class="eyebrow">{{ text(ex, 'topic') }}</span>
            <span class="text-lg font-bold text-ink">{{ text(ex, 'title') }}</span>
            <span class="text-sm text-muted">{{ text(ex, 'description') }}</span>
            <span v-if="ex.sources?.length" class="text-xs text-muted">{{ $t('app.sourceShort', { publisher: ex.sources[0].publisher }) }}</span>
            <span class="mt-1 inline-flex items-center gap-1 text-sm font-semibold">
              <component :is="ex.mode === 'sentences' ? 'MessageSquareText' : 'Code'" :size="15" aria-hidden="true" />
              {{ $t(ex.mode === 'sentences' ? 'app.inSentences' : 'app.asProgram') }}
            </span>
          </button>
        </li>
      </ul>
    </div>
  </dialog>
</template>

<script>
import { Code, MessageSquareText, X } from 'lucide-vue-next'
import { EXAMPLES } from '../examples.js'
import { exampleText } from '../guides/data.js'

export default {
  name: 'ExamplesDialog',
  components: { Code, MessageSquareText, X },
  props: { current: { type: String, default: null } },
  emits: ['load'],
  data() {
    return { examples: EXAMPLES }
  },
  methods: {
    text: exampleText,
    show() { this.$refs.dlg.showModal() },
    close() { this.$refs.dlg.close() },
    pick(ex) {
      this.$emit('load', ex)
      this.close()
    },
  },
}
</script>
