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

// ln 2 as double-double
const LN2_HI = 0.6931471805599453
const LN2_LO = 2.3190468138462996e-17

/** exp(x), correctly rounded to an IEEE-754 double. */
export function exactExp(x) {
  if (Number.isNaN(x)) return NaN
  if (x > 709.782712893384) return Infinity
  if (x < -745.1332191019412) return 0
  if (x === 0) return 1

  // x = k·ln2 + r with |r| ≤ ln2/2, r as double-double
  const k = Math.round(x / LN2_HI)
  const [p1, p1e] = twoProd(k, LN2_HI)
  let [rh, rl] = twoSum(x, -p1)
  rl -= p1e
  const [p2, p2e] = twoProd(k, LN2_LO)
  ;[rh, rl] = ddAdd(rh, rl, -p2, -p2e)

  // further reduction: r/256, Taylor series, then square 8 times
  rh /= 256
  rl /= 256
  let sh = 1, sl = 0 // sum
  let th = 1, tl = 0 // term r^n/n!
  for (let n = 1; n <= 14; n++) {
    ;[th, tl] = ddMul(th, tl, rh, rl)
    th /= n
    tl /= n
    ;[sh, sl] = ddAdd(sh, sl, th, tl)
  }
  for (let i = 0; i < 8; i++) [sh, sl] = ddMul(sh, sl, sh, sl)

  // scale by 2^k; exact in the normal range
  if (k > 1023) return (sh + sl) * 2 ** 1023 * 2 ** (k - 1023)
  if (k < -1000) {
    // subnormal range: scale partially first so that rounding happens only once
    const [hh, hl] = [sh * 2 ** (k + 1000), sl * 2 ** (k + 1000)]
    return (hh + hl) * 2 ** -1000
  }
  const scale = 2 ** k
  return sh * scale + sl * scale
}
