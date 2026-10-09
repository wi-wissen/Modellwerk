// Graph model of the editable cause-and-effect diagram (stock-and-flow style).
//
//   graph = {
//     nodes: [{ id, kind: 'state' | 'rate' | 'constant' | 'aux', name, x, y, formula }],
//     links: [{ id, from, to, kind: 'flow' | 'influence', sign: '+' | '-' }],
//   }
//
// Node kinds
//   state    – stock; changed only by flows
//   rate     – rate of change; calculated from its formula, drives one or more flows
//   constant – parameter; its value comes from the start values, `formula` stays empty
//   aux      – helper quantity (extended syntax only); calculated, but drives no flow
// Link kinds
//   flow      – rate → state; sign '+' is an inflow, '-' an outflow
//   influence – any node → rate/aux; the target's formula uses the source
//
// Generated program (graphToProgram), in this fixed order:
//   1. every rate and aux as `Name := formula`, in topological order of their
//      dependencies (influence links plus names used in formulas); ties keep the
//      order of `graph.nodes`
//   2. one line per state, in the order of `graph.nodes`, flows in the order of
//      `graph.links`:
//        simplified:  Z := Z + r1 - r2            (also Z := Z - r1, or Z := Z without flows)
//        with DeltaT: Z := Z + r1*DeltaT           (one flow: Z := Z ± r*DeltaT)
//                     Z := Z + (r1 - r2)*DeltaT    (several flows, a leading outflow is written -r1)
//                     Z := Z - (r1 + r2)*DeltaT    (several flows, all of them outflows)
//      Summing the flows first and multiplying once by DeltaT is the textbook Euler
//      step and the form the built-in examples use (Hasen + (Geburten - Gefressen)*dt).
//   3. the time line `Zeit := Zeit + 1` (simplified) or `Zeit := Zeit + DeltaT`,
//      exactly as sentencesToProgram writes it.
//
// Extended syntax (option `extended`)
//   Off (default): no aux nodes, and a function call in a formula must not use a
//   state directly (sqrt(Hoehe) is not allowed, ln(2)/Halbwertszeit is). Rates may
//   still use states and other rates in plain arithmetic (+ - * / ^).
//   On: aux nodes are allowed and functions may take states as arguments.
import { FUNCTIONS, parseProgram } from './language.js'

export const NODE_KINDS = ['state', 'rate', 'constant', 'aux']
export const LINK_KINDS = ['flow', 'influence']

/** Half width and half height of each node shape, shared with the editor. */
export const NODE_SHAPE = {
  state: { rx: 64, ry: 26 },
  rate: { rx: 56, ry: 28 },
  constant: { rx: 52, ry: 16 },
  aux: { rx: 52, ry: 16 },
}

const IDENT = /^[A-Za-zÄÖÜäöüß_][A-Za-z0-9ÄÖÜäöüß_]*$/
const KEYWORDS = new Set(['IF', 'THEN', 'WHILE', 'DO'])
const DEFAULTS = { simplified: true, timeName: 'Zeit', dtName: 'DeltaT', extended: false }

const upper = (s) => String(s ?? '').trim().toUpperCase()

/** A new id that is not used by any node or link of the graph. */
export function nextId(graph, prefix = 'n') {
  const used = new Set([...graph.nodes, ...graph.links].map((x) => x.id))
  let i = graph.nodes.length + graph.links.length + 1
  while (used.has(`${prefix}${i}`)) i++
  return `${prefix}${i}`
}

/** Deep copy (plain data only). */
export function cloneGraph(graph) {
  return JSON.parse(JSON.stringify({ nodes: graph?.nodes ?? [], links: graph?.links ?? [] }))
}

/** Can `from` be connected to `to` with a link of this kind? */
export function canLink(from, to, kind) {
  if (!from || !to || from.id === to.id) return false
  if (kind === 'flow') return from.kind === 'rate' && to.kind === 'state'
  return to.kind === 'rate' || to.kind === 'aux'
}

