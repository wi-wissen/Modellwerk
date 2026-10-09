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

/**
 * Rounds h + l (a normalised double-double) the way the x87 FPU stores a
 * transcendental result: first to extended precision (64-bit significand), then
 * to double, both ties-to-even. Differs from plain rounding only when the
 * extended value lands exactly halfway between two doubles.
 */
export function x87Round(h, l) {
  if (l === 0 || !Number.isFinite(h) || h === 0) return h + l
  const ulp = ulpOf(h, Math.sign(l) !== Math.sign(h))
  const u = (l / ulp) * 2048 // l in units of the extended ulp (exact: power-of-two scaling)
  let n = Math.round(u)
  if (Math.abs(u - Math.trunc(u)) === 0.5) n = 2 * Math.round(u / 2) // ties-to-even
  if (Math.abs(n) !== 1024) return h // extended value is not a midpoint: nearest double is h
  // exactly halfway between h and its neighbour: ties-to-even on the double significand
  return isEvenSignificand(h) ? h : h + Math.sign(l) * ulp
}

function ulpOf(x, towardZero) {
  const a = Math.abs(x)
  let e = Math.floor(Math.log2(a))
  if (2 ** e > a) e--
  if (2 ** (e + 1) <= a) e++
  const ulp = 2 ** Math.max(e - 52, -1074)
  // stepping below a power of two the spacing halves
  return towardZero && a === 2 ** e ? ulp / 2 : ulp
}

function isEvenSignificand(x) {
  const buf = new DataView(new ArrayBuffer(8))
  buf.setFloat64(0, x)
  return (buf.getUint8(7) & 1) === 0
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

/** exp(x), correctly rounded (matches the legacy program; x87 double rounding does not). */
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

// --- trigonometry as the x87 FPU computes it --------------------------------
// FSIN/FCOS reduce the argument with a 66-bit approximation of pi and then
// evaluate the reduced argument almost exactly; the legacy program stores the
// result as a double. Verified against values the legacy program computed.
// pi/2 with 66 significant bits, as an exact double-double:
const X87_PIO2_HI = 1.5707963267948966
const X87_PIO2_LO = 6.123031769111886e-17

/** sin and cos of a small double-double argument (|r| ≤ ~0.8) by Taylor series. */
function sinCosParts(rh, rl) {
  const [r2h, r2l] = ddMul(rh, rl, rh, rl)
  // sin: r - r^3/3! + r^5/5! …, cos: 1 - r^2/2! + r^4/4! …
  let sh = rh, sl = rl, th = rh, tl = rl
  for (let n = 2; n <= 40; n += 2) {
    ;[th, tl] = ddMul(th, tl, r2h, r2l)
    ;[th, tl] = ddDivInt(th, tl, n * (n + 1))
    th = -th; tl = -tl
    ;[sh, sl] = ddAdd(sh, sl, th, tl)
    if (Math.abs(th) < 1e-40) break
  }
  let ch = 1, cl = 0
  th = 1; tl = 0
  for (let n = 1; n <= 40; n += 2) {
    ;[th, tl] = ddMul(th, tl, r2h, r2l)
    ;[th, tl] = ddDivInt(th, tl, n * (n + 1))
    th = -th; tl = -tl
    ;[ch, cl] = ddAdd(ch, cl, th, tl)
    if (Math.abs(th) < 1e-40) break
  }
  return [sh, sl, ch, cl]
}

// true pi/2 as double-double
const PIO2_HI = 1.5707963267948966
const PIO2_LO = 6.123233995736766e-17

/** Reduces x by multiples of pi/2 (given as hi + lo); returns quadrant and remainder. */
function reduce(x, hi, lo) {
  const k = Math.round(x / hi)
  const [p1, p1e] = twoProd(k, hi)
  let [rh, rl] = twoSum(x, -p1)
  rl -= p1e
  const [p2, p2e] = twoProd(k, lo)
  ;[rh, rl] = ddAdd(rh, rl, -p2, -p2e)
  return [((k % 4) + 4) % 4, rh, rl]
}

function x87Trig(x, cosine) {
  if (!Number.isFinite(x)) return NaN
  if (x === 0) return cosine ? 1 : x
  const [q, rh, rl] = reduce(x, X87_PIO2_HI, X87_PIO2_LO)
  const [sh, sl, ch, cl] = sinCosParts(rh, rl)
  const quadrant = (q + (cosine ? 1 : 0)) % 4
  if (quadrant === 0) return x87Round(sh, sl)
  if (quadrant === 1) return x87Round(ch, cl)
  if (quadrant === 2) return -x87Round(sh, sl)
  return -x87Round(ch, cl)
}

export const x87Sin = (x) => x87Trig(x, false)
export const x87Cos = (x) => x87Trig(x, true)

/** arctan(x), correctly rounded (one Newton step in double-double on Math.atan). */
export function exactAtan(x) {
  if (Number.isNaN(x)) return NaN
  if (x === 0) return x
  if (!Number.isFinite(x)) return Math.sign(x) * X87_PIO2_HI
  const y = Math.atan(x)
  // atan(x) = y + atan((x·cos y − sin y) / (cos y + x·sin y)); the fraction is tiny
  const [q, rh, rl] = reduce(y, PIO2_HI, PIO2_LO)
  const [sh0, sl0, ch0, cl0] = sinCosParts(rh, rl)
  let [sh, sl, ch, cl] = [sh0, sl0, ch0, cl0]
  if (q === 1) [sh, sl, ch, cl] = [ch0, cl0, -sh0, -sl0]
  if (q === 3) [sh, sl, ch, cl] = [-ch0, -cl0, sh0, sl0]
  const [xch, xcl] = ddMul(x, 0, ch, cl)
  const [nh, nl] = ddAdd(xch, xcl, -sh, -sl)
  const t = (nh + nl) / (ch + x * sh)
  const [h, l] = ddAdd(y, 0, t, 0)
  return x87Round(h, l)
}
