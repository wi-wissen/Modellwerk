<template>
  <dialog ref="dlg" class="m-auto w-[min(46rem,calc(100vw-2rem))] max-h-[calc(100vh-2rem)] rounded-2xl border border-line bg-sheet p-0 text-ink shadow-2xl backdrop:bg-black/50"
          aria-labelledby="compare-title">
    <div class="flex flex-col gap-4 p-5">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h2 id="compare-title" class="flex items-center gap-2 text-xl font-bold"><FileCheck2 :size="22" aria-hidden="true" class="text-accent" /> {{ $t('compare.title') }}</h2>
          <p class="mt-1 max-w-[60ch] text-muted">{{ $t('compare.intro') }}</p>
        </div>
        <button type="button" class="btn btn-quiet" :aria-label="$t('app.close')" @click="close"><X :size="20" aria-hidden="true" /></button>
      </div>

      <label class="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center hover:border-accent has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent"
             :class="dragging ? 'border-accent bg-accent-soft' : 'border-line bg-paper'"
             @dragover.prevent="dragging = true" @dragleave="dragging = false" @drop.prevent="onDrop">
        <FileUp :size="28" aria-hidden="true" class="text-accent" />
        <span class="font-semibold">{{ $t('compare.drop') }}</span>
        <span class="text-sm text-muted">{{ $t('compare.local') }}</span>
        <input id="compare-files" type="file" accept=".prg,.PRG" multiple class="sr-only" @change="onFiles($event.target.files)" />
      </label>

      <div v-if="rows.length" aria-live="polite" class="flex flex-col gap-3">
        <p class="flex items-center gap-2 rounded-lg px-3 py-2 font-semibold" :class="allOk ? 'bg-ok-soft text-ok' : 'bg-bad-soft text-bad'">
          <CircleCheck v-if="allOk" :size="20" aria-hidden="true" /><TriangleAlert v-else :size="20" aria-hidden="true" />
          {{ $t('compare.summary', { same: fmtInt(totals.same), all: fmtInt(totals.all) }) }}
        </p>
        <div class="max-h-72 overflow-auto rounded-lg border border-line">
          <table class="w-full border-collapse text-sm">
            <thead class="sticky top-0 bg-sunken text-left">
              <tr>
                <th class="px-3 py-2">{{ $t('compare.file') }}</th>
                <th class="px-3 py-2">{{ $t('compare.simulation') }}</th>
                <th class="px-3 py-2 text-right">{{ $t('compare.values') }}</th>
                <th class="px-3 py-2">{{ $t('compare.result') }}</th>
                <th class="px-3 py-2"><span class="sr-only">{{ $t('compare.action') }}</span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in rows" :key="i" class="border-t border-line align-top">
                <td class="px-3 py-2 break-all">{{ r.file }}</td>
                <td class="px-3 py-2">{{ r.name || '–' }}</td>
                <td class="px-3 py-2 text-right tabular">{{ r.compared != null ? `${fmtInt(r.identical)}/${fmtInt(r.compared)}` : '' }}</td>
                <td class="px-3 py-2">
                  <span v-if="r.ok" class="inline-flex items-center gap-1 font-semibold text-ok"><CircleCheck :size="16" aria-hidden="true" /> {{ $t('compare.identical') }}</span>
                  <span v-else :class="r.unsupported ? 'text-muted' : 'text-bad'">{{ message(r) }}</span>
                </td>
                <td class="px-3 py-2">
                  <button v-if="r.sim" type="button" class="btn !min-h-8 !py-1 text-sm" @click="open(r)">{{ $t('compare.open') }}</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </dialog>
</template>

<script>
import { CircleCheck, FileCheck2, FileUp, TriangleAlert, X } from 'lucide-vue-next'
import { readPrg } from '../engine/prg.js'
import { verifySimulation } from '../engine/verify.js'
import { numberLocale } from '../i18n/index.js'

export default {
  name: 'CompareDialog',
  components: { CircleCheck, FileCheck2, FileUp, TriangleAlert, X },
  emits: ['open-simulation'],
  data() {
    return { rows: [], dragging: false }
  },
  computed: {
    totals() {
      return this.rows.reduce((a, r) => ({ all: a.all + (r.compared ?? 0), same: a.same + (r.identical ?? 0) }), { all: 0, same: 0 })
    },
    allOk() {
      return this.totals.all > 0 && this.totals.all === this.totals.same && this.rows.every((r) => r.ok || r.unsupported)
    },
  },
  methods: {
    show() { this.$refs.dlg.showModal() },
    close() { this.$refs.dlg.close() },
    fmtInt(n) { return n.toLocaleString(numberLocale()) },
    message(r) {
      if (r.unsupported) return this.$t('compare.variant')
      if (r.mismatch) return this.$t('compare.mismatch', r.mismatch)
      return this.$errorText(r.error)
    },
    onDrop(ev) {
      this.dragging = false
      this.onFiles(ev.dataTransfer.files)
    },
    async onFiles(list) {
      const rows = []
      for (const f of list) {
        try {
          const sims = readPrg(new Uint8Array(await f.arrayBuffer()))
          if (!sims.length) rows.push({ file: f.name, unsupported: true })
          for (const sim of sims) {
            const r = verifySimulation(sim)
            const ok = r.identical === r.compared
            rows.push({ file: f.name, ...r, ok, sim, mismatch: ok ? null : r.firstMismatch })
          }
        } catch (error) {
          rows.push({ file: f.name, error: error.code ? Object.assign(error, { code: error.code }) : error })
        }
      }
      this.rows = rows
    },
    open(row) {
      this.$emit('open-simulation', row.sim, row.file)
      this.close()
    },
  },
}
</script>
