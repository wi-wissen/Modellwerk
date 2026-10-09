import { FUNCTIONS, ModelError, parseProgram } from './language.js'
import { exactPow } from './exactmath.js'

export const MAX_STEPS = 8191 // limit of the legacy program
const MAX_WHILE = 100000

/** Random generator compatible with Delphi's System.Random (LCG, multiplier $08088405). */
export function delphiRandom(seed = 0) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 0x08088405) + 1) >>> 0
    return s / 4294967296
  }
}

/**
 * Runs the program `steps` times. Result: initial values plus the values of all
 * variables after each pass – exactly as PRG files store them.
 */
export function simulate(source, startValues, steps, options = {}) {
  const program = typeof source === 'string' ? parseProgram(source, options) : source
  if (program.errors.length) throw program.errors[0]
  if (!(steps >= 0 && steps <= MAX_STEPS)) throw new ModelError('stepsRange', { max: MAX_STEPS })

  const env = new Map()
  for (const name of program.variables.keys()) env.set(name, 0)
  for (const [name, value] of Object.entries(startValues)) env.set(name, value)
  const random = options.random ?? delphiRandom(options.seed ?? 0)

  const ev = (n) => {
    switch (n.kind) {
      case 'num': return n.value
      case 'var': return env.get(n.name)
      case 'neg': return -ev(n.arg)
      case 'call': {
        const x = ev(n.arg)
        if (n.name !== 'RANDOM') return FUNCTIONS[n.name].fn(x)
        return x > 0 ? Math.floor(random() * Math.trunc(x)) : random()
      }
      case 'bin': {
        const a = ev(n.left)
        const b = ev(n.right)
        if (n.op === '+') return a + b
        if (n.op === '-') return a - b
        if (n.op === '*') return a * b
        if (n.op === '^') {
          const p = exactPow(a, b)
          // the legacy program stops with "invalid floating point operation"
          if (Number.isNaN(p) && !Number.isNaN(a) && !Number.isNaN(b)) throw new ModelError('invalidOperation')
          return p
        }
        return a / b
      }
    }
  }
  const test = (c) => {
    const a = ev(c.left)
    const b = ev(c.right)
    switch (c.op) {
      case '<': return a < b
      case '>': return a > b
      case '=': return a === b
      case '<=': return a <= b
      case '>=': return a >= b
      default: return a !== b
    }
  }
  const exec = (s) => {
    if (s.kind === 'assign') {
      try {
        env.set(s.name, ev(s.expr))
      } catch (e) {
        if (e instanceof ModelError && e.line == null) e.line = s.line
        throw e
      }
    }
    else if (s.kind === 'if') { if (test(s.cond)) s.body.forEach(exec) }
    else if (s.kind === 'macro') s.body.forEach(exec)
    else {
      let guard = 0
      while (test(s.cond)) {
        if (++guard > MAX_WHILE) throw new ModelError('endlessLoop', {}, s.line)
        s.body.forEach(exec)
      }
    }
  }

  const names = [...env.keys()]
  const series = Object.fromEntries(names.map((n) => [n, new Float64Array(steps + 1)]))
  names.forEach((n) => { series[n][0] = env.get(n) })
  for (let i = 1; i <= steps; i++) {
    for (const s of program.statements) exec(s)
    for (const n of names) series[n][i] = env.get(n)
  }
  return { names, display: program.variables, series, steps }
}
