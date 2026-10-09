// Korrekt gerundete Elementarfunktionen.
//
// Das Original (Delphi) berechnet EXP & Co. auf der x87-FPU mit 80 Bit und
// rundet erst beim Speichern auf Double. Das entspricht – bis auf extrem seltene
// Grenzfälle – der korrekt gerundeten Funktion. Math.exp in JavaScript-Engines
// liegt dagegen gelegentlich 1 ULP daneben. Wir rechnen daher intern in
// Double-Double-Arithmetik (~106 Bit) und runden einmal am Ende.

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

// ln 2 als Double-Double
const LN2_HI = 0.6931471805599453
const LN2_LO = 2.3190468138462996e-17

/** exp(x), korrekt gerundet auf IEEE-754-Double. */
export function exactExp(x) {
  if (Number.isNaN(x)) return NaN
  if (x > 709.782712893384) return Infinity
  if (x < -745.1332191019412) return 0
  if (x === 0) return 1

  // x = k·ln2 + r,  |r| ≤ ln2/2, r als Double-Double
  const k = Math.round(x / LN2_HI)
  const [p1, p1e] = twoProd(k, LN2_HI)
  let [rh, rl] = twoSum(x, -p1)
  rl -= p1e
  const [p2, p2e] = twoProd(k, LN2_LO)
  ;[rh, rl] = ddAdd(rh, rl, -p2, -p2e)

  // weitere Reduktion: r/256, Taylorreihe, dann 8× quadrieren
  rh /= 256
  rl /= 256
  let sh = 1, sl = 0 // Summe
  let th = 1, tl = 0 // Term r^n/n!
  for (let n = 1; n <= 14; n++) {
    ;[th, tl] = ddMul(th, tl, rh, rl)
    th /= n
    tl /= n
    ;[sh, sl] = ddAdd(sh, sl, th, tl)
  }
  for (let i = 0; i < 8; i++) [sh, sl] = ddMul(sh, sl, sh, sl)

  // Skalierung mit 2^k; im Normalbereich exakt
  if (k > 1023) return (sh + sl) * 2 ** 1023 * 2 ** (k - 1023)
  if (k < -1000) {
    // Subnormaler Bereich: erst teilweise skalieren, damit nur einmal gerundet wird
    const [hh, hl] = [sh * 2 ** (k + 1000), sl * 2 ** (k + 1000)]
    return (hh + hl) * 2 ** -1000
  }
  const scale = 2 ** k
  return sh * scale + sl * scale
}
