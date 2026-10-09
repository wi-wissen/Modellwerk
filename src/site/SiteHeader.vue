<template>
  <header class="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-4 sm:px-6">
    <a :href="siteLink(root)" class="flex items-center gap-3 rounded-lg text-ink no-underline">
      <img :src="logoUrl" width="36" height="36" alt="" />
      <span class="text-lg font-extrabold tracking-tight">Modellwerk</span>
    </a>
    <div class="flex flex-wrap items-center gap-1">
      <nav class="flex items-center gap-1" :aria-label="$t('site.examples')">
        <a :href="siteLink(root, 'examples/')" class="btn btn-quiet no-underline" :aria-current="current === 'examples' ? 'page' : null">{{ $t('site.examples') }}</a>
        <a :href="siteLink(root, 'app/')" class="btn btn-quiet no-underline">{{ $t('site.openApp') }}</a>
      </nav>
      <button type="button" class="btn btn-quiet" :aria-label="`${$t('app.language')}: ${otherLocale.name}`" :lang="otherLocale.code" @click="setLocale(otherLocale.code)">
        <Languages :size="20" aria-hidden="true" /> <span class="text-sm">{{ otherLocale.code.toUpperCase() }}</span>
      </button>
      <button type="button" class="btn btn-quiet" :aria-label="$t(`app.theme.${theme}`)" :title="$t(`app.theme.${theme}`)" @click="theme = nextTheme(theme)">
        <Sun v-if="theme === 'light'" :size="20" aria-hidden="true" /><Moon v-else-if="theme === 'dark'" :size="20" aria-hidden="true" /><Monitor v-else :size="20" aria-hidden="true" />
      </button>
    </div>
  </header>
</template>

<script>
import { Languages, Monitor, Moon, Sun } from 'lucide-vue-next'
import { LOCALES, i18n, setLocale } from '../i18n/index.js'
import { applyTheme, loadTheme, nextTheme } from './theme.js'
import { siteLink } from './links.js'
import logoUrl from '../assets/logo.svg'

export default {
  name: 'SiteHeader',
  components: { Languages, Monitor, Moon, Sun },
  props: {
    root: { type: String, default: './' },
    current: { type: String, default: '' },
  },
  data() {
    return { logoUrl, theme: loadTheme() }
  },
  computed: {
    otherLocale() {
      const code = i18n.locale === 'de' ? 'en' : 'de'
      return { code, name: LOCALES[code].name }
    },
  },
  watch: {
    theme: { immediate: true, handler: applyTheme },
  },
  methods: { setLocale, nextTheme, siteLink },
}
</script>