const walk = (n, visit, inCall = null) => {
  if (!n) return
  visit(n, inCall)
  if (n.kind === 'call') walk(n.arg, visit, n.name)
  else for (const k of ['left', 'right', 'arg']) walk(n[k], visit, inCall)
}

/**
 * Parses a formula (an expression of the modelling language).
 * Returns { empty, error, ast, refs, callRefs }: refs maps each variable (upper
 * case) to its spelling, in order of appearance; callRefs maps variables used
 * inside a function argument to the function name.
 */
export function parseFormula(formula) {
  const text = String(formula ?? '')
  const out = { empty: false, error: null, ast: null, refs: new Map(), callRefs: new Map() }
  if (!text.trim()) return { ...out, empty: true }
  // characters that would end the statement (separators, comments, line breaks)
  const cut = text.search(/\/\/|[;:\n]/)
  if (cut >= 0 && !text.startsWith(':=', cut)) {
    return { ...out, error: { code: 'unknownChar', params: { char: text[cut] === '\n' ? '↵' : text[cut] }, column: cut + 1 } }
  }
  const prefix = 'F__ := '
  const program = parseProgram(prefix + text)
  if (program.errors.length) {
    const e = program.errors[0]
    return { ...out, error: { code: e.code, params: e.params, column: e.column == null ? null : Math.max(1, e.column - prefix.length) } }
  }
  const ast = program.statements[0].expr
  walk(ast, (n, fn) => {
    if (n.kind !== 'var') return
    if (!out.refs.has(n.name)) out.refs.set(n.name, n.raw)
    if (fn && !out.callRefs.has(n.name)) out.callRefs.set(n.name, fn)
  })
  return { ...out, ast }
}

function nameProblem(node, reserved) {
  const name = String(node.name ?? '').trim()
  if (!name) return { code: 'emptyName' }
  if (!IDENT.test(name)) return { code: 'invalidName', params: { name } }
  const u = name.toUpperCase()
  if (FUNCTIONS[u] || KEYWORDS.has(u) || reserved.has(u)) return { code: 'reservedName', params: { name } }
  return null
}

function reservedNames({ simplified, timeName, dtName }) {
  const r = new Set([upper(timeName)])
  if (!simplified) r.add(upper(dtName))
  return r
}

/**
 * Order of the calculated nodes (rate and aux): Kahn's algorithm, always taking
 * the ready node that comes first in `graph.nodes`. Nodes in a cycle follow in
 * node order. Returns { order, cyclic } with node objects.
 */
export function calculationOrder(graph) {
  const calc = graph.nodes.filter((n) => n.kind === 'rate' || n.kind === 'aux')
  const byName = new Map(calc.map((n) => [upper(n.name), n]))
  const deps = new Map(calc.map((n) => [n.id, new Set()]))
  for (const l of graph.links) {
    if (l.kind === 'influence' && deps.has(l.from) && deps.has(l.to) && l.from !== l.to) deps.get(l.to).add(l.from)
  }
  for (const n of calc) {
    const f = parseFormula(n.formula)
    for (const name of f.refs.keys()) {
      const m = byName.get(name)
      if (m && m.id !== n.id) deps.get(n.id).add(m.id)
    }
  }
  const done = new Set()
  const order = []
  let progress = true
  while (progress) {
    progress = false
    for (const n of calc) {
      if (done.has(n.id)) continue
      if ([...deps.get(n.id)].every((d) => done.has(d))) {
        done.add(n.id)
        order.push(n)
        progress = true
        break // restart: the earliest ready node always comes next
      }
    }
  }
  const cyclic = calc.filter((n) => !done.has(n.id))
  return { order: [...order, ...cyclic], cyclic, deps }
}

