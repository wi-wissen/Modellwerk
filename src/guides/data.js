// Example metadata and guide texts shared by the overview and guide pages.
import { EXAMPLES } from '../examples.js'
import GUIDES from './guides.json' with { type: 'json' }
import { sentencesToProgram } from '../engine/model.js'
import { i18n, t } from '../i18n/index.js'

export { EXAMPLES }

export const findExample = (id) => EXAMPLES.find((e) => e.id === id) ?? null
export const findGuide = (id) => GUIDES.find((g) => g.id === id) ?? null

/** Text in the current language: { de, en } objects, plain strings or i18n fallbacks. */
export function local(value) {
  if (value == null) return ''
  if (typeof value === 'string') return value
  return value[i18n.locale] ?? value.de ?? ''
}

export function exampleText(ex, key) {
  return ex.texts ? local(ex.texts[key]) : t(`examples.${ex.id}.${key}`)
}

export function programOf(ex) {
  return ex.mode === 'sentences' ? sentencesToProgram(ex.sentences, { simplified: ex.simplified ?? true }) : ex.source
}
