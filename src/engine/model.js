// Model analysis and sentence-based modelling.
import { parseProgram } from './language.js'

// Building blocks of sentence-based models (texts live in src/i18n)
export const PREDICATES = ['increase', 'decrease', 'proportional', 'constant']

const TIME_STEP = /^(DELTAT|DT|ZEITSCHRITT|TIMESTEP)$/i
const TIME_NAME = /^(ZEIT|T|TIME)$/i

/**
 * Determines the role of each variable:
 *  state    – stock, updated from itself (e.g. N := N + inflow)
 *  rate     – rate of change or helper quantity (calculated)
 *  constant – parameter, never assigned
 *  time     – time variable, advanced by a fixed step
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
      const isTime = (others.length === 0 || TIME_NAME.test(s.name)) && others.every((o) => TIME_STEP.test(o))
      roles.set(s.name, isTime ? 'time' : 'state')
      if (!isTime) {
        // read the summands of N := N + a - b … as inflows and outflows
        const terms = []
        const isStep = (n) => n.kind === 'var' && TIME_STEP.test(n.name)
        const flatten = (n, sign) => {
          if (n.kind === 'bin' && (n.op === '+' || n.op === '-')) {
            flatten(n.left, sign)
            flatten(n.right, n.op === '+' ? sign : -sign)
          } else if (n.kind === 'bin' && n.op === '*' && (isStep(n.right) || isStep(n.left))) {
            flatten(isStep(n.right) ? n.left : n.right, sign) // (a - b)*dt
          } else if (n.kind === 'neg') {
            flatten(n.arg, -sign)
          } else terms.push({ n, sign })
        }
        flatten(s.expr, 1)
        for (const { n, sign } of terms) {
          if (n.kind === 'var' && n.name === s.name) continue
          for (const o of refs(n)) {
            if (o !== s.name && !TIME_STEP.test(o)) flows.push({ rate: o, state: s.name, sign: sign > 0 ? '+' : '-' })
          }
        }
      }
    } else if (!roles.has(s.name)) {
      roles.set(s.name, 'rate')
      for (const u of used) influences.push({ from: u, to: s.name })
    }
  }
  for (const name of program.variables.keys()) if (!roles.has(name)) roles.set(name, 'constant')
  return { program, roles, flows, influences }
}

/** Translates the sentences of a sentence-based model into a program. */
export function sentencesToProgram(sentences, { simplified = true, timeName = 'Zeit', dtName = 'DeltaT' } = {}) {
  const rates = []
  const states = []
  for (const s of sentences) {
    const subject = s.subject.trim()
    const object = s.object.trim()
    if (!subject || !object) continue
    const step = simplified ? object : `${object}*${dtName}`
    if (s.predicate === 'increase') states.push(`${subject} := ${subject} + ${step}`)
    else if (s.predicate === 'decrease') states.push(`${subject} := ${subject} - ${step}`)
    else if (s.predicate === 'proportional') rates.push(`${subject} := F${subject}*${object}`)
    else if (s.predicate === 'constant') rates.push(`${subject} := ${object}`)
  }
  const time = simplified ? `${timeName} := ${timeName} + 1` : `${timeName} := ${timeName} + ${dtName}`
  return [...rates, ...states, time].join('\n')
}

/** Parses a number written with decimal comma or point ("0,5", "1.6E-19"). */
export function parseNumber(text) {
  const t = String(text).trim().replace(/\s/g, '').replace(',', '.')
  if (t === '' || !/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(t)) return null
  return Number(t)
}

export function formatNumber(x, digits = 6, locale = 'de-DE') {
  if (!Number.isFinite(x)) return Number.isNaN(x) ? '–' : x > 0 ? '∞' : '−∞'
  if (x === 0) return '0'
  const a = Math.abs(x)
  if (a >= 1e7 || a < 1e-4) {
    const decimal = (1.5).toLocaleString(locale).charAt(1)
    const [m, e] = x.toExponential(digits - 1).split('e')
    return `${m.replace('.', decimal)} · 10^${Number(e)}`
  }
  return Number(x.toPrecision(digits)).toLocaleString(locale, { maximumFractionDigits: 10 })
}

