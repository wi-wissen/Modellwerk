// Modell-Analyse und sprachliche Modellierung.
import { parseProgram } from './language.js'

export const PREDICATES = [
  { id: 'zu', text: 'nimmt zu um', hint: 'Die Größe wächst in jedem Schritt um die Rate.' },
  { id: 'ab', text: 'nimmt ab um', hint: 'Die Größe schrumpft in jedem Schritt um die Rate.' },
  { id: 'prop', text: 'ist proportional zu', hint: 'Die Rate ist ein fester Faktor mal einem Term.' },
  { id: 'const', text: 'ist konstant gleich', hint: 'Die Rate hat immer denselben Wert.' },
]

/**
 * Bestimmt die Rolle jeder Variablen:
 *  state    – Zustandsgröße (wird aus sich selbst fortgeschrieben, z. B. N := N + Zu)
 *  rate     – Veränderungsrate oder Hilfsgröße (wird berechnet)
 *  constant – Konstante/Parameter (wird nie zugewiesen)
 *  time     – Zeitvariable (Zeit/t, wird um einen festen Schritt erhöht)
 */
export function analyse(source, options = {}) {
  const program = parseProgram(source, options)
  const roles = new Map()
  const flows = [] // { rate, state, sign }
  const influences = [] // { from, to }
  const refs = (n, out = new Set()) => {
    if (!n) return out
    if (n.kind === 'var') out.add(n.name)
    for (const k of ['left', 'right', 'arg', 'expr']) refs(n[k], out)
    return out
  }
  for (const s of program.statements) {
    if (s.kind !== 'assign') continue
    const used = refs(s.expr)
    if (used.has(s.name)) {
      const others = [...used].filter((u) => u !== s.name)
      const isTime = others.length === 0 || /^(ZEIT|T|TIME)$/i.test(s.name)
      roles.set(s.name, isTime && others.every((o) => /^(DELTAT|DT|ZEITSCHRITT)$/i.test(o)) ? 'time' : 'state')
      if (roles.get(s.name) === 'state') {
        // Summanden von N := N + a - b … als Zu- und Abflüsse lesen
        const terms = []
        const flatten = (n, sign) => {
          if (n.kind === 'bin' && (n.op === '+' || n.op === '-')) {
            flatten(n.left, sign)
            flatten(n.right, n.op === '+' ? sign : -sign)
          } else terms.push({ n, sign })
        }
        flatten(s.expr, 1)
        for (const { n, sign } of terms) {
          if (n.kind === 'var' && n.name === s.name) continue
          for (const o of refs(n)) {
            if (o !== s.name && !/^(DELTAT|DT|ZEITSCHRITT)$/i.test(o)) flows.push({ rate: o, state: s.name, sign: sign > 0 ? '+' : '-' })
          }
        }
      }
    } else if (!roles.has(s.name)) {
      roles.set(s.name, 'rate')
      for (const u of used) influences.push({ from: u, to: s.name })
    }
  }
  for (const name of program.variables.keys()) if (!roles.has(name)) roles.set(name, 'constant')
  // Raten, die nur als Fluss vorkommen, aber nie berechnet werden, sind Konstanten
  for (const f of flows) if (!roles.has(f.rate)) roles.set(f.rate, 'constant')
  return { program, roles, flows, influences }
}

/** Übersetzt Sätze des sprachlichen Modells in das Programm (wie „In Algorithmus übersetzen“). */
export function sentencesToProgram(sentences, { simplified = true, timeName = 'Zeit', dtName = 'DeltaT' } = {}) {
  const rates = []
  const states = []
  for (const s of sentences) {
    const subject = s.subject.trim()
    const object = s.object.trim()
    if (!subject || !object) continue
    const step = simplified ? object : `${object}*${dtName}`
    if (s.predicate === 'zu') states.push(`${subject} := ${subject} + ${step}`)
    else if (s.predicate === 'ab') states.push(`${subject} := ${subject} - ${step}`)
    else if (s.predicate === 'prop') rates.push(`${subject} := F${subject}*${object}`)
    else if (s.predicate === 'const') rates.push(`${subject} := ${object}`)
  }
  const time = simplified ? `${timeName} := ${timeName} + 1` : `${timeName} := ${timeName} + ${dtName}`
  return [...rates, ...states, time].join('\n')
}

/** Zahl aus deutscher oder englischer Schreibweise lesen („0,5“, „1,6E-19“). */
export function parseNumber(text) {
  const t = String(text).trim().replace(/\s/g, '').replace(',', '.')
  if (t === '' || !/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(t)) return null
  return Number(t)
}

export function formatNumber(x, digits = 6) {
  if (!Number.isFinite(x)) return Number.isNaN(x) ? 'nicht definiert' : x > 0 ? '∞' : '−∞'
  if (x === 0) return '0'
  const a = Math.abs(x)
  if (a >= 1e7 || a < 1e-4) return x.toExponential(digits - 1).replace('.', ',').replace('e', ' · 10^').replace('+', '')
  return Number(x.toPrecision(digits)).toLocaleString('de-DE', { maximumFractionDigits: 10 })
}
