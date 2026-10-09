// Minimal i18n for the Options API: this.$t('key', { placeholder })
import { reactive } from 'vue'
import { formatText } from '../engine/language.js'
import de from './de.js'
import en from './en.js'

export const LOCALES = {
  de: { name: 'Deutsch', messages: de, number: 'de-DE' },
  en: { name: 'English', messages: en, number: 'en-GB' },
}

function detect() {
  try {
    const saved = JSON.parse(localStorage.getItem('modellwerk.locale'))
    if (saved in LOCALES) return saved
  } catch {
    // storage unavailable: fall back to the browser language
  }
  // German if the browser asks for German anywhere in its list, otherwise English
  const wanted = navigator.languages?.length ? navigator.languages : [navigator.language ?? '']
  return wanted.some((l) => l.toLowerCase().startsWith('de')) ? 'de' : 'en'
}

export const i18n = reactive({ locale: detect() })

function lookup(messages, key) {
  return key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), messages)
}

export function t(key, params) {
  const value = lookup(LOCALES[i18n.locale].messages, key) ?? lookup(de, key) ?? key
  return typeof value === 'string' ? formatText(value, params) : value
}

export function setLocale(locale) {
  i18n.locale = locale
  document.documentElement.lang = locale
  try {
    localStorage.setItem('modellwerk.locale', JSON.stringify(locale))
  } catch {
    // cannot persist; the choice lasts until reload
  }
}

export function numberLocale() {
  return LOCALES[i18n.locale].number
}

/** Engine error in the current language. */
export function errorText(e) {
  if (e?.code) return t(`errors.${e.code}`, e.params)
  return e?.message ?? String(e)
}

export default {
  install(app) {
    document.documentElement.lang = i18n.locale
    app.config.globalProperties.$t = t
    app.config.globalProperties.$i18n = i18n
    app.config.globalProperties.$errorText = errorText
  },
}