// strongly connected components (Tarjan) of the dependency graph between calculated nodes
function cycles(graph, deps) {
  const index = new Map()
  const low = new Map()
  const stack = []
  const onStack = new Set()
  const result = []
  let i = 0
  const visit = (v) => {
    index.set(v, i); low.set(v, i); i++
    stack.push(v); onStack.add(v)
    for (const w of deps.get(v)) {
      if (!index.has(w)) { visit(w); low.set(v, Math.min(low.get(v), low.get(w))) }
      else if (onStack.has(w)) low.set(v, Math.min(low.get(v), index.get(w)))
    }
    if (low.get(v) === index.get(v)) {
      const comp = []
      let w
      do { w = stack.pop(); onStack.delete(w); comp.push(w) } while (w !== v)
      if (comp.length > 1) result.push(comp)
    }
  }
  for (const v of deps.keys()) if (!index.has(v)) visit(v)
  const pos = new Map(graph.nodes.map((n, k) => [n.id, k]))
  return result.map((c) => c.sort((a, b) => pos.get(a) - pos.get(b)))
}

/**
 * Checks the graph. Returns a list of problems
 *   { code, severity: 'error' | 'warning', nodeId?, nodeIds?, linkId?, params }
 * Codes: emptyName, invalidName, reservedName, duplicateName, auxNotAllowed,
 * missingFormula, formulaError, unknownName, missingInput, unusedInput,
 * selfReference, functionOfState, stateWithoutFlow, rateWithoutFlow, cycle,
 * invalidLink, duplicateLink.
 */
export function validateGraph(graph, options = {}) {
  const opts = { ...DEFAULTS, ...options }
  const reserved = reservedNames(opts)
  const problems = []
  const add = (code, extra = {}, severity = 'error') => problems.push({ code, severity, params: {}, ...extra })
  const nodes = new Map(graph.nodes.map((n) => [n.id, n]))
  const byName = new Map()

  for (const n of graph.nodes) {
    const p = nameProblem(n, reserved)
    if (p) add(p.code, { nodeId: n.id, params: p.params ?? {} })
    else {
      const u = upper(n.name)
      if (byName.has(u)) add('duplicateName', { nodeId: n.id, params: { name: n.name.trim() } })
      else byName.set(u, n)
    }
    if (n.kind === 'aux' && !opts.extended) add('auxNotAllowed', { nodeId: n.id, params: { name: n.name } })
  }

  const seen = new Set()
  for (const l of graph.links) {
    const from = nodes.get(l.from)
    const to = nodes.get(l.to)
    if (!canLink(from, to, l.kind)) {
      add('invalidLink', { linkId: l.id, nodeId: to?.id ?? from?.id, params: { from: from?.name ?? '?', to: to?.name ?? '?', kind: l.kind } })
      continue
    }
    const key = `${l.kind}:${l.from}:${l.to}`
    if (seen.has(key)) add('duplicateLink', { linkId: l.id, nodeId: l.to, params: { from: from.name, to: to.name } })
    seen.add(key)
  }

  for (const n of graph.nodes) {
    if (n.kind === 'state') {
      if (!graph.links.some((l) => l.kind === 'flow' && l.to === n.id && nodes.get(l.from)?.kind === 'rate')) {
        add('stateWithoutFlow', { nodeId: n.id, params: { name: n.name } }, 'warning')
      }
      continue
    }
    if (n.kind === 'constant') continue
    if (n.kind === 'rate' && !graph.links.some((l) => l.kind === 'flow' && l.from === n.id && nodes.get(l.to)?.kind === 'state')) {
      add('rateWithoutFlow', { nodeId: n.id, params: { name: n.name } }, 'warning')
    }
    const f = parseFormula(n.formula)
    const inputs = graph.links.filter((l) => l.kind === 'influence' && l.to === n.id && nodes.has(l.from))
    if (f.empty) { add('missingFormula', { nodeId: n.id, params: { name: n.name } }); continue }
    if (f.error) {
      add('formulaError', { nodeId: n.id, params: { name: n.name, code: f.error.code, column: f.error.column, details: f.error.params ?? {} } })
      continue
    }
    const self = upper(n.name)
    for (const [u, raw] of f.refs) {
      if (u === self) { add('selfReference', { nodeId: n.id, params: { name: raw } }); continue }
      if (reserved.has(u)) continue // time (and DeltaT) may be used without a link
      const source = byName.get(u)
      if (!source) { add('unknownName', { nodeId: n.id, params: { name: raw, target: n.name } }); continue }
      if (!inputs.some((l) => l.from === source.id)) add('missingInput', { nodeId: n.id, params: { name: source.name, target: n.name } })
      if (!opts.extended && source.kind === 'state' && f.callRefs.has(u)) {
        add('functionOfState', { nodeId: n.id, params: { name: source.name, fn: f.callRefs.get(u).toLowerCase() } })
      }
    }
    for (const l of inputs) {
      const src = nodes.get(l.from)
      if (!f.refs.has(upper(src.name))) add('unusedInput', { nodeId: n.id, linkId: l.id, params: { name: src.name, target: n.name } }, 'warning')
    }
  }

  const { deps } = calculationOrder(graph)
  for (const comp of cycles(graph, deps)) {
    const names = comp.map((id) => nodes.get(id).name)
    add('cycle', { nodeId: comp[0], nodeIds: comp, params: { names: [...names, names[0]].join(' → ') } })
  }
  return problems
}

