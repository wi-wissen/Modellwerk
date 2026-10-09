import { formatNumber } from './engine/model.js'

// Series colours (Okabe-Ito, colour-blind safe; blue = accent colour) and dash patterns.
export const SERIES_COLORS = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--s5)', 'var(--s6)']
export const SERIES_DASHES = ['', '8 5', '2 4', '12 4 2 4', '4 3', '16 6']
export const seriesColor = (i) => SERIES_COLORS[i % SERIES_COLORS.length]

// Dash patterns of the legacy line styles (Windows pen styles 0–5; 5 = no line)
export const LINE_DASHES = ['', '8 5', '2 4', '10 4 2 4', '10 4 2 4 2 4', null]
export const CURVE_MODES = ['line', 'points', 'both', 'bars']
export const MARKERS = ['cross', 'circle', 'disc']

// The Windows colours that PRG files use, shown as Tailwind tones with their own
// light and dark value (tokens --legacy-* in style.css): still blue, but a modern
// blue. `light` is the light-theme value, e.g. for the colour picker.
export const LEGACY_COLORS = {
  '#800000': { name: 'maroon', light: '#991b1b' },
  '#008000': { name: 'green', light: '#15803d' },
  '#808000': { name: 'olive', light: '#b45309' },
  '#000080': { name: 'navy', light: '#1e40af' },
  '#800080': { name: 'purple', light: '#7e22ce' },
  '#008080': { name: 'teal', light: '#0f766e' },
  '#808080': { name: 'gray', light: '#6b7280' },
  '#c0c0c0': { name: 'silver', light: '#9ca3af' },
  '#ff0000': { name: 'red', light: '#dc2626' },
  '#00ff00': { name: 'lime', light: '#65a30d' },
  '#ffff00': { name: 'yellow', light: '#ca8a04' },
  '#0000ff': { name: 'blue', light: '#2563eb' },
  '#ff00ff': { name: 'fuchsia', light: '#c026d3' },
  '#00ffff': { name: 'aqua', light: '#0891b2' },
  '#ffffff': { name: 'white', light: '#d1d5db' },
}

/**
 * Colour of a stored style: a Windows colour becomes its Tailwind token, any
 * other colour is used as chosen and lightened in the dark theme (--fixed-lift);
 * null is the legacy black, shown in the text colour.
 */
export function fixedColor(hex) {
  if (!hex) return 'var(--ink)'
  const legacy = LEGACY_COLORS[hex.toLowerCase()]
  return legacy ? `var(--legacy-${legacy.name})` : `color-mix(in oklab, ${hex}, #fff var(--fixed-lift))`
}

/** The colour as shown in the light theme (hex), for colour pickers. */
export const shownHex = (hex) => (hex ? LEGACY_COLORS[hex.toLowerCase()]?.light ?? hex : null)

/**
 * Effective look of curve number `i`: the automatic palette, or a stored style
 * { mode, dash (0–5), width, color, marker, markerSize, markerColor } where a
 * null colour means the legacy black (shown in the text colour).
 */
export function curveStyle(i, style, mode = 'line') {
  if (!style) return { color: seriesColor(i), dash: seriesDash(i), width: 2.5, mode, marker: 'disc', markerSize: 3, markerColor: seriesColor(i) }
  const color = fixedColor(style.color)
  return {
    color,
    dash: style.dash >= 0 && style.dash < LINE_DASHES.length ? LINE_DASHES[style.dash] : '',
    width: 1.5 + (style.width ?? 1),
    mode: style.mode ?? mode,
    marker: style.marker ?? 'disc',
    markerSize: Math.max(2, (style.markerSize ?? 4) * 0.8),
    markerColor: style.markerColor ? fixedColor(style.markerColor) : color,
  }
}
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

/** Tick label with as many decimals as the tick step needs; no grouping below 10 000 (years read as 1905). */
export function tickLabel(v, step, locale) {
  const a = Math.abs(v)
  if (v !== 0 && (a >= 1e7 || a < 1e-4)) return formatNumber(v, 4, locale)
  const decimals = Math.min(10, Math.max(0, -Math.floor(Math.log10(step) + 1e-9) + (Math.abs(step / 10 ** Math.floor(Math.log10(step) + 1e-9) - 2.5) < 1e-9 ? 1 : 0)))
  return v.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: decimals, useGrouping: a >= 1e4 })
}
