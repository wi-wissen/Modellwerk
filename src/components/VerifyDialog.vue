<template>
  <dialog ref="dlg" class="m-auto w-[min(46rem,calc(100vw-2rem))] max-h-[calc(100vh-2rem)] rounded-2xl border border-line bg-sheet p-0 text-ink shadow-2xl backdrop:bg-black/50"
          aria-labelledby="verify-title" @close="$emit('close')">
    <div class="flex flex-col gap-4 p-5">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h2 id="verify-title" class="flex items-center gap-2 text-xl font-bold"><ShieldCheck :size="22" aria-hidden="true" class="text-ok" /> Mit dem Original vergleichen</h2>
          <p class="mt-1 max-w-[60ch] text-muted">
            Moebius speichert in jeder <span class="font-mono">.prg</span>-Datei die Ergebnisse, die es selbst berechnet hat.
            Wähle eine Datei aus: Wir rechnen jedes Modell nach und vergleichen jeden Wert Bit für Bit.
          </p>
        </div>
        <button type="button" class="btn btn-quiet" aria-label="Schließen" @click="close"><X :size="20" aria-hidden="true" /></button>
      </div>

      <label class="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-line bg-paper px-4 py-6 text-center hover:border-accent"
             :class="{ 'border-accent bg-accent-soft': dragging }"
             @dragover.prevent="dragging = true" @dragleave="dragging = false" @drop.prevent="onDrop">
        <FileUp :size="28" aria-hidden="true" class="text-accent" />
        <span class="font-semibold">Moebius-Dateien (.prg) auswählen oder hierher ziehen</span>
        <span class="text-sm text-muted">Die Dateien bleiben auf deinem Gerät.</span>
        <input id="verify-files" type="file" accept=".prg,.PRG" multiple class="sr-only" @change="onFiles($event.target.files)" />
      </label>

      <div v-if="rows.length" aria-live="polite" class="flex flex-col gap-3">
        <p class="flex items-center gap-2 rounded-lg px-3 py-2 font-semibold" :class="allOk ? 'bg-ok-soft text-ok' : 'bg-bad-soft text-bad'">
          <CircleCheck v-if="allOk" :size="20" aria-hidden="true" /><TriangleAlert v-else :size="20" aria-hidden="true" />
          {{ totals.same.toLocaleString('de-DE') }} von {{ totals.all.toLocaleString('de-DE') }} Werten bitgenau identisch
        </p>
        <div class="max-h-72 overflow-auto rounded-lg border border-line">
          <table class="w-full border-collapse text-sm">
            <thead class="sticky top-0 bg-sunken text-left">
              <tr><th class="px-3 py-2">Datei</th><th class="px-3 py-2">Simulation</th><th class="px-3 py-2 text-right">Werte</th><th class="px-3 py-2">Ergebnis</th><th class="px-3 py-2"><span class="sr-only">Aktion</span></th></tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in rows" :key="i" class="border-t border-line align-top">
                <td class="px-3 py-2 break-all">{{ r.file }}</td>
                <td class="px-3 py-2">{{ r.name || '–' }}</td>
                <td class="px-3 py-2 text-right tabular">{{ r.compared != null ? `${r.identical}/${r.compared}` : '' }}</td>
                <td class="px-3 py-2">
                  <span v-if="r.ok" class="inline-flex items-center gap-1 font-semibold text-ok"><CircleCheck :size="16" aria-hidden="true" /> identisch</span>
                  <span v-else :class="r.noData ? 'text-muted' : 'text-bad'">{{ r.message }}</span>
                </td>
                <td class="px-3 py-2">
                  <button v-if="r.sim" type="button" class="btn !min-h-8 !py-1 text-sm" @click="open(r.sim)">Öffnen</button>
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
import { CircleCheck, FileUp, ShieldCheck, TriangleAlert, X } from 'lucide-vue-next'
import { readPrg } from '../engine/prg.js'
import { verifySimulation } from '../engine/verify.js'

export default {
  name: 'VerifyDialog',
  components: { CircleCheck, FileUp, ShieldCheck, TriangleAlert, X },
  emits: ['close', 'open-simulation'],
  data() {
    return { rows: [], dragging: false }
  },
  computed: {
    totals() {
      return this.rows.reduce((a, r) => ({ all: a.all + (r.compared ?? 0), same: a.same + (r.identical ?? 0) }), { all: 0, same: 0 })
    },
    allOk() { return this.rows.every((r) => r.ok || r.noData) && this.totals.all > 0 && this.totals.all === this.totals.same },
  },
  methods: {
    show() { this.$refs.dlg.showModal() },
    close() { this.$refs.dlg.close() },
    onDrop(ev) {
      this.dragging = false
      this.onFiles(ev.dataTransfer.files)
    },
    async onFiles(list) {
      const rows = []
      for (const f of list) {
        try {
          const sims = readPrg(new Uint8Array(await f.arrayBuffer()))
          if (!sims.length) rows.push({ file: f.name, noData: true, message: 'Formatvariante noch nicht unterstützt' })
          for (const sim of sims) {
            const r = verifySimulation(sim)
            const ok = r.identical === r.compared
            rows.push({ file: f.name, ...r, ok, sim, message: ok ? '' : `Abweichung bei ${r.firstMismatch.variable}, Schritt ${r.firstMismatch.step}` })
          }
        } catch (e) {
          rows.push({ file: f.name, message: e.message })
        }
      }
      this.rows = rows
    },
    open(sim) {
      this.$emit('open-simulation', sim)
      this.close()
    },
  },
}
</script>
