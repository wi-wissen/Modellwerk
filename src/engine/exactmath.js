// Correctly rounded elementary functions.
//
// The legacy program (Delphi) evaluates EXP etc. on the x87 FPU with 80 bits and
// rounds to double only when storing. Apart from extremely rare edge cases this
// equals the correctly rounded function. Math.exp in JavaScript engines is off by
// one ULP now and then, so we compute in double-double arithmetic (~106 bits)
// and round once at the end.

const SPLITTER = 134217729 // 2^27 + 1

function twoSum(a, b) {
  const s = a + b
  const bb = s - a
  return [s, (a - (s - bb)) + (b - bb)]
}

function twoProd(a, b) {
  const p = a * b
  let t = SPLITTER * a
  const ah = t - (t - a)
  const al = a - ah
  t = SPLITTER * b
  const bh = t - (t - b)
  const bl = b - bh
  return [p, ((ah * bh - p) + ah * bl + al * bh) + al * bl]
}

function ddAdd(ah, al, bh, bl) {
  let [s, e] = twoSum(ah, bh)
  e += al + bl
  return twoSum(s, e)
}

function ddMul(ah, al, bh, bl) {
  let [p, e] = twoProd(ah, bh)
  e += ah * bl + al * bh
  return twoSum(p, e)
}

/** Double-double divided by a small integer, keeping full precision. */
function ddDivInt(ah, al, n) {
  const q = ah / n
  const [p, pe] = twoProd(q, n)
  const r = (ah - p) - pe + al
  return twoSum(q, r / n)
}

// ln 2 as double-double
const LN2_HI = 0.6931471805599453
const LN2_LO = 2.3190468138462996e-17

/**
 * exp of a double-double argument. Returns [h, l, k] with exp(x) = (h + l)·2^k,
 * or null when x is out of range (caller handles overflow/underflow).
 */
function expParts(xh, xl) {
  // x = k·ln2 + r with |r| ≤ ln2/2, r as double-double
  const k = Math.round(xh / LN2_HI)
  const [p1, p1e] = twoProd(k, LN2_HI)
  let [rh, rl] = twoSum(xh, -p1)
  rl += xl - p1e
  const [p2, p2e] = twoProd(k, LN2_LO)
  ;[rh, rl] = ddAdd(rh, rl, -p2, -p2e)

  // further reduction: r/256, Taylor series, then square 8 times
  rh /= 256
  rl /= 256
  let sh = 1, sl = 0 // sum
  let th = 1, tl = 0 // term r^n/n!
  for (let n = 1; n <= 14; n++) {
    ;[th, tl] = ddMul(th, tl, rh, rl)
    ;[th, tl] = ddDivInt(th, tl, n)
    ;[sh, sl] = ddAdd(sh, sl, th, tl)
  }
  for (let i = 0; i < 8; i++) [sh, sl] = ddMul(sh, sl, sh, sl)
  return [sh, sl, k]
}

/** Rounds (h + l)·2^k to a double, rounding only once. */
function scale(h, l, k) {
  if (k > 1023) return (h + l) * 2 ** 1023 * 2 ** (k - 1023)
  if (k < -1000) return (h * 2 ** (k + 1000) + l * 2 ** (k + 1000)) * 2 ** -1000
  const f = 2 ** k
  return h * f + l * f
}

/** exp(x), correctly rounded to an IEEE-754 double. */
export function exactExp(x) {
  if (Number.isNaN(x)) return NaN
  if (x > 709.782712893384) return Infinity
  if (x < -745.1332191019412) return 0
  if (x === 0) return 1
  const [h, l, k] = expParts(x, 0)
  return scale(h, l, k)
}

/** Natural logarithm of x > 0 as a double-double (Newton step on Math.log). */
function lnParts(x) {
  const y = Math.log(x)
  // ln(x) = y + ln(x·e^-y), and x·e^-y = 1 + t with tiny t
  const [eh, el, ek] = expParts(-y, 0)
  const [ph, pl] = ddMul(x * 2 ** ek, 0, eh, el)
  const [th, tl] = ddAdd(ph, pl, -1, 0)
  const t = th + tl
  return ddAdd(y, 0, t - (t * t) / 2, 0)
}

/** ln(x), correctly rounded. */
export function exactLn(x) {
  if (Number.isNaN(x) || x < 0) return NaN
  if (x === 0) return -Infinity
  if (x === Infinity || x === 1) return x === 1 ? 0 : Infinity
  const [h, l] = lnParts(x)
  return h + l
}

/**
 * x^y as the legacy program computes it: integer exponents by exact repeated
 * multiplication, otherwise exp(y·ln x); both correctly rounded at the end.
 */
export function exactPow(x, y) {
  if (Number.isNaN(x) || Number.isNaN(y)) return NaN
  if (y === 0) return 1
  if (Number.isInteger(y) && Math.abs(y) <= 1024) {
    // exponentiation by squaring in double-double
    let n = Math.abs(y)
    let rh = 1, rl = 0
    let bh = x, bl = 0
    while (n > 0) {
      if (n & 1) [rh, rl] = ddMul(rh, rl, bh, bl)
      n >>= 1
      if (n) [bh, bl] = ddMul(bh, bl, bh, bl)
    }
    if (y > 0) return rh + rl
    if (!Number.isFinite(rh) || rh === 0) return 1 / rh
    // 1 / (rh + rl) in double-double: q + correction
    const q = 1 / rh
    const [p, pe] = twoProd(q, rh)
    const r = (1 - p) - pe - q * rl
    return q + q * r
  }
  if (x < 0) return NaN // the legacy program has no complex results
  if (x === 0) return y > 0 ? 0 : Infinity
  const [lh, ll] = lnParts(x)
  const [ph, pl] = ddMul(lh, ll, y, 0)
  if (ph > 709.79) return Infinity
  if (ph < -745.2) return 0
  const [h, l, k] = expParts(ph, pl)
  return scale(h, l, k)
}
