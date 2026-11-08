import { normalizeDigits } from './digits'
import { unguardCell } from './csv'
import type { Department, Employee, EmployeeInput, ShiftGroup, Status } from './types'
import { parseDateInput, validateEmployee, normalizePersonnelNo, type FieldErrors } from './validators'

export const CSV_COLUMNS = [
  'personnelNo',
  'givenName',
  'surname',
  'givenNameFa',
  'surnameFa',
  'nationalId',
  'department',
  'jobTitle',
  'jobTitleFa',
  'status',
  'shiftGroup',
  'startDate',
] as const

export type CsvColumn = (typeof CSV_COLUMNS)[number]

export interface RowProblem {
  /** 1-based line in the file, counting the header as line 1. */
  row: number
  label: string
  errors: FieldErrors
  /** Set when the row could not be read at all (wrong column count, unknown status...). */
  message?: 'columns' | 'status' | 'shift'
}

export interface ImportPreview {
  valid: EmployeeInput[]
  problems: RowProblem[]
  total: number
}

const STATUS_WORDS: Record<string, Status> = {
  active: 'active',
  'on leave': 'leave',
  leave: 'leave',
  inactive: 'inactive',
  فعال: 'active',
  مرخصی: 'leave',
  غیرفعال: 'inactive',
}

export function csvRowsToRecords(rows: string[][]): Record<string, string>[] {
  if (rows.length === 0) return []
  const header = rows[0].map((h) => h.trim())
  return rows.slice(1).map((r) => {
    const rec: Record<string, string> = {}
    header.forEach((h, i) => {
      rec[h] = r[i] ?? ''
    })
    return rec
  })
}

function str(v: unknown): string {
  return typeof v === 'string' ? unguardCell(v).trim() : typeof v === 'number' ? String(v) : ''
}

function findDepartment(name: string, departments: Department[]): Department | undefined {
  const n = name.trim().toLowerCase()
  if (!n) return undefined
  return departments.find((d) => d.id === name || d.name.toLowerCase() === n || d.nameFa === name.trim())
}

/**
 * Validate raw records (from CSV or JSON). Rows are checked against existing employees and
 * against the rows accepted earlier in the same file, so duplicates are caught either way.
 */
export function validateRecords(
  records: Record<string, unknown>[],
  existing: Employee[],
  departments: Department[],
  today?: string,
): ImportPreview {
  const valid: EmployeeInput[] = []
  const problems: RowProblem[] = []
  const pool: Employee[] = [...existing]
  records.forEach((rec, idx) => {
    const row = idx + 2
    const label = `${str(rec.givenName)} ${str(rec.surname)}`.trim() || str(rec.personnelNo) || `#${row}`
    const dept = findDepartment(str(rec.department) || str(rec.departmentId), departments)
    const statusRaw = str(rec.status).toLowerCase()
    const status = statusRaw ? STATUS_WORDS[statusRaw] : 'active'
    if (!status) {
      problems.push({ row, label, errors: {}, message: 'status' })
      return
    }
    const shiftRaw = str(rec.shiftGroup)
    const shift = (shiftRaw === '' ? 'none' : shiftRaw === '-' ? 'none' : shiftRaw.toUpperCase() === 'NONE' ? 'none' : shiftRaw.toUpperCase()) as ShiftGroup
    if (!['A', 'B', 'C', 'none'].includes(shift)) {
      problems.push({ row, label, errors: {}, message: 'shift' })
      return
    }
    const startRaw = str(rec.startDate)
    const startDate = startRaw ? parseDateInput(startRaw) ?? `invalid:${startRaw}` : null
    const input: EmployeeInput = {
      givenName: str(rec.givenName),
      surname: str(rec.surname),
      givenNameFa: str(rec.givenNameFa),
      surnameFa: str(rec.surnameFa),
      nationalId: normalizeDigits(str(rec.nationalId)),
      personnelNo: normalizePersonnelNo(str(rec.personnelNo)),
      jobTitle: str(rec.jobTitle),
      jobTitleFa: str(rec.jobTitleFa),
      departmentId: dept?.id ?? '',
      status,
      shiftGroup: shift,
      startDate,
    }
    const errors = validateEmployee(input, { employees: pool, departments, today })
    if (Object.keys(errors).length > 0) {
      problems.push({ row, label, errors })
      return
    }
    valid.push(input)
    pool.push({ ...input, id: `import-${idx}`, history: [] })
  })
  return { valid, problems, total: records.length }
}

/** Parse JSON text: a plain array of employees, or a backup object with an `employees` array. */
export function parseJsonRecords(
  text: string,
  departments: Department[],
): { records: Record<string, unknown>[]; departmentNames: string[] } | null {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return null
  }
  const list = Array.isArray(data) ? data : (data as { employees?: unknown })?.employees
  if (!Array.isArray(list)) return null
  const deptNames = Array.isArray((data as { departments?: unknown })?.departments)
    ? ((data as { departments: { name?: unknown }[] }).departments
        .map((d) => (typeof d?.name === 'string' ? d.name : ''))
        .filter(Boolean))
    : []
  const byId = new Map(departments.map((d) => [d.id, d.name]))
  const records = list
    .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
    .map((r) => {
      const dep = typeof r.department === 'string' ? r.department : byId.get(String(r.departmentId)) ?? String(r.departmentId ?? '')
      return { ...r, department: dep }
    })
  return { records, departmentNames: deptNames }
}
