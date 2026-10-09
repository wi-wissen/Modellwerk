// Algorithmic modelling language, compatible with PRG files (format MOEBIUS30).
//
// Verified against reference files:
//   assignment `name := expression`, + - * /, parentheses, unary minus,
//   decimal comma and point, `//` comments, several statements per line with `;`,
//   functions SQR SQRT EXP. Every operation rounds to an IEEE-754 double.
// From the legacy program's documentation, not yet verified bit for bit:
//   `=` as assignment, `:` as separator, `^` (also with fractional exponents),
//   IF … THEN and WHILE … DO applying to the rest of the line, comparisons,
//   SIN COS ARCTAN LN FRAC INT ABS, RANDOM(x).
// Verified with the legacy program: unary minus binds tighter than `^`, and `^`
// is left-associative (-2^2 = 4, 2^3^2 = 64); a negative base with a fractional
// exponent is an invalid operation.
import { exactAtan, exactExp, exactLn, x87Cos, x87Sin } from './exactmath.js'

// Default (English) error texts; the UI translates by `code`.
export const ERROR_TEXTS = {
  unknownChar: 'Unknown character "{char}".',
  operatorExpected: 'Operator expected.',
  thenExpected: 'THEN expected.',
  doExpected: 'DO expected.',
  variableExpected: 'Variable expected.',
  assignToFunction: '"{name}" is a function and cannot be assigned.',
  assignExpected: '":=" expected.',
  comparisonExpected: 'Comparison expected.',
  operandExpected: 'Constant, variable or function expected.',
  closeParenExpected: '")" expected.',
  openParenExpected: '"(" expected.',
  unknownFunction: 'Unknown function "{name}".',
  stepsRange: 'Number of steps must be between 0 and {max}.',
  endlessLoop: 'Probably an endless loop.',
  invalidOperation: 'Invalid floating point operation.',
  macroRecursive: 'Macro "{name}" calls itself.',
  macroInvalid: 'Macro "{name}" contains an error.',
}

export function formatText(template, params = {}) {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? ''))
}

export class ModelError extends Error {
  constructor(code, params = {}, line = null, column = null) {
    super(formatText(ERROR_TEXTS[code] ?? code, params))
    this.code = code
    this.params = params
    this.line = line
    this.column = column
  }
}

export const FUNCTIONS = {
  SQR: { arity: 1, fn: (x) => x * x },
  SQRT: { arity: 1, fn: Math.sqrt },
  EXP: { arity: 1, fn: exactExp },
  LN: { arity: 1, fn: exactLn },
  SIN: { arity: 1, fn: x87Sin },
  COS: { arity: 1, fn: x87Cos },
  ARCTAN: { arity: 1, fn: exactAtan },
  ABS: { arity: 1, fn: Math.abs },
  INT: { arity: 1, fn: Math.trunc },
  FRAC: { arity: 1, fn: (x) => x - Math.trunc(x) },
  RANDOM: { arity: 1, fn: null }, // random(0): [0;1), random(x>0): integer 0 … x-1
}

const KEYWORDS = new Set(['IF', 'THEN', 'WHILE', 'DO'])
const IDENT_START = /[A-Za-zÄÖÜäöüß_]/
const IDENT_PART = /[A-Za-z0-9ÄÖÜäöüß_]/
const DIGIT = /[0-9]/

