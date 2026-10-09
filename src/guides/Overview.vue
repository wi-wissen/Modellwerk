<template>
  <div class="site-page flex min-h-screen flex-col">
    <SiteHeader root="../" current="examples" />
    <main class="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 pb-16 pt-6 sm:px-6">
      <div class="max-w-[62ch]">
        <h1 class="text-3xl font-extrabold tracking-tight sm:text-4xl">{{ $t('guides.overviewTitle') }}</h1>
        <p class="mt-2 text-lg text-muted">{{ $t('guides.overviewLead') }}</p>
      </div>
      <ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <li v-for="ex in cards" :key="ex.id">
          <a :href="siteLink('../', `examples/${ex.id}/`)" class="panel flex h-full flex-col gap-2 p-5 text-ink no-underline transition-colors hover:border-accent">
            <span class="eyebrow">{{ exampleText(ex, 'topic') }}</span>
            <span class="text-lg font-bold leading-snug">{{ exampleText(ex, 'title') }}</span>
            <svg viewBox="0 0 120 36" class="my-1 block h-9 w-full" aria-hidden="true" preserveAspectRatio="none">
              <polyline v-for="(p, i) in ex.previews" :key="i" :points="p" fill="none" :stroke="seriesColor(i)" stroke-width="2"
                        :stroke-dasharray="seriesDash(i)" vector-effect="non-scaling-stroke" stroke-linejoin="round" />
            </svg>
            <span class="text-sm text-muted">{{ ex.teaser }}</span>
            <span class="mt-auto flex flex-wrap gap-2 pt-2 text-xs text-muted">
              <span v-if="ex.subject" class="chip role-time">{{ local(ex.subject) }}</span>
              <span v-if="ex.level" class="chip role-time">{{ local(ex.level) }}</span>
            </span>
          </a>
        </li>
      </ul>
    </main>
    <SiteFooter />
  </div>
</template>

<script>
import SiteHeader from '../site/SiteHeader.vue'
import SiteFooter from '../site/SiteFooter.vue'
import { siteLink } from '../site/links.js'
import { EXAMPLES, exampleText, findGuide, local, programOf } from './data.js'
import { simulate } from '../engine/simulate.js'
import { seriesColor, seriesDash, sparkPoints } from '../chartStyle.js'

export default {
  name: 'GuideOverview',
  components: { SiteHeader, SiteFooter },
  computed: {
    cards() {
      return EXAMPLES.map((ex) => {
        const r = simulate(programOf(ex), ex.start, ex.steps)
        const guide = findGuide(ex.id)
        return {
          ...ex,
          previews: ex.plot.y.slice(0, 3).map((n) => sparkPoints(r.series[n], 120, 36, 80, 3)),
          teaser: guide ? local(guide.teaser) : exampleText(ex, 'description'),
        }
      })
    },
  },
  watch: {
    '$i18n.locale': { immediate: true, handler() { document.title = `${this.$t('guides.overviewTitle')} · Modellwerk` } },
  },
  methods: { siteLink, exampleText, local, seriesColor, seriesDash },
}
</script>
