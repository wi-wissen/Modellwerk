// Model analysis and sentence-based modelling.
import { parseProgram } from './language.js'
import { stockFlows, stockLine } from './flows.js'

// Building blocks of sentence-based models (texts live in src/i18n)
export const PREDICATES = ['increase', 'decrease', 'proportional', 'constant', 'equals']

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
  // assignments in order, including those inside IF/WHILE bodies
  const assignments = []
  const collect = (list) => list.forEach((s) => (s.kind === 'assign' ? assignments.push(s) : collect(s.body)))
  collect(program.statements)
  for (const s of assignments) {
    const used = refs(s.expr)
    if (used.has(s.name)) {
      // time: T := T + 1 or T := T + dt (a counter is treated as time as well)
      const e = s.expr
      const isTime = e.kind === 'bin' && e.op === '+' && e.left.kind === 'var' && e.left.name === s.name &&
        ((e.right.kind === 'num' && (e.right.value === 1 || TIME_NAME.test(s.name))) ||
          (e.right.kind === 'var' && (TIME_STEP.test(e.right.name) || TIME_NAME.test(s.name))))
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

const NAMES = /[A-Za-zÄÖÜäöüß_][A-Za-z0-9ÄÖÜäöüß_]*/g

/**
 * Translates the sentences of a sentence-based model into a program, in the
 * usual order of stock-and-flow models:
 *   1. calculated quantities that feed a flow (directly or through others),
 *   2. one line per stock with all its flows (flows.js, the form the diagram
 *      writes), in the order the stocks first appear,
 *   3. the remaining calculated quantities (outputs such as °C or km/h, worked
 *      out from the new stock values),
 *   4. the time line.
 * Within each group the sentences keep their order. A proportional sentence may
 * name its factor (`factor`); the default is F<subject>.
 */
export function sentencesToProgram(sentences, { simplified = true, timeName = 'Zeit', dtName = 'DeltaT' } = {}) {
  const calc = [] // { key, line, uses }
  const stocks = new Map()
  for (const s of sentences) {
    const subject = s.subject.trim()
    const object = s.object.trim()
    if (!subject || !object) continue
    if (s.predicate === 'increase' || s.predicate === 'decrease') {
      const key = subject.toUpperCase()
      if (!stocks.has(key)) stocks.set(key, { name: subject, flows: [] })
      stocks.get(key).flows.push({ name: object, sign: s.predicate === 'increase' ? '+' : '-' })
      continue
    }
    const term = s.predicate === 'proportional' ? `${s.factor?.trim() || `F${subject}`}*${object}` : object
    if (!['proportional', 'constant', 'equals'].includes(s.predicate)) continue
    calc.push({ key: subject.toUpperCase(), line: `${subject} := ${term}`, uses: new Set((term.match(NAMES) ?? []).map((n) => n.toUpperCase())) })
  }
  // everything a flow needs, followed back through the calculated quantities
  const feeding = new Set()
  for (const z of stocks.values()) for (const f of z.flows) for (const n of f.name.match(NAMES) ?? []) feeding.add(n.toUpperCase())
  for (let grown = true; grown;) {
    grown = false
    for (const c of calc) {
      if (!feeding.has(c.key)) continue
      for (const u of c.uses) if (!feeding.has(u)) { feeding.add(u); grown = true }
    }
  }
  const time = simplified ? `${timeName} := ${timeName} + 1` : `${timeName} := ${timeName} + ${dtName}`
  return [
    ...calc.filter((c) => feeding.has(c.key)).map((c) => c.line),
    ...[...stocks.values()].map((z) => stockLine(z.name, z.flows, { simplified, dtName })),
    ...calc.filter((c) => !feeding.has(c.key)).map((c) => c.line),
    time,
  ].join('\n')
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

function walkExpr(n, visit) {
  visit(n)
  if (n.kind === 'bin') { walkExpr(n.left, visit); walkExpr(n.right, visit) }
  else if (n.kind === 'neg') walkExpr(n.arg, visit)
  else if (n.kind === 'call') walkExpr(n.arg, visit)
}

// Name of the factor when the expression is "factor * rest" (only * and / to the
// left of it, the factor a plain variable multiplied first), else null
function proportionalFactor(n) {
  let parentOp = null
  while (n.kind === 'bin' && (n.op === '*' || n.op === '/')) { parentOp = n.op; n = n.left }
  return n.kind === 'var' && parentOp === '*' ? n.name : null
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
 * { ok: false, line, reason } naming the first line that fits no sentence pattern;
 * reason is 'error' | 'time' | 'condition' | 'macro' | 'pattern' | 'order'.
 */
export function programToSentences(source, { macros = [] } = {}) {
  const program = parseProgram(source, { macros })
  if (program.errors.length || !program.statements.length) return { ok: false, line: program.errors[0]?.line ?? null, reason: 'error' }
  const stmts = program.statements
  const last = stmts[stmts.length - 1]
  const raw = (name) => program.variables.get(name) ?? name
  // conditions, loops and macro calls have no sentence: name them first
  const special = stmts.find((s) => s.kind !== 'assign')
  if (special) return { ok: false, line: special.line, reason: special.kind === 'macro' ? 'macro' : 'condition' }

  // time line: T := T + 1 (simplified) or T := T + DT
  const timeOk = last.kind === 'assign' && last.expr.kind === 'bin' && last.expr.op === '+' &&
    last.expr.left.kind === 'var' && last.expr.left.name === last.name
  if (!timeOk) return { ok: false, line: last.line, reason: 'time' }
  const stepNode = last.expr.right
  const simplified = stepNode.kind === 'num' && stepNode.value === 1
  if (!simplified && stepNode.kind !== 'var') return { ok: false, line: last.line, reason: 'time' }
  const dtName = simplified ? 'DeltaT' : raw(stepNode.name)

  const dtU = simplified ? null : stepNode.name
  const lines = source.split('\n')
  const perLine = new Map()
  for (const s of stmts) perLine.set(s.line, (perLine.get(s.line) ?? 0) + 1)
  const sentences = []
  for (const s of stmts.slice(0, -1)) {
    if (s.kind === 'macro') return { ok: false, line: s.line, reason: 'macro' }
    if (s.kind !== 'assign') return { ok: false, line: s.line, reason: 'condition' }
    if (perLine.get(s.line) > 1) return { ok: false, line: s.line, reason: 'pattern' }
    const e = s.expr
    const subject = s.raw
    let selfRef = false
    walkExpr(e, (n) => { if (n.kind === 'var' && n.name === s.name) selfRef = true })
    if (selfRef) {
      // a stock: one sentence per flow
      const flows = stockFlows(e, s.name, simplified, dtU)
      if (!flows?.length) return { ok: false, line: s.line, reason: 'pattern' }
      for (const f of flows) sentences.push({ subject, predicate: f.sign === '+' ? 'increase' : 'decrease', object: raw(f.name) })
      continue
    }
    const text = lines[s.line - 1].split('//')[0].replace(/^[^:=]*(:=|=)/, '').replace(/;\s*$/, '').trim()
    const factor = proportionalFactor(e)
    if (e.kind === 'num') {
      sentences.push({ subject, predicate: 'constant', object: text })
    } else if (factor) {
      const sentence = { subject, predicate: 'proportional', object: text.replace(/^[^*]*\*/, '').trim() }
      if (factor !== `F${s.name}`) sentence.factor = raw(factor)
      sentences.push(sentence)
    } else {
      sentences.push({ subject, predicate: 'equals', object: text })
    }
  }

  // lossless only if the sentences regenerate the very same statements
  const regenerated = parseProgram(sentencesToProgram(sentences, { simplified, timeName: last.raw, dtName }))
  const a = stmts.map(serialize).join(';')
  const b = regenerated.statements.map(serialize).join(';')
  if (a !== b) {
    const i = stmts.findIndex((s, k) => serialize(s) !== serialize(regenerated.statements[k]))
    return { ok: false, line: stmts[Math.max(0, i)].line, reason: 'order' }
  }
  return { ok: true, sentences, simplified, timeName: last.raw, dtName }
}
