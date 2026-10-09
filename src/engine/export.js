// Table export. Values keep full double precision (shortest round-trip form).

/** Separators for spreadsheets: German Excel expects ";" and decimal commas. */
export function csvFormat(locale) {
  return locale === 'de' ? { separator: ';', decimal: ',' } : { separator: ',', decimal: '.' }
}

function cell(value, decimal, separator) {
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return ''
    const text = String(value)
    return decimal === '.' ? text : text.replace('.', decimal)
  }
  const text = String(value)
  return /["\n\r]/.test(text) || text.includes(separator) ? `"${text.replace(/"/g, '""')}"` : text
}

/** Rows of [step, ...values] for the given columns, every `every`-th step. */
export function tableRows(result, columns, every = 1) {
  const rows = []
  for (let i = 0; i <= result.steps; i += every) rows.push([i, ...columns.map((c) => result.series[c][i])])
  if (rows[rows.length - 1][0] !== result.steps) rows.push([result.steps, ...columns.map((c) => result.series[c][result.steps])])
  return rows
}

export function toDelimited(header, rows, { separator, decimal }) {
  return [header, ...rows].map((r) => r.map((v) => cell(v, decimal, separator)).join(separator)).join('\r\n')
}

/** CSV with UTF-8 byte order mark so spreadsheet programs detect umlauts. */
export function toCsv(header, rows, locale) {
  return '﻿' + toDelimited(header, rows, csvFormat(locale))
}

/** Tab-separated text for pasting into spreadsheets. */
export function toTsv(header, rows, locale) {
  return toDelimited(header, rows, { ...csvFormat(locale), separator: '\t' })
}