function leftmostFactor(n) {
  while (n.kind === 'bin' && n.op === '*') n = n.left
  return n
}

function serialize(n) {
  if (!n) return ''
  switch (n.kind) {
    case 'num': return String(n.value)
    case 'var': return n.name
    case 'neg': return `(-${serialize(n.arg)})`
    case 'call': return `${n.name}(${serialize(n.arg)})`
    case 'bin': return `(${serialize(n.left)}${n.op}${serialize(n.right)})`
    case 'assign': return `${n.name}:=${serialize(n.expr)}`
    default: return `${n.kind}?`
  }
}

/**
 * Turns a program back into sentences when that is lossless: the sentences must
 * regenerate a program with exactly the same statements in the same order.
 * Returns { ok: true, sentences, simplified, timeName, dtName } or
 * { ok: false, line } naming the first line that fits no sentence pattern.
 */
export function programToSentences(source) {
  const program = parseProgram(source)
  if (program.errors.length || !program.statements.length) return { ok: false, line: program.errors[0]?.line ?? null }
  const stmts = program.statements
  const last = stmts[stmts.length - 1]
  const raw = (name) => program.variables.get(name) ?? name

  // time line: T := T + 1 (simplified) or T := T + DT
  const timeOk = last.kind === 'assign' && last.expr.kind === 'bin' && last.expr.op === '+' &&
    last.expr.left.kind === 'var' && last.expr.left.name === last.name
  if (!timeOk) return { ok: false, line: last.line }
  const stepNode = last.expr.right
  const simplified = stepNode.kind === 'num' && stepNode.value === 1
  if (!simplified && stepNode.kind !== 'var') return { ok: false, line: last.line }
  const dtName = simplified ? 'DeltaT' : raw(stepNode.name)

  const sentences = []
  for (const s of stmts.slice(0, -1)) {
    if (s.kind !== 'assign') return { ok: false, line: s.line }
    const e = s.expr
    const subject = s.raw
    const isSelf = e.kind === 'bin' && (e.op === '+' || e.op === '-') && e.left.kind === 'var' && e.left.name === s.name
    if (isSelf) {
      let rate = e.right
      if (!simplified) {
        if (!(rate.kind === 'bin' && rate.op === '*' && rate.right.kind === 'var' && rate.right.name === stepNode.name)) return { ok: false, line: s.line }
        rate = rate.left
      }
      if (rate.kind !== 'var') return { ok: false, line: s.line }
      sentences.push({ subject, predicate: e.op === '+' ? 'increase' : 'decrease', object: raw(rate.name) })
    } else if (e.kind === 'num') {
      sentences.push({ subject, predicate: 'constant', object: String(e.value).replace('.', ',') })
    } else if (e.kind === 'bin' && e.op === '*' && leftmostFactor(e).kind === 'var' && leftmostFactor(e).name === `F${s.name}`) {
      const object = source.split('\n')[s.line - 1].split('//')[0].replace(/^[^*]*\*/, '').replace(/;\s*$/, '').trim()
      sentences.push({ subject, predicate: 'proportional', object })
    } else {
      return { ok: false, line: s.line }
    }
  }

  // lossless only if the sentences regenerate the very same statements
  const regenerated = parseProgram(sentencesToProgram(sentences, { simplified, timeName: last.raw, dtName }))
  const a = stmts.map(serialize).join(';')
  const b = regenerated.statements.map(serialize).join(';')
  if (a !== b) {
    const i = stmts.findIndex((s, k) => serialize(s) !== serialize(regenerated.statements[k]))
    return { ok: false, line: stmts[Math.max(0, i)].line }
  }
  return { ok: true, sentences, simplified, timeName: last.raw, dtName }
}
