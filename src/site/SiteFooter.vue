<template>
  <footer class="border-t border-line">
    <div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-sm text-muted sm:px-6">
      <span>{{ $t('footer.version', { v: version }) }}</span>
      <span>{{ $t('footer.privacyText') }}</span>
    </div>
  </footer>
</template>

<script>
import pkg from '../../package.json' with { type: 'json' }

export default {
  name: 'SiteFooter',
  data() {
    return { version: pkg.version }
  },
}
</script>
