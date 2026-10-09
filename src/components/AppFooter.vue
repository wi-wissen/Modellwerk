<template>
  <footer class="mt-6 border-t border-line bg-sheet">
    <div class="mx-auto grid max-w-[96rem] gap-6 px-4 py-6 text-sm sm:px-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]">
      <div class="flex flex-col gap-2">
        <p class="flex items-center gap-2 font-bold"><img :src="logoUrl" width="22" height="22" alt="" /> Modellwerk</p>
        <p class="max-w-[46ch] text-muted">{{ $t('footer.about') }}</p>
        <p class="text-muted tabular">{{ $t('footer.version', { v: version }) }}</p>
      </div>
      <div class="flex flex-col gap-2">
        <h2 class="font-bold">{{ $t('footer.compatTitle') }}</h2>
        <p class="text-muted">{{ $t('footer.compatText') }}</p>
        <p><button type="button" class="btn-link font-semibold" @click="$emit('compare')">{{ $t('footer.compatButton') }}</button></p>
      </div>
      <div class="flex flex-col gap-2">
        <h2 class="font-bold">{{ $t('footer.privacyTitle') }}</h2>
        <p class="text-muted">{{ $t('footer.privacyText') }}</p>
        <label class="mt-1 inline-flex items-center gap-2">
          <span class="font-semibold">{{ $t('app.language') }}</span>
          <select id="footer-locale" class="field !w-auto" :value="$i18n.locale" @change="setLocale($event.target.value)">
            <option v-for="(l, code) in locales" :key="code" :value="code" :lang="code">{{ l.name }}</option>
          </select>
        </label>
      </div>
    </div>
  </footer>
</template>

<script>
import { LOCALES, setLocale } from '../i18n/index.js'
import logoUrl from '../assets/logo.svg'
import pkg from '../../package.json' with { type: 'json' }

export default {
  name: 'AppFooter',
  emits: ['compare'],
  data() {
    return { logoUrl, version: pkg.version, locales: LOCALES }
  },
  methods: { setLocale },
}
</script>