function tokenizeLine(text, line) {
  const tokens = []
  let i = 0
  while (i < text.length) {
    const c = text[i]
    if (c === ' ' || c === '\t' || c === '\r') { i++; continue }
    if (c === '/' && text[i + 1] === '/') break
    const col = i + 1
    if (DIGIT.test(c) || ((c === ',' || c === '.') && DIGIT.test(text[i + 1] ?? ''))) {
      let j = i
      while (j < text.length && DIGIT.test(text[j])) j++
      if (text[j] === ',' || text[j] === '.') {
        j++
        while (j < text.length && DIGIT.test(text[j])) j++
      }
      if (/[eE]/.test(text[j] ?? '') && /[-+0-9]/.test(text[j + 1] ?? '')) {
        let k = j + 1
        if (text[k] === '+' || text[k] === '-') k++
        if (DIGIT.test(text[k] ?? '')) {
          j = k
          while (j < text.length && DIGIT.test(text[j])) j++
        }
      }
      const raw = text.slice(i, j)
      tokens.push({ type: 'num', value: Number(raw.replace(',', '.')), raw, line, col })
      i = j
      continue
    }
    if (IDENT_START.test(c)) {
      let j = i + 1
      while (j < text.length && IDENT_PART.test(text[j])) j++
      const raw = text.slice(i, j)
      const upper = raw.toUpperCase()
      tokens.push({ type: KEYWORDS.has(upper) ? 'kw' : 'id', value: upper, raw, line, col })
      i = j
      continue
    }
    const two = text.slice(i, i + 2)
    if (two === ':=' || two === '<=' || two === '>=' || two === '<>') {
      tokens.push({ type: 'op', value: two, line, col })
      i += 2
      continue
    }
    if (c === ':') {
      tokens.push({ type: 'op', value: ';', line, col }) // `:` separates statements like `;`
      i++
      continue
    }
    if ('+-*/^()<>=;'.includes(c)) {
      tokens.push({ type: 'op', value: c, line, col })
      i++
      continue
    }
    throw new ModelError('unknownChar', { char: c }, line, col)
  }
  return tokens
}

class Parser {
  constructor(tokens, line, macros = null) {
    this.t = tokens
    this.i = 0
    this.line = line
    this.macros = macros // { has(name), expand(name) } or null
  }
  peek() { return this.t[this.i] }
  is(type, value) {
    const k = this.t[this.i]
    return k && k.type === type && (value === undefined || k.value === value)
  }
  take() { return this.t[this.i++] }
  fail(code, params) {
    const k = this.peek()
    throw new ModelError(code, params, this.line, k ? k.col : null)
  }
  expect(type, value, code) {
    if (!this.is(type, value)) this.fail(code)
    return this.take()
  }

  statements() {
    const out = []
    while (this.peek()) {
      if (this.is('op', ';')) { this.take(); continue }
      out.push(this.statement())
      if (this.peek() && !this.is('op', ';')) this.fail('operatorExpected')
    }
    return out
  }
  // IF and WHILE apply to all statements on the rest of the line
  restOfLine() {
    const body = []
    while (this.peek()) {
      if (this.is('op', ';')) { this.take(); continue }
      body.push(this.statement())
      if (this.peek() && !this.is('op', ';')) this.fail('operatorExpected')
    }
    return body
  }
  statement() {
    if (this.is('kw', 'IF')) {
      this.take()
      const cond = this.comparison()
      this.expect('kw', 'THEN', 'thenExpected')
      return { kind: 'if', cond, body: this.restOfLine(), line: this.line }
    }
    if (this.is('kw', 'WHILE')) {
      this.take()
      const cond = this.comparison()
      this.expect('kw', 'DO', 'doExpected')
      return { kind: 'while', cond, body: this.restOfLine(), line: this.line }
    }
    // a macro is called by its name alone, like a statement
    const next = this.t[this.i + 1]
    if (this.is('id') && this.macros?.has(this.peek().value) && (!next || (next.type === 'op' && next.value === ';'))) {
      const name = this.take().value
      return { kind: 'macro', name, body: this.macros.expand(name, this.line), line: this.line }
    }
    const target = this.expect('id', undefined, 'variableExpected')
    if (FUNCTIONS[target.value]) this.fail('assignToFunction', { name: target.raw })
    if (this.is('op', '=')) this.take() // `=` is an alternative assignment operator
    else this.expect('op', ':=', 'assignExpected')
    return { kind: 'assign', name: target.value, raw: target.raw, expr: this.expr(), line: this.line }
  }
  comparison() {
    const left = this.expr()
    const k = this.peek()
    if (!k || k.type !== 'op' || !['<', '>', '=', '<=', '>=', '<>'].includes(k.value)) this.fail('comparisonExpected')
    this.take()
    return { kind: 'cmp', op: k.value, left, right: this.expr() }
  }
  expr() {
    let n = this.term()
    while (this.is('op', '+') || this.is('op', '-')) {
      const op = this.take().value
      n = { kind: 'bin', op, left: n, right: this.term() }
    }
    return n
  }
  term() {
    let n = this.power()
    while (this.is('op', '*') || this.is('op', '/')) {
      const op = this.take().value
      n = { kind: 'bin', op, left: n, right: this.power() }
    }
    return n
  }
  // `^` is left-associative and binds weaker than unary minus: -2^2 = (-2)^2
  power() {
    let n = this.unary()
    while (this.is('op', '^')) {
      this.take()
      n = { kind: 'bin', op: '^', left: n, right: this.unary() }
    }
    return n
  }
  unary() {
    if (this.is('op', '-')) { this.take(); return { kind: 'neg', arg: this.unary() } }
    if (this.is('op', '+')) { this.take(); return this.unary() }
    return this.atom()
  }
  atom() {
    const k = this.peek()
    if (!k) this.fail('operandExpected')
    if (k.type === 'num') { this.take(); return { kind: 'num', value: k.value } }
    if (this.is('op', '(')) {
      this.take()
      const e = this.expr()
      this.expect('op', ')', 'closeParenExpected')
      return e
    }
    if (k.type === 'id') {
      this.take()
      const f = FUNCTIONS[k.value]
      if (f) {
        this.expect('op', '(', 'openParenExpected')
        const arg = this.expr()
        this.expect('op', ')', 'closeParenExpected')
        return { kind: 'call', name: k.value, arg }
      }
      if (this.is('op', '(')) this.fail('unknownFunction', { name: k.raw })
      return { kind: 'var', name: k.value, raw: k.raw }
    }
    this.fail('operandExpected')
  }
}

