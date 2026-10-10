<template>
  <div class="site-page flex min-h-screen flex-col">
    <SiteHeader root="./" />

    <main class="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-16 px-4 pb-16 pt-8 sm:px-6 sm:pt-14">
      <section class="grid items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]" aria-labelledby="claim">
        <div class="flex flex-col gap-6">
          <h1 id="claim" class="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">{{ $t('landing.claim') }}</h1>
          <p class="max-w-[46ch] text-lg text-muted sm:text-xl">{{ $t('landing.lead') }}</p>
          <div class="flex flex-wrap items-center gap-4">
            <a :href="siteLink('./', 'app/')" class="btn btn-primary !min-h-12 !px-6 text-lg no-underline">
              {{ $t('landing.openApp') }} <ArrowRight :size="20" aria-hidden="true" />
            </a>
            <a :href="siteLink('./', 'examples/')" class="btn !min-h-12 !px-5 text-lg no-underline">{{ $t('guides.allExamples') }}</a>
          </div>
          <p class="text-muted">{{ $t('landing.free') }}</p>
        </div>

        <figure class="panel flex flex-col gap-4 p-5 sm:p-6">
          <p class="eyebrow">{{ $t('landing.demoLabel') }}</p>
          <ul class="flex flex-col gap-2 font-semibold">
            <li class="flex items-center gap-2"><span class="chip role-state">{{ $t('roles.state') }}</span> {{ $t('landing.demoSentence1') }}</li>
            <li class="flex items-center gap-2"><span class="chip role-rate">{{ $t('roles.rate') }}</span> {{ $t('landing.demoSentence2') }}</li>
          </ul>
          <svg viewBox="0 0 320 150" class="block h-auto w-full" role="img" :aria-label="$t('landing.demoCaption')">
            <g stroke="var(--grid)" stroke-width="1">
              <line v-for="k in 4" :key="k" x1="0" x2="320" :y1="k * 30" :y2="k * 30" />
            </g>
            <line x1="0" x2="320" y1="140" y2="140" stroke="var(--line)" />
            <polyline :points="curve('HOEHE')" fill="none" stroke="var(--s1)" stroke-width="3" stroke-linejoin="round" />
            <polyline :points="curve('WACHSTUM')" fill="none" stroke="var(--s3)" stroke-width="3" stroke-dasharray="8 5" stroke-linejoin="round" />
          </svg>
          <figcaption class="text-sm text-muted">{{ $t('landing.demoCaption') }}</figcaption>
        </figure>
      </section>

      <section class="grid gap-x-8 gap-y-6 border-t border-line pt-10 sm:grid-cols-2 lg:grid-cols-4" :aria-label="$t('landing.title')">
        <div v-for="(f, i) in $t('landing.features')" :key="i" class="flex flex-col gap-2">
          <component :is="featureIcons[i]" :size="22" aria-hidden="true" class="text-accent" />
          <h2 class="text-lg font-bold">{{ f.title }}</h2>
          <p class="text-muted">{{ f.text }}</p>
        </div>
      </section>

      <section id="offline" class="flex flex-col gap-6 border-t border-line pt-10" aria-labelledby="offline-title">
        <div class="flex max-w-[62ch] flex-col gap-2">
          <h2 id="offline-title" class="text-2xl font-extrabold tracking-tight sm:text-3xl">{{ $t('landing.offline.title') }}</h2>
          <p class="text-lg text-muted">{{ $t('landing.offline.lead') }}</p>
        </div>
        <ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <li v-for="v in offlineVariants" :key="v.key" class="panel flex flex-col gap-2 p-5">
            <component :is="v.icon" :size="22" aria-hidden="true" class="text-accent" />
            <h3 class="text-lg font-bold">{{ $t(`landing.offline.${v.key}.title`) }}</h3>
            <p class="flex-1 text-muted">{{ $t(`landing.offline.${v.key}.text`) }}</p>
            <a :href="v.href" class="inline-flex items-center gap-1.5 font-semibold text-accent-strong underline underline-offset-2">
              <component :is="v.external ? 'Download' : 'ArrowRight'" :size="16" aria-hidden="true" /> {{ $t(`landing.offline.${v.key}.link`) }}
            </a>
          </li>
        </ul>
        <p class="flex flex-wrap items-center gap-x-3 gap-y-1">
          <a :href="releases" class="inline-flex items-center gap-1.5 font-semibold text-accent-strong underline underline-offset-2">
            <ExternalLink :size="18" aria-hidden="true" /> {{ $t('landing.offline.all') }}
          </a>
          <span class="text-muted">{{ $t('landing.offline.note') }}</span>
        </p>
      </section>
    </main>

    <SiteFooter />
  </div>
</template>

<script>
import { Accessibility, AppWindow, ArrowRight, Download, ExternalLink, FileCheck2, FileCode2, Globe, Layers, ShieldCheck, Smartphone, Terminal } from 'lucide-vue-next'
import SiteHeader from '../site/SiteHeader.vue'
import SiteFooter from '../site/SiteFooter.vue'
import { RELEASES, latestDownload, siteLink } from '../site/links.js'
import { simulate } from '../engine/simulate.js'
import { sparkPoints } from '../chartStyle.js'

// a sunflower grows logistically: fast in midsummer, slowing down near its final height
const DEMO = 'Wachstum := FWachstum*Hoehe*(Endhoehe-Hoehe)\nHoehe := Hoehe + Wachstum\nTag := Tag + 1'

export default {
  name: 'LandingPage',
  components: { Accessibility, AppWindow, ArrowRight, Download, ExternalLink, FileCheck2, FileCode2, Globe, Layers, ShieldCheck, Smartphone, Terminal, SiteHeader, SiteFooter },
  data() {
    return {
      featureIcons: ['Layers', 'Accessibility', 'ShieldCheck', 'FileCheck2'],
      demo: simulate(DEMO, { HOEHE: 8, ENDHOEHE: 250, FWACHSTUM: 0.0009 }, 70),
      releases: RELEASES,
      // files with a fixed name link straight to the newest release, the others to its page
      offlineVariants: [
        { key: 'browser', icon: 'Globe', href: siteLink('./', 'app/') },
        { key: 'file', icon: 'FileCode2', href: latestDownload('modellwerk-offline.html'), external: true },
        { key: 'windows', icon: 'AppWindow', href: latestDownload('Modellwerk-portable.exe'), external: true },
        { key: 'linux', icon: 'Terminal', href: `${RELEASES}/latest` },
        { key: 'android', icon: 'Smartphone', href: latestDownload('Modellwerk-android.apk'), external: true },
      ],
    }
  },
  watch: {
    '$i18n.locale': {
      immediate: true,
      handler() { document.title = this.$t('landing.title') },
    },
  },
  methods: {
    siteLink,
    curve(name) {
      return sparkPoints(this.demo.series[name], 320, 144, 71, 4)
    },
  },
}
</script>
