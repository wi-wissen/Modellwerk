<template>
  <section aria-labelledby="program-title" class="flex flex-col gap-3">
    <div>
      <h3 id="program-title" class="text-lg font-bold">Programm für einen Zeitschritt</h3>
      <p class="text-muted text-[0.95rem] max-w-[62ch]">
        Diese Zeilen werden in jedem Schritt von oben nach unten ausgeführt.
        <code class="font-mono">:=</code> heißt „bekommt den Wert“. Kommentare beginnen mit <code class="font-mono">//</code>.
      </p>
    </div>

    <div class="panel flex overflow-hidden font-mono text-[0.95rem] leading-6">
      <div class="select-none bg-sunken px-2 py-2 text-right text-muted tabular" aria-hidden="true">
        <div v-for="n in lineCount" :key="n" :class="{ 'text-bad font-bold': errorLines.has(n) }">{{ n }}</div>
      </div>
      <textarea
        id="program-source"
        ref="area"
        class="min-h-56 w-full min-w-0 flex-1 resize-y bg-sheet px-3 py-2 leading-6 text-ink outline-none"
        :value="modelValue"
        :aria-invalid="errors.length > 0"
        aria-describedby="program-help program-errors"
        spellcheck="false"
        autocapitalize="off"
        autocomplete="off"
        wrap="off"
        @input="$emit('update:modelValue', $event.target.value)"
      ></textarea>
    </div>

    <div id="program-errors" aria-live="polite">
      <ul v-if="errors.length" class="flex flex-col gap-1">
        <li v-for="(e, i) in errors" :key="i" class="flex items-start gap-2 rounded-lg bg-bad-soft px-3 py-2 text-[0.95rem]">
          <TriangleAlert :size="18" aria-hidden="true" class="mt-0.5 flex-none text-bad" />
          <span>
            <button type="button" class="font-semibold underline underline-offset-2" @click="goto(e.line)">Zeile {{ e.line }}</button>:
            {{ e.message }}
          </span>
        </li>
      </ul>
    </div>

    <details id="program-help" class="text-sm text-muted">
      <summary class="cursor-pointer font-semibold">Welche Funktionen gibt es?</summary>
      <dl class="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        <template v-for="(f, name) in functions" :key="name">
          <dt class="font-mono font-semibold text-ink">{{ name.toLowerCase() }}{{ f.arity ? '(x)' : '' }}</dt>
          <dd>{{ f.label }}</dd>
        </template>
        <dt class="font-mono font-semibold text-ink">if … then …</dt><dd>Anweisung nur, wenn die Bedingung gilt</dd>
        <dt class="font-mono font-semibold text-ink">while … do …</dt><dd>Anweisung wiederholen, solange die Bedingung gilt</dd>
      </dl>
    </details>
  </section>
</template>

<script>
import { TriangleAlert } from 'lucide-vue-next'
import { FUNCTIONS } from '../engine/language.js'

export default {
  name: 'ProgramEditor',
  components: { TriangleAlert },
  props: {
    modelValue: { type: String, required: true },
    errors: { type: Array, default: () => [] },
  },
  emits: ['update:modelValue'],
  data() {
    return { functions: FUNCTIONS }
  },
  computed: {
    lineCount() { return Math.max(1, this.modelValue.split('\n').length) },
    errorLines() { return new Set(this.errors.map((e) => e.line)) },
  },
  methods: {
    goto(line) {
      const area = this.$refs.area
      const lines = this.modelValue.split('\n')
      const start = lines.slice(0, line - 1).reduce((a, l) => a + l.length + 1, 0)
      area.focus()
      area.setSelectionRange(start, start + (lines[line - 1]?.length ?? 0))
    },
  },
}
</script>