function parseLines(source, caseSensitive, macros) {
  const statements = []
  const errors = []
  source.split('\n').forEach((text, idx) => {
    try {
      const tokens = tokenizeLine(text, idx + 1)
      if (caseSensitive) {
        for (const t of tokens) if (t.type === 'id' && !FUNCTIONS[t.value]) t.value = t.raw
      }
      if (tokens.length) statements.push(...new Parser(tokens, idx + 1, macros).statements())
    } catch (e) {
      if (e instanceof ModelError) errors.push(e)
      else throw e
    }
  })
  return { statements, errors }
}

/** Macro table: named blocks of statements, expanded where they are called. */
function macroTable(macros, caseSensitive) {
  const byName = new Map(macros.map((m) => [caseSensitive ? m.name : m.name.toUpperCase(), m]))
  const parsed = new Map()
  const active = []
  const table = {
    has: (name) => byName.has(name),
    expand(name, line) {
      if (active.includes(name)) throw new ModelError('macroRecursive', { name: byName.get(name).name }, line)
      if (!parsed.has(name)) {
        active.push(name)
        try {
          const result = parseLines(byName.get(name).body, caseSensitive, table)
          const recursion = result.errors.find((e) => e.code === 'macroRecursive')
          if (recursion) throw new ModelError('macroRecursive', recursion.params, line)
          if (result.errors.length) throw new ModelError('macroInvalid', { name: byName.get(name).name }, line)
          parsed.set(name, result.statements)
        } finally {
          active.pop()
        }
      }
      return parsed.get(name)
    },
  }
  return table
}

/**
 * Parses program text; returns statements, errors and all variables that occur.
 * `macros` is a list of { name, body }; a line consisting of a macro name runs its body.
 */
export function parseProgram(source, { caseSensitive = false, macros = [] } = {}) {
  const table = macros.length ? macroTable(macros, caseSensitive) : null
  const { statements, errors } = parseLines(source, caseSensitive, table)
  const variables = new Map()
  const assigned = new Set()
  const visit = (n) => {
    if (!n) return
    if (n.kind === 'var' && !variables.has(n.name)) variables.set(n.name, n.raw)
    if (n.kind === 'assign') {
      if (!variables.has(n.name)) variables.set(n.name, n.raw)
      assigned.add(n.name)
    }
    for (const key of ['expr', 'left', 'right', 'arg', 'cond']) visit(n[key])
    if (n.body) n.body.forEach(visit)
  }
  statements.forEach(visit)
  return { statements, errors, variables, assigned }
}
