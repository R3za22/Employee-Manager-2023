/** Minimal RFC 4180 CSV parser. Handles quotes, escaped quotes, CRLF and a UTF-8 BOM. */
export function parseCsv(text: string): string[][] {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i]
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"'
          i += 1
        } else inQuotes = false
      } else cell += ch
    } else if (ch === '"') inQuotes = true
    else if (ch === ',') {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i += 1
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else cell += ch
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''))
}

const FORMULA_START = /^[=+\-@\t\r]/

/** Neutralise spreadsheet formula injection: cells that would start a formula get a leading apostrophe. */
export function guardCell(value: string): string {
  return FORMULA_START.test(value) ? `'${value}` : value
}

/** Reverse of guardCell, applied on import. */
export function unguardCell(value: string): string {
  return /^'[=+\-@\t\r]/.test(value) ? value.slice(1) : value
}

function escapeCell(value: string): string {
  const v = guardCell(value)
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

export function toCsv(rows: string[][]): string {
  return rows.map((r) => r.map(escapeCell).join(',')).join('\r\n') + '\r\n'
}
