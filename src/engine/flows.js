// The line that updates a stock from its flows, shared by sentences and the
// diagram so that both produce (and recognise) exactly the same program:
//   simplified:  Z := Z + r1 - r2            (also Z := Z - r1, or Z := Z without flows)
//   with DeltaT: Z := Z + r1*DeltaT           (one flow: Z := Z ± r*DeltaT)
//                Z := Z + (r1 - r2)*DeltaT    (several flows, a leading outflow is written -r1)
//                Z := Z - (r1 + r2)*DeltaT    (several flows, all of them outflows)
// Summing the flows first and multiplying once by DeltaT is the textbook Euler
// step and the form the built-in examples use (Hasen + (Geburten - Gefressen)*dt).

/** Program line for stock `z` with flows [{ name, sign: '+' | '-' }]. */
export function stockLine(z, flows, { simplified = true, dtName = 'DeltaT' } = {}) {
  if (!flows.length) return `${z} := ${z}`
  if (simplified) return `${z} := ${z}${flows.map((f) => ` ${f.sign} ${f.name}`).join('')}`
  if (flows.length === 1) return `${z} := ${z} ${flows[0].sign} ${flows[0].name}*${dtName}`
  if (flows.every((f) => f.sign === '-')) return `${z} := ${z} - (${flows.map((f) => f.name).join(' + ')})*${dtName}`
  const sum = flows.map((f, i) => (i === 0 ? (f.sign === '-' ? `-${f.name}` : f.name) : ` ${f.sign} ${f.name}`)).join('')
  return `${z} := ${z} + (${sum})*${dtName}`
}

// a ± b ± c … with plain variables after the head
function chain(n) {
  const terms = []
  while (n.kind === 'bin' && (n.op === '+' || n.op === '-')) {
    if (n.right.kind !== 'var') return null
    terms.unshift({ name: n.right.name, sign: n.op })
    n = n.left
  }
  return { head: n, terms }
}

/**
 * Flows of a parsed stock line `z := e` in one of the forms above, or null.
 * Names are the parser's (normalised) variable names; `dt` likewise.
 */
export function stockFlows(e, z, simplified, dt) {
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
