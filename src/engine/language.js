// Algorithmische Modellsprache (kompatibel zu Moebius 3.0).
//
// Verifiziert gegen Originaldateien:
//   Zuweisung `Name := Ausdruck`, + - * /, Klammern, unäres Minus,
//   Dezimalkomma und -punkt, Kommentare `//`, mehrere Anweisungen mit `;`,
//   Funktionen SQR SQRT EXP. Jede Operation rundet auf IEEE-754-Double.
// Aus der Original-EXE bekannt, Semantik noch nicht verifiziert:
//   IF … THEN, WHILE … DO, Vergleiche, SIN COS ARCTAN LN FRAC INT ABS RANDOM.

import { exactExp } from './exactmath.js'

export class ModelError extends Error {
  constructor(message, line = null, column = null) {
    super(message)
    this.line = line
    this.column = column
  }
}

export const FUNCTIONS = {
  SQR: { arity: 1, label: 'Quadrat', fn: (x) => x * x },
  SQRT: { arity: 1, label: 'Wurzel', fn: Math.sqrt },
  EXP: { arity: 1, label: 'e hoch x', fn: exactExp },
  LN: { arity: 1, label: 'natürlicher Logarithmus', fn: Math.log },
  SIN: { arity: 1, label: 'Sinus (Bogenmaß)', fn: Math.sin },
  COS: { arity: 1, label: 'Kosinus (Bogenmaß)', fn: Math.cos },
  ARCTAN: { arity: 1, label: 'Arkustangens', fn: Math.atan },
  ABS: { arity: 1, label: 'Betrag', fn: Math.abs },
  INT: { arity: 1, label: 'ganzzahliger Teil', fn: Math.trunc },
  FRAC: { arity: 1, label: 'Nachkommateil', fn: (x) => x - Math.trunc(x) },
  RANDOM: { arity: 0, label: 'Zufallszahl zwischen 0 und 1', fn: null },
}

const KEYWORDS = new Set(['IF', 'THEN', 'WHILE', 'DO'])
const IDENT_START = /[A-Za-zÄÖÜäöüß_]/
const IDENT_PART = /[A-Za-z0-9ÄÖÜäöüß_]/

function tokenizeLine(text, line) {
  const tokens = []
  let i = 0
  while (i < text.length) {
    const c = text[i]
    if (c === ' ' || c === '\t' || c === '\r') { i++; continue }
    if (c === '/' && text[i + 1] === '/') break
    const col = i + 1
    if (/[0-9]/.test(c) || ((c === ',' || c === '.') && /[0-9]/.test(text[i + 1] ?? ''))) {
      let j = i
      while (j < text.length && /[0-9]/.test(text[j])) j++
      if (text[j] === ',' || text[j] === '.') {
        j++
        while (j < text.length && /[0-9]/.test(text[j])) j++
      }
      if (/[eE]/.test(text[j] ?? '') && /[-+0-9]/.test(text[j + 1] ?? '')) {
        let k = j + 1
        if (text[k] === '+' || text[k] === '-') k++
        if (/[0-9]/.test(text[k] ?? '')) {
          j = k
          while (j < text.length && /[0-9]/.test(text[j])) j++
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
    if ('+-*/()<>=;'.includes(c)) {
      tokens.push({ type: 'op', value: c, line, col })
      i++
      continue
    }
    throw new ModelError(`Unbekanntes Zeichen „${c}“.`, line, col)
  }
  return tokens
}

class Parser {
  constructor(tokens, line) {
    this.t = tokens
    this.i = 0
    this.line = line
  }
  peek() { return this.t[this.i] }
  is(type, value) {
    const k = this.t[this.i]
    return k && k.type === type && (value === undefined || k.value === value)
  }
  take() { return this.t[this.i++] }
  fail(msg) {
    const k = this.peek()
    throw new ModelError(msg, this.line, k ? k.col : null)
  }
  expect(type, value, msg) {
    if (!this.is(type, value)) this.fail(msg)
    return this.take()
  }

  statements() {
    const out = []
    while (this.peek()) {
      if (this.is('op', ';')) { this.take(); continue }
      out.push(this.statement())
      if (this.peek() && !this.is('op', ';')) this.fail('Operator erwartet.')
    }
    return out
  }
  statement() {
    if (this.is('kw', 'IF')) {
      this.take()
      const cond = this.comparison()
      this.expect('kw', 'THEN', 'THEN erwartet.')
      return { kind: 'if', cond, body: this.statement(), line: this.line }
    }
    if (this.is('kw', 'WHILE')) {
      this.take()
      const cond = this.comparison()
      this.expect('kw', 'DO', 'DO erwartet.')
      return { kind: 'while', cond, body: this.statement(), line: this.line }
    }
    const target = this.expect('id', undefined, 'Variable erwartet.')
    if (FUNCTIONS[target.value]) this.fail(`„${target.raw}“ ist eine Funktion und kann keinen Wert bekommen.`)
    this.expect('op', ':=', '„:=“ erwartet (Zuweisung).')
    return { kind: 'assign', name: target.value, raw: target.raw, expr: this.expr(), line: this.line }
  }
  comparison() {
    const left = this.expr()
    const k = this.peek()
    if (!k || k.type !== 'op' || !['<', '>', '=', '<=', '>=', '<>'].includes(k.value)) this.fail('Vergleich erwartet.')
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
    let n = this.unary()
    while (this.is('op', '*') || this.is('op', '/')) {
      const op = this.take().value
      n = { kind: 'bin', op, left: n, right: this.unary() }
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
    if (!k) this.fail('Konstante, Variable oder Funktion erwartet.')
    if (k.type === 'num') { this.take(); return { kind: 'num', value: k.value } }
    if (this.is('op', '(')) {
      this.take()
      const e = this.expr()
      this.expect('op', ')', '„)“ erwartet.')
      return e
    }
    if (k.type === 'id') {
      this.take()
      const f = FUNCTIONS[k.value]
      if (f) {
        if (f.arity === 0) return { kind: 'call', name: k.value, arg: null }
        this.expect('op', '(', '„(“ erwartet.')
        const arg = this.expr()
        this.expect('op', ')', '„)“ erwartet.')
        return { kind: 'call', name: k.value, arg }
      }
      if (this.is('op', '(')) this.fail(`Unbekannte Funktion „${k.raw}“.`)
      return { kind: 'var', name: k.value, raw: k.raw }
    }
    this.fail('Konstante, Variable oder Funktion erwartet.')
  }
}

/** Parst den Programmtext; liefert Anweisungen und alle vorkommenden Variablen. */
export function parseProgram(source, { caseSensitive = false } = {}) {
  const statements = []
  const errors = []
  source.split('\n').forEach((text, idx) => {
    try {
      const tokens = tokenizeLine(text, idx + 1)
      if (caseSensitive) {
        for (const t of tokens) if (t.type === 'id' && !FUNCTIONS[t.value]) t.value = t.raw
      }
      if (tokens.length) statements.push(...new Parser(tokens, idx + 1).statements())
    } catch (e) {
      if (e instanceof ModelError) errors.push(e)
      else throw e
    }
  })
  const variables = new Map()
  const assigned = new Set()
  const visit = (n) => {
    if (!n) return
    if (n.kind === 'var' && !variables.has(n.name)) variables.set(n.name, n.raw)
    if (n.kind === 'assign') {
      if (!variables.has(n.name)) variables.set(n.name, n.raw)
      assigned.add(n.name)
    }
    for (const key of ['expr', 'left', 'right', 'arg', 'cond', 'body']) visit(n[key])
  }
  statements.forEach(visit)
  return { statements, errors, variables, assigned }
}
