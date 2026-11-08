const FA = '۰۱۲۳۴۵۶۷۸۹'
const AR = '٠١٢٣٤٥٦٧٨٩'

/** Convert Persian and Arabic-Indic digits to ASCII digits. */
export function normalizeDigits(input: string): string {
  let out = ''
  for (const ch of input) {
    const f = FA.indexOf(ch)
    const a = AR.indexOf(ch)
    out += f >= 0 ? String(f) : a >= 0 ? String(a) : ch
  }
  return out
}

/** Replace ASCII digits with Persian digits. */
export function toFaDigits(input: string | number): string {
  return String(input).replace(/\d/g, (d) => FA[Number(d)])
}