function stateLine(state, flows, { simplified, dtName }) {
  const z = state.name.trim()
  if (!flows.length) return `${z} := ${z}`
  if (simplified) return `${z} := ${z}${flows.map((f) => ` ${f.sign} ${f.name}`).join('')}`
  if (flows.length === 1) return `${z} := ${z} ${flows[0].sign} ${flows[0].name}*${dtName}`
  if (flows.every((f) => f.sign === '-')) return `${z} := ${z} - (${flows.map((f) => f.name).join(' + ')})*${dtName}`
  const sum = flows.map((f, i) => (i === 0 ? (f.sign === '-' ? `-${f.name}` : f.name) : ` ${f.sign} ${f.name}`)).join('')
  return `${z} := ${z} + (${sum})*${dtName}`
}

/**
 * Translates the graph into a program (order and forms: see the top of this file).
 * Nodes whose name is not a valid identifier are left out. Returns { source, problems }.
 */
export function graphToProgram(graph, options = {}) {
  const opts = { ...DEFAULTS, ...options }
  const reserved = reservedNames(opts)
  const valid = (n) => !nameProblem(n, reserved)
  const nodes = new Map(graph.nodes.map((n) => [n.id, n]))
  const lines = []
  for (const n of calculationOrder(graph).order) {
    if (valid(n)) lines.push(`${n.name.trim()} := ${String(n.formula ?? '').trim() || '0'}`)
  }
  for (const s of graph.nodes) {
    if (s.kind !== 'state' || !valid(s)) continue
    const flows = graph.links
      .filter((l) => l.kind === 'flow' && l.to === s.id && nodes.get(l.from)?.kind === 'rate' && valid(nodes.get(l.from)))
      .map((l) => ({ name: nodes.get(l.from).name.trim(), sign: l.sign === '-' ? '-' : '+' }))
    lines.push(stateLine(s, flows, opts))
  }
  const t = opts.timeName
  lines.push(opts.simplified ? `${t} := ${t} + 1` : `${t} := ${t} + ${opts.dtName}`)
  return { source: lines.join('\n'), problems: validateGraph(graph, opts) }
}

// ---------------------------------------------------------------------------
// Program → graph

