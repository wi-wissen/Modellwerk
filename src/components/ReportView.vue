<template>
  <article class="report">
    <header class="report-head">
      <p class="eyebrow">{{ topic }}</p>
      <h1>{{ title }}</h1>
      <p v-if="description">{{ description }}</p>
      <p class="meta">{{ $t('report.created', { date }) }} · Modellwerk</p>
    </header>

    <section v-for="(s, i) in sims" :key="i" class="report-sim">
      <h2 v-if="sims.length > 1">{{ s.name }}</h2>
      <h3>{{ $t('report.program') }}</h3>
      <pre>{{ s.source }}</pre>
      <template v-if="s.macros.length">
        <h3>{{ $t('macros.title') }}</h3>
        <div v-for="m in s.macros" :key="m.name">
          <p class="mono"><strong>{{ m.name }}</strong></p>
          <pre>{{ m.body }}</pre>
        </div>
      </template>
      <h3>{{ $t('app.startValues') }}</h3>
      <table class="report-table">
        <tbody>
          <tr v-for="v in s.start" :key="v.name"><th class="mono">{{ v.label }}</th><td class="mono">{{ v.value }}</td><td>{{ $t(`roles.${v.role}`) }}</td></tr>
          <tr><th>{{ $t('start.repeat') }}</th><td class="mono">{{ s.steps }}</td><td>{{ $t('start.times') }}</td></tr>
        </tbody>
      </table>
    </section>

    <section v-if="chartSvg">
      <h3>{{ $t('app.tabs.chart') }}</h3>
      <div class="report-chart" v-html="chartSvg"></div>
      <ul v-if="legend.length" class="report-legend">
        <li v-for="l in legend" :key="l.label">
          <svg width="30" height="8" aria-hidden="true"><line x1="1" y1="4" x2="29" y2="4" :stroke="l.color" stroke-width="2.5" :stroke-dasharray="l.dash || null" /></svg>
          <span class="mono">{{ l.label }}</span>
        </li>
      </ul>
    </section>

    <section v-if="table.rows.length">
      <h3>{{ $t('app.tabs.table') }} <span class="meta">({{ $t('report.tableNote', { n: table.every }) }})</span></h3>
      <table class="report-table">
        <thead><tr><th v-for="h in table.header" :key="h">{{ h }}</th></tr></thead>
        <tbody><tr v-for="(r, i) in table.rows" :key="i"><td v-for="(c, k) in r" :key="k" class="mono">{{ c }}</td></tr></tbody>
      </table>
    </section>
  </article>
</template>

<script>
export default {
  name: 'ReportView',
  props: {
    title: { type: String, required: true },
    topic: { type: String, default: '' },
    description: { type: String, default: '' },
    sims: { type: Array, required: true }, // [{ name, source, macros, start: [{ name, label, value, role }], steps }]
    chartSvg: { type: String, default: '' },
    legend: { type: Array, default: () => [] }, // [{ label, color, dash }]
    table: { type: Object, default: () => ({ header: [], rows: [], every: 1 }) },
  },
  computed: {
    date() { return new Date().toLocaleDateString(this.$i18n.locale === 'de' ? 'de-DE' : 'en-GB') },
  },
}
</script>

<style>
.report { display: none; }
@media print {
  .app-shell, .app-dialogs { display: none !important; }
  .report { display: block; color: #000; background: #fff; font-size: 11pt; line-height: 1.4; }
  .report h1 { font-size: 20pt; font-weight: 800; margin: 0 0 4pt; }
  .report h2 { font-size: 14pt; font-weight: 700; margin: 14pt 0 4pt; }
  .report h3 { font-size: 12pt; font-weight: 700; margin: 12pt 0 4pt; }
  .report .meta { color: #444; font-size: 9pt; }
  .report pre, .report .mono { font-family: var(--font-mono); font-size: 9.5pt; }
  .report pre { white-space: pre-wrap; border: 1px solid #bbb; padding: 6pt; border-radius: 4pt; }
  .report-table { border-collapse: collapse; font-size: 9.5pt; }
  .report-table th, .report-table td { border: 1px solid #bbb; padding: 2pt 6pt; text-align: left; }
  .report-chart svg { width: 100%; height: auto; }
  .report-legend { display: flex; flex-wrap: wrap; gap: 4pt 14pt; list-style: none; padding: 0; margin: 4pt 0 0; font-size: 9.5pt; }
  .report-legend li { display: inline-flex; align-items: center; gap: 5pt; }
  .report section { break-inside: avoid; }
}
</style>
