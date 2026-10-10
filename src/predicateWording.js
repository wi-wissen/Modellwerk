// Own wording for the sentence building blocks, per language – like the legacy
// program, which reads its predicates from an editable text file. Only the words
// change; what a sentence does stays the same. Kept in this browser (or app).
import { reactive } from 'vue'

const KEY = 'modellwerk.predicates'

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) ?? {} } catch { return {} }
}

export const wording = reactive(load()) // { de: { increase: 'wächst um', … }, en: { … } }

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(wording)) } catch { /* private mode: keep in memory */ }
}

/** Own wording of predicate `p` in `locale`, or '' for the standard text. */
export const ownWording = (locale, p) => wording[locale]?.[p]?.trim() ?? ''

export function setWording(locale, p, text) {
  wording[locale] = { ...(wording[locale] ?? {}), [p]: text }
  save()
}

export function resetWording(locale) {
  delete wording[locale]
  save()
}