function serialize(n) {
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

// summands of a chain a ± b ± c whose operands (except the leftmost) are variables
function chain(n) {
  const terms = []
  while (n.kind === 'bin' && (n.op === '+' || n.op === '-')) {
    if (n.right.kind !== 'var') return null
    terms.unshift({ name: n.right.name, sign: n.op })
    n = n.left
  }
  return { head: n, terms }
}

// flows of a state line in one of the generated forms, or null
function stateFlows(e, z, simplified, dt) {
  const isVar = (n, name) => n.kind === 'var' && (name === undefined || n.name === name)
  if (isVar(e, z)) return []
  if (simplified) {
    const c = chain(e)
    return c && isVar(c.head, z) ? c.terms : null
  }
  if (!(e.kind === 'bin' && (e.op === '+' || e.op === '-') && isVar(e.left, z))) return null
  const r = e.right
  if (!(r.kind === 'bin' && r.op === '*' && isVar(r.right, dt))) return null
  if (isVar(r.left)) return [{ name: r.left.name, sign: e.op }]
  const c = chain(r.left)
  if (!c || !c.terms.length) return null
  if (isVar(c.head)) c.terms.unshift({ name: c.head.name, sign: '+' })
  else if (c.head.kind === 'neg' && isVar(c.head.arg)) c.terms.unshift({ name: c.head.arg.name, sign: '-' })
  else return null
  if (e.op === '+') return c.terms
  return c.terms.every((t) => t.sign === '+') ? c.terms.map((t) => ({ ...t, sign: '-' })) : null
}

const ASSIGN_HEAD = /^\s*[A-Za-zÄÖÜäöüß_][A-Za-z0-9ÄÖÜäöüß_]*\s*(:=|=)/

/**
 * Turns a program into a graph when that is lossless: graphToProgram must
 * regenerate exactly the same statements in the same order (comments are not kept).
 * Returns { ok: true, graph, simplified, timeName, dtName, requiresExtended } with
 * an automatic layout, or { ok: false, line, reason } naming the first line that
 * does not fit; reason is 'error' | 'time' | 'condition' | 'pattern' | 'flow' | 'order'.
 */
export function programToGraph(source) {
  const program = parseProgram(source)
  if (program.errors.length || !program.statements.length) return { ok: false, line: program.errors[0]?.line ?? null, reason: 'error' }
  const stmts = program.statements
  const last = stmts[stmts.length - 1]
  const raw = (name) => program.variables.get(name) ?? name

  const timeOk = last.kind === 'assign' && last.expr.kind === 'bin' && last.expr.op === '+' &&
    last.expr.left.kind === 'var' && last.expr.left.name === last.name
  if (!timeOk) return { ok: false, line: last.line, reason: 'time' }
  const stepNode = last.expr.right
  const simplified = stepNode.kind === 'num' && stepNode.value === 1
  if (!simplified && stepNode.kind !== 'var') return { ok: false, line: last.line, reason: 'time' }
  const timeU = last.name
  const dtU = simplified ? null : stepNode.name
  const options = { simplified, timeName: last.raw, dtName: simplified ? DEFAULTS.dtName : raw(dtU) }

  const perLine = new Map()
  for (const s of stmts) perLine.set(s.line, (perLine.get(s.line) ?? 0) + 1)
  const lines = source.split('\n')

  const calc = [] // { name, formula, line }
  const states = [] // { name, flows, line }
  const assigned = new Set()
  for (const s of stmts.slice(0, -1)) {
    if (s.kind !== 'assign') return { ok: false, line: s.line, reason: 'condition' }
    if (perLine.get(s.line) > 1 || assigned.has(s.name) || s.name === timeU || s.name === dtU) return { ok: false, line: s.line, reason: 'pattern' }
    assigned.add(s.name)
    let selfRef = false
    walk(s.expr, (n) => { if (n.kind === 'var' && n.name === s.name) selfRef = true })
    if (selfRef) {
      const flows = stateFlows(s.expr, s.name, simplified, dtU)
      if (!flows) return { ok: false, line: s.line, reason: 'pattern' }
      states.push({ name: s.name, flows, line: s.line })
    } else {
      const text = lines[s.line - 1].split('//')[0]
      const formula = text.replace(ASSIGN_HEAD, '').replace(/;\s*$/, '').trim()
      calc.push({ name: s.name, formula, line: s.line })
    }
  }
  const calcNames = new Set(calc.map((c) => c.name))
  const flowNames = new Set()
  for (const st of states) {
    for (const f of st.flows) {
      if (!calcNames.has(f.name)) return { ok: false, line: st.line, reason: 'flow' }
      flowNames.add(f.name)
    }
  }

  const graph = { nodes: [], links: [] }
  const idOf = new Map()
  const addNode = (name, kind, formula = '') => {
    const id = `n${graph.nodes.length + 1}`
    idOf.set(name, id)
    graph.nodes.push({ id, kind, name: raw(name), x: 0, y: 0, formula })
  }
  for (const c of calc) addNode(c.name, flowNames.has(c.name) ? 'rate' : 'aux', c.formula)
  for (const st of states) addNode(st.name, 'state')
  for (const name of program.variables.keys()) {
    if (!idOf.has(name) && name !== timeU && name !== dtU) addNode(name, 'constant')
  }
  let k = 0
  const addLink = (from, to, kind, sign = '+') => graph.links.push({ id: `l${++k}`, from: idOf.get(from), to: idOf.get(to), kind, sign })
  for (const c of calc) {
    for (const name of parseFormula(c.formula).refs.keys()) {
      if (name !== c.name && idOf.has(name)) addLink(name, c.name, 'influence')
    }
  }
  for (const st of states) for (const f of st.flows) addLink(f.name, st.name, 'flow', f.sign)

  // lossless only if the graph regenerates the very same statements
  const regenerated = parseProgram(graphToProgram(graph, { ...options, extended: true }).source).statements
  const i = stmts.findIndex((s, j) => !regenerated[j] || serialize(s) !== serialize(regenerated[j]))
  if (i >= 0 || regenerated.length !== stmts.length) {
    return { ok: false, line: stmts[Math.max(0, i)].line, reason: 'order' }
  }
  const requiresExtended = validateGraph(graph, { ...options, extended: false })
    .some((p) => p.code === 'auxNotAllowed' || p.code === 'functionOfState')
  return { ok: true, graph: autoLayout(graph), ...options, requiresExtended }
}

// ---------------------------------------------------------------------------
// Layout

export const LAYOUT = {
  row: { constant: 44, rate: 170, aux: 170, state: 300 },
  gap: { constant: 124, rate: 150, state: 170 },
  left: { constant: 70, rate: 90, state: 90 },
}

/**
 * Arranges the nodes like the automatic diagram: states in a row at the bottom
 * (in node order), rates and helper quantities above them (under the states they
 * feed or use), constants on top (above the nodes they act on). Returns a copy.
 */
export function autoLayout(graph) {
  const g = cloneGraph(graph)
  const pos = new Map()
  const meanX = (ids) => {
    const xs = ids.map((id) => pos.get(id)).filter((x) => x !== undefined)
    return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null
  }
  const place = (list, row, key) => {
    const keyed = list.map((n, i) => ({ n, k: key(n) ?? 1e6 + i, i }))
    keyed.sort((a, b) => a.k - b.k || a.i - b.i)
    keyed.forEach(({ n }, i) => {
      n.x = LAYOUT.left[row] + i * LAYOUT.gap[row]
      n.y = LAYOUT.row[row]
      pos.set(n.id, n.x)
    })
  }
  const linksFrom = (id) => g.links.filter((l) => l.from === id).map((l) => l.to)
  const linksTo = (id) => g.links.filter((l) => l.to === id).map((l) => l.from)
  place(g.nodes.filter((n) => n.kind === 'state'), 'state', () => null)
  // rates first by the states they feed; helpers by what they act on or use
  const middle = g.nodes.filter((n) => n.kind === 'rate' || n.kind === 'aux')
  const keyMiddle = (n) => meanX(n.kind === 'rate' ? linksFrom(n.id) : [...linksFrom(n.id), ...linksTo(n.id)])
  for (let pass = 0; pass < 2; pass++) place(middle, 'rate', keyMiddle)
  place(g.nodes.filter((n) => n.kind === 'constant'), 'constant', (n) => meanX(linksFrom(n.id)))
  return g
}
