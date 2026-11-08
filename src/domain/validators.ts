import { normalizeDigits } from './digits'
import { jalaliToIso } from './jalali'
import type { Department, Employee, EmployeeInput } from './types'

export type ErrorCode =
  | 'required'
  | 'name_letters'
  | 'nid_length'
  | 'nid_checksum'
  | 'nid_duplicate'
  | 'pn_format'
  | 'pn_duplicate'
  | 'date_invalid'
  | 'date_future'
  | 'date_old'
  | 'dept_unknown'
  | 'status_invalid'
  | 'shift_invalid'

export type FieldErrors = Partial<Record<keyof EmployeeInput, ErrorCode>>

/**
 * Iranian national ID (kode melli) check: 10 digits, not all equal, and the last digit is
 * the checksum of the first nine weighted 10..2.
 */
export function isValidNationalId(value: string): boolean {
  const s = normalizeDigits(value.trim())
  if (!/^\d{10}$/.test(s)) return false
  if (/^(\d)\1{9}$/.test(s)) return false
  let sum = 0
  for (let i = 0; i < 9; i += 1) sum += Number(s[i]) * (10 - i)
  const r = sum % 11
  const check = Number(s[9])
  return r < 2 ? check === r : check === 11 - r
}

/** Compute the check digit for a 9-digit prefix (used for fixtures and tests). */
export function nationalIdCheckDigit(first9: string): number {
  let sum = 0
  for (let i = 0; i < 9; i += 1) sum += Number(first9[i]) * (10 - i)
  const r = sum % 11
  return r < 2 ? r : 11 - r
}

const PERSONNEL_RE = /^P-\d{4,6}$/

export function normalizePersonnelNo(value: string): string {
  return normalizeDigits(value.trim()).toUpperCase()
}

export function isValidPersonnelNo(value: string): boolean {
  return PERSONNEL_RE.test(normalizePersonnelNo(value))
}

/** Letters (any script), spaces, ZWNJ, hyphen and apostrophe; no digits. */
export function isValidName(value: string): boolean {
  return /^[\p{L}\p{M}][\p{L}\p{M} ‌'’-]*$/u.test(value.trim())
}

export function todayIso(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`
}

/** Returns null if `iso` is a real Gregorian calendar date in YYYY-MM-DD form. */
export function isRealIsoDate(iso: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return false
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const dt = new Date(Date.UTC(y, mo - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d
}

/**
 * Parse a date typed by the user: ISO Gregorian, or Jalali (year < 1700) with / or - separators,
 * Persian digits accepted. Returns the ISO date or null.
 */
export function parseDateInput(text: string): string | null {
  const s = normalizeDigits(text.trim())
  if (!s) return null
  const m = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/.exec(s)
  if (!m) return null
  if (Number(m[1]) < 1700) return jalaliToIso(s)
  const iso = `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  return isRealIsoDate(iso) ? iso : null
}

export interface ValidateContext {
  employees: Employee[]
  departments: Department[]
  /** The employee being edited (excluded from duplicate checks). */
  selfId?: string
  today?: string
}

/** Validate an employee. Returns an empty object when the record is valid. */
export function validateEmployee(input: EmployeeInput, ctx: ValidateContext): FieldErrors {
  const errors: FieldErrors = {}
  const today = ctx.today ?? todayIso()

  if (!input.givenName.trim()) errors.givenName = 'required'
  else if (!isValidName(input.givenName)) errors.givenName = 'name_letters'

  if (!input.surname.trim()) errors.surname = 'required'
  else if (!isValidName(input.surname)) errors.surname = 'name_letters'

  if (input.givenNameFa.trim() && !isValidName(input.givenNameFa)) errors.givenNameFa = 'name_letters'
  if (input.surnameFa.trim() && !isValidName(input.surnameFa)) errors.surnameFa = 'name_letters'

  const nid = normalizeDigits(input.nationalId.trim())
  if (!nid) errors.nationalId = 'required'
  else if (!/^\d{10}$/.test(nid)) errors.nationalId = 'nid_length'
  else if (!isValidNationalId(nid)) errors.nationalId = 'nid_checksum'
  else if (ctx.employees.some((e) => e.id !== ctx.selfId && normalizeDigits(e.nationalId) === nid))
    errors.nationalId = 'nid_duplicate'

  const pn = normalizePersonnelNo(input.personnelNo)
  if (!pn) errors.personnelNo = 'required'
  else if (!PERSONNEL_RE.test(pn)) errors.personnelNo = 'pn_format'
  else if (ctx.employees.some((e) => e.id !== ctx.selfId && e.personnelNo.toUpperCase() === pn))
    errors.personnelNo = 'pn_duplicate'

  if (!input.jobTitle.trim()) errors.jobTitle = 'required'

  if (!ctx.departments.some((d) => d.id === input.departmentId)) errors.departmentId = 'dept_unknown'
  if (!['active', 'leave', 'inactive'].includes(input.status)) errors.status = 'status_invalid'
  if (!['A', 'B', 'C', 'none'].includes(input.shiftGroup)) errors.shiftGroup = 'shift_invalid'

  if (!input.startDate) errors.startDate = 'required'
  else if (!isRealIsoDate(input.startDate)) errors.startDate = 'date_invalid'
  else if (input.startDate > today) errors.startDate = 'date_future'
  else if (input.startDate < '1950-01-01') errors.startDate = 'date_old'

  return errors
}
