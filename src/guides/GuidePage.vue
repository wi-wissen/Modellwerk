<template>
  <div class="flex min-h-screen flex-col">
    <SiteHeader root="../../" current="examples" />

    <main v-if="!example" class="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <p class="text-lg">{{ $t('guides.notFound') }}</p>
      <a :href="siteLink('../../', 'examples/')" class="btn mt-4 no-underline">{{ $t('guides.allExamples') }}</a>
    </main>

    <main v-else class="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 pb-16 pt-4 sm:px-6">
      <nav :aria-label="$t('site.breadcrumb')" class="text-sm text-muted">
        <a :href="siteLink('../../', 'examples/')" class="underline underline-offset-2">{{ $t('site.examples') }}</a>
        <span aria-hidden="true"> / </span><span aria-current="page">{{ title }}</span>
      </nav>

      <header class="flex flex-col gap-4">
        <p class="eyebrow">{{ exampleText(example, 'topic') }}<template v-if="example.level"> · {{ local(example.level) }}</template></p>
        <h1 class="max-w-[24ch] text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">{{ title }}</h1>
        <p class="max-w-[60ch] text-lg text-muted sm:text-xl">{{ guide ? local(guide.teaser) : exampleText(example, 'description') }}</p>
        <div class="flex flex-wrap gap-3">
          <a :href="appLink" class="btn btn-primary !min-h-12 !px-5 text-lg no-underline">{{ $t('guides.openInApp') }} <ArrowRight :size="20" aria-hidden="true" /></a>
          <a :href="siteLink('../../', 'examples/')" class="btn !min-h-12 no-underline">{{ $t('guides.allExamples') }}</a>
        </div>
      </header>

      <div class="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <article class="flex min-w-0 flex-col gap-8 text-[1.05rem] leading-relaxed">
          <p v-if="!guide" class="rounded-xl bg-sunken p-4 text-muted">{{ $t('guides.pending') }}</p>

          <template v-if="guide">
            <section>
              <h2 class="mb-2 text-2xl font-bold">{{ $t('guides.phenomenon') }}</h2>
              <p class="max-w-[65ch]">{{ local(guide.phenomenon) }}</p>
            </section>
            <section>
              <h2 class="mb-2 text-2xl font-bold">{{ $t('guides.idea') }}</h2>
              <p class="max-w-[65ch]">{{ local(guide.idea) }}</p>
            </section>
          </template>

          <section>
            <h2 class="mb-3 text-2xl font-bold">{{ $t('guides.quantities') }}</h2>
            <div class="overflow-x-auto rounded-xl border border-line">
              <table class="w-full border-collapse text-left text-[0.95rem]">
                <thead class="bg-sunken">
                  <tr>
                    <th scope="col" class="px-3 py-2">{{ $t('guides.quantity') }}</th>
                    <th scope="col" class="px-3 py-2">{{ $t('guides.role') }}</th>
                    <th v-if="guide" scope="col" class="px-3 py-2">{{ $t('guides.meaning') }}</th>
                    <th scope="col" class="px-3 py-2 text-right">{{ $t('guides.start') }}</th>
                    <th v-if="guide" scope="col" class="px-3 py-2">{{ $t('guides.unit') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="q in quantities" :key="q.name" class="border-t border-line align-top">
                    <th scope="row" class="px-3 py-2 font-mono font-semibold">{{ q.label }}</th>
                    <td class="px-3 py-2"><span class="chip" :class="`role-${q.role}`">{{ $t(`roles.${q.role}`) }}</span></td>
                    <td v-if="guide" class="px-3 py-2">{{ q.meaning }}</td>
                    <td class="px-3 py-2 text-right font-mono tabular">{{ q.role === 'rate' ? '–' : fmt(q.start) }}</td>
                    <td v-if="guide" class="px-3 py-2 whitespace-nowrap">{{ q.unit }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 class="mb-3 text-2xl font-bold">{{ $t('guides.program') }}</h2>
            <ol class="flex flex-col gap-3">
              <li v-for="(l, i) in lines" :key="i" class="grid gap-1 rounded-xl border border-line bg-sheet p-3 sm:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] sm:gap-4">
                <code class="overflow-x-auto font-mono text-[0.95rem] font-semibold whitespace-pre">{{ l.code }}</code>
                <span v-if="l.explanation" class="text-muted">{{ l.explanation }}</span>
              </li>
            </ol>
          </section>

          <template v-if="guide">
            <section>
              <h2 class="mb-2 text-2xl font-bold">{{ $t('guides.observe') }}</h2>
              <p class="max-w-[65ch]">{{ local(guide.observe) }}</p>
            </section>

            <section>
              <h2 class="mb-3 text-2xl font-bold">{{ $t('guides.tasks') }}</h2>
              <ol class="flex flex-col gap-3">
                <li v-for="(task, i) in guide.tasks" :key="i" class="flex gap-3">
                  <span class="step flex-none">{{ i + 1 }}</span>
                  <div class="min-w-0">
                    <p>{{ local(task.text) }}</p>
                    <details v-if="task.hint" class="mt-1 text-[0.95rem] text-muted">
                      <summary class="cursor-pointer font-semibold">{{ $t('guides.hint') }}</summary>
                      <p class="mt-1">{{ local(task.hint) }}</p>
                    </details>
                  </div>
                </li>
              </ol>
              <a :href="appLink" class="btn mt-4 no-underline">{{ $t('guides.openInApp') }} <ArrowRight :size="18" aria-hidden="true" /></a>
            </section>

            <section v-if="guide.limits">
              <h2 class="mb-2 text-2xl font-bold">{{ $t('guides.limits') }}</h2>
              <p class="max-w-[65ch]">{{ local(guide.limits) }}</p>
            </section>

            <section v-if="guide.glossary?.length">
              <h2 class="mb-2 text-2xl font-bold">{{ $t('guides.glossary') }}</h2>
              <dl class="flex flex-col gap-2">
                <div v-for="(g, i) in guide.glossary" :key="i">
                  <dt class="font-bold">{{ local(g.term) }}</dt>
                  <dd class="text-muted">{{ local(g.definition) }}</dd>
                </div>
              </dl>
            </section>
          </template>

          <section v-if="example.sources?.length">
            <h2 class="mb-2 text-2xl font-bold">{{ $t('guides.sources') }}</h2>
            <ul class="flex flex-col gap-2 text-[0.95rem]">
              <li v-for="(src, i) in example.sources" :key="i">
                <a :href="src.url" target="_blank" rel="noopener" class="font-semibold text-accent-strong underline underline-offset-2">{{ src.title }}</a>
                <span class="text-muted"> – {{ src.publisher }} · {{ src.license }}</span>
              </li>
            </ul>
          </section>
        </article>

        <aside class="panel flex min-w-0 flex-col gap-3 p-4 lg:sticky lg:top-4">
          <p class="eyebrow">{{ $t('guides.liveChart') }} · {{ $t('guides.steps', { n: example.steps }) }}</p>
          <ResultChart :result="result" :x="example.plot.x" :ys="example.plot.y" />
          <a :href="appLink" class="btn btn-primary justify-center no-underline">{{ $t('guides.openInApp') }} <ArrowRight :size="18" aria-hidden="true" /></a>
        </aside>
      </div>
    </main>

    <SiteFooter />
  </div>
</template>

<script>
import { ArrowRight } from 'lucide-vue-next'
import SiteHeader from '../site/SiteHeader.vue'
import SiteFooter from '../site/SiteFooter.vue'
import ResultChart from '../components/ResultChart.vue'
import { siteLink } from '../site/links.js'
import { exampleText, findExample, findGuide, local, programOf } from './data.js'
import { analyse, formatNumber } from '../engine/model.js'
import { simulate } from '../engine/simulate.js'
import { numberLocale } from '../i18n/index.js'

// The build copies this page to examples/<id>/index.html and fills data-example;
// during development the id can also be given as #<id>.
function currentId() {
  const fromBuild = document.getElementById('app')?.dataset.example
  if (fromBuild && !fromBuild.startsWith('%')) return fromBuild
  return location.hash.slice(1)
}

export default {
  name: 'GuidePage',
  components: { ArrowRight, SiteHeader, SiteFooter, ResultChart },
  data() {
    const example = findExample(currentId())
    return { example, guide: example ? findGuide(example.id) : null }
  },
  computed: {
    title() { return this.example ? exampleText(this.example, 'title') : '' },
    appLink() { return `${siteLink('../../', 'app/')}#${this.example.id}` },
    analysis() { return analyse(programOf(this.example)) },
    result() { return simulate(this.analysis.program, this.example.start, this.example.steps) },
    quantities() {
      const byName = new Map((this.guide?.quantities ?? []).map((q) => [q.name.toUpperCase(), q]))
      return [...this.analysis.program.variables].map(([name, label]) => {
        const q = byName.get(name)
        return { name, label, role: this.analysis.roles.get(name), start: this.example.start[name] ?? 0, meaning: local(q?.meaning), unit: local(q?.unit) }
      })
    },
    lines() {
      const explained = new Map((this.guide?.lines ?? []).map((l) => [l.code.replace(/\s+/g, ''), local(l.explanation)]))
      return programOf(this.example).split('\n')
        .filter((l) => l.trim() && !l.trim().startsWith('//'))
        .map((code) => ({ code: code.trim(), explanation: explained.get(code.replace(/\s+/g, '')) ?? '' }))
    },
  },
  watch: {
    '$i18n.locale': { immediate: true, handler() { document.title = `${this.title || this.$t('guides.notFound')} · Modellwerk` } },
  },
  methods: {
    siteLink,
    local,
    exampleText,
    fmt(v) { return formatNumber(v, 6, numberLocale()) },
  },
}
</script>
