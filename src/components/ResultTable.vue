<template>
  <div class="flex flex-col gap-2">
    <div class="flex flex-wrap items-center gap-3 text-sm">
      <label class="inline-flex items-center gap-2">
        <span class="font-semibold">{{ $t('table.every') }}</span>
        <input id="table-every" type="number" min="1" class="field w-20 tabular" :value="every" @input="every = Math.max(1, Math.round(+$event.target.value || 1))" />
        <span class="font-semibold">{{ $t('table.everySuffix') }}</span>
      </label>
      <span class="text-muted">{{ $t('table.count', { shown: rows.length, total: result.steps + 1 }) }}</span>
    </div>
    <div class="max-h-[26rem] overflow-auto rounded-lg border border-line">
      <table class="w-full border-collapse text-right text-sm tabular">
        <caption class="sr-only">{{ $t('table.caption') }}</caption>
        <thead class="sticky top-0 bg-sunken">
          <tr>
            <th scope="col" class="px-3 py-2 font-semibold">{{ $t('table.step') }}</th>
            <th v-for="c in columns" :key="c" scope="col" class="px-3 py-2 font-mono font-semibold">{{ result.display.get(c) ?? c }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r" class="border-t border-line odd:bg-sheet even:bg-paper">
            <th scope="row" class="px-3 py-1 font-normal text-muted">{{ r }}</th>
            <td v-for="c in columns" :key="c" class="px-3 py-1 font-mono">{{ fmt(result.series[c][r]) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import { formatNumber } from '../engine/model.js'
import { numberLocale } from '../i18n/index.js'

export default {
  name: 'ResultTable',
  props: {
    result: { type: Object, required: true },
    columns: { type: Array, required: true },
  },
  data() {
    return { every: 1 }
  },
  computed: {
    rows() {
      const out = []
      const every = Math.max(this.every, Math.ceil((this.result.steps + 1) / 1500))
      for (let i = 0; i <= this.result.steps; i += every) out.push(i)
      if (out[out.length - 1] !== this.result.steps) out.push(this.result.steps)
      return out
    },
  },
  methods: {
    fmt(v) { return formatNumber(v, 10, numberLocale()) },
  },
}
</script>
