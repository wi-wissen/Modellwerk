// Kurvenfarben (Okabe-Ito, farbenblind-sicher; Blau = Akzentfarbe) und Strichmuster.
export const SERIES_COLORS = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--s5)', 'var(--s6)']
export const SERIES_DASHES = ['', '8 5', '2 4', '12 4 2 4', '4 3', '16 6']
export const seriesColor = (i) => SERIES_COLORS[i % SERIES_COLORS.length]
export const seriesDash = (i) => SERIES_DASHES[i % SERIES_DASHES.length]

/** Polyline points for a small preview of `data` inside a w×h box (own min/max). */
export function sparkPoints(data, w = 40, h = 16, samples = 40, pad = 2) {
  if (!data?.length) return ''
  const n = data.length
  const count = Math.min(n, samples)
  let lo = Infinity
  let hi = -Infinity
  for (const v of data) if (Number.isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v) }
  if (!(hi > lo)) { lo -= 1; hi += 1 }
  const pts = []
  for (let k = 0; k < count; k++) {
    const f = k / Math.max(1, count - 1)
    const v = data[Math.round(f * (n - 1))]
    if (Number.isFinite(v)) pts.push(`${(pad + f * (w - 2 * pad)).toFixed(1)},${(h - pad - ((v - lo) / (hi - lo)) * (h - 2 * pad)).toFixed(1)}`)
  }
  return pts.join(' ')
}
