import { describe, expect, it } from 'vitest'
import { guardCell, parseCsv, toCsv, unguardCell } from './csv'
import { normalizeDigits, toFaDigits } from './digits'
import { csvRowsToRecords, parseJsonRecords, validateRecords } from './importer'
import { isLeapJalali, isoToJalali, jalaliMonthLength, jalaliToIso, persianWeekday, toGregorian, toJalali } from './jalali'
import { DEFAULT_QUERY, queryEmployees } from './query'
import { shiftOn, weekPattern } from './shifts'
import type { Department, Employee, EmployeeInput } from './types'
import {
  isRealIsoDate,
  isValidName,
  isValidNationalId,
  isValidPersonnelNo,
  nationalIdCheckDigit,
  parseDateInput,
  validateEmployee,
} from './validators'

const depts: Department[] = [
  { id: 'd1', name: 'Production', nameFa: 'تولید', headId: null },
  { id: 'd2', name: 'Sales', nameFa: 'فروش', headId: null },
]

const good: EmployeeInput = {
  givenName: 'Narges',
  surname: 'Ahmadi',
  givenNameFa: '',
  surnameFa: '',
  nationalId: '0499370899',
  personnelNo: 'P-1004',
  jobTitle: 'Account manager',
  jobTitleFa: '',
  departmentId: 'd2',
  status: 'active',
  shiftGroup: 'none',
  startDate: '2022-05-08',
}
const ctx = { employees: [] as Employee[], departments: depts, today: '2026-11-08' }

describe('national ID checksum', () => {
  it('accepts known valid numbers', () => {
    expect(isValidNationalId('0499370899')).toBe(true)
    expect(isValidNationalId('0084575948')).toBe(true)
    expect(isValidNationalId('0012345678')).toBe(false)
    expect(isValidNationalId('0012345679')).toBe(true)
  })
  it('accepts Persian digits and surrounding spaces', () => {
    expect(isValidNationalId(' ۰۴۹۹۳۷۰۸۹۹ ')).toBe(true)
  })
  it('rejects wrong length, letters and repeated digits', () => {
    expect(isValidNationalId('049937089')).toBe(false)
    expect(isValidNationalId('04993708990')).toBe(false)
    expect(isValidNationalId('04993a0899')).toBe(false)
    expect(isValidNationalId('1111111111')).toBe(false)
    expect(isValidNationalId('0000000000')).toBe(false)
  })
  it('check digit helper agrees with the validator', () => {
    for (let i = 0; i < 200; i += 1) {
      const base = String(100000000 + i * 4999).slice(0, 9)
      expect(isValidNationalId(base + nationalIdCheckDigit(base))).toBe(true)
    }
  })
})

describe('personnel number and names', () => {
  it('requires P- and 4 to 6 digits', () => {
    expect(isValidPersonnelNo('P-1004')).toBe(true)
    expect(isValidPersonnelNo('p-۱۰۰۴')).toBe(true)
    expect(isValidPersonnelNo('1004')).toBe(false)
    expect(isValidPersonnelNo('P-12')).toBe(false)
    expect(isValidPersonnelNo('P-1234567')).toBe(false)
  })
  it('names allow letters in any script and reject digits', () => {
    expect(isValidName('Narges')).toBe(true)
    expect(isValidName('نرگس')).toBe(true)
    expect(isValidName("O'Neil-Smith")).toBe(true)
    expect(isValidName('کریم‌زاده')).toBe(true)
    expect(isValidName('Ali2')).toBe(false)
    expect(isValidName('<b>')).toBe(false)
    expect(isValidName('  ')).toBe(false)
  })
})

describe('dates', () => {
  it('detects real calendar dates', () => {
    expect(isRealIsoDate('2024-02-29')).toBe(true)
    expect(isRealIsoDate('2023-02-29')).toBe(false)
    expect(isRealIsoDate('2023-13-01')).toBe(false)
    expect(isRealIsoDate('23-01-01')).toBe(false)
  })
  it('parses Gregorian and Jalali input with Persian digits', () => {
    expect(parseDateInput('2022-05-08')).toBe('2022-05-08')
    expect(parseDateInput('۱۴۰۱/۰۲/۱۸')).toBe('2022-05-08')
    expect(parseDateInput('1401/2/18')).toBe('2022-05-08')
    expect(parseDateInput('1401/13/01')).toBeNull()
    expect(parseDateInput('1402/12/30')).toBeNull() // 1402 is not a leap year
    expect(parseDateInput('abc')).toBeNull()
  })
})

describe('jalali conversion', () => {
  it('maps known dates', () => {
    expect(toJalali(2026, 3, 21)).toEqual({ jy: 1405, jm: 1, jd: 1 })
    expect(toJalali(2026, 11, 8)).toEqual({ jy: 1405, jm: 8, jd: 17 })
    expect(toJalali(2022, 5, 8)).toEqual({ jy: 1401, jm: 2, jd: 18 })
    expect(toGregorian(1403, 1, 1)).toEqual({ gy: 2024, gm: 3, gd: 20 })
  })
  it('handles leap years', () => {
    expect(isLeapJalali(1403)).toBe(true)
    expect(isLeapJalali(1402)).toBe(false)
    expect(jalaliMonthLength(1403, 12)).toBe(30)
    expect(jalaliMonthLength(1402, 12)).toBe(29)
  })
  it('round-trips and agrees with Intl over many days', () => {
    const fmt = new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', { year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'UTC' })
    for (let t = Date.UTC(1990, 0, 1); t < Date.UTC(2040, 0, 1); t += 86_400_000 * 13) {
      const d = new Date(t)
      const iso = d.toISOString().slice(0, 10)
      const j = isoToJalali(iso)
      expect(jalaliToIso(j)).toBe(iso)
      const parts = fmt.formatToParts(d)
      const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
      expect(j).toBe(`${String(get('year')).padStart(4, '0')}/${String(get('month')).padStart(2, '0')}/${String(get('day')).padStart(2, '0')}`)
    }
  })
  it('numbers weekdays from Saturday', () => {
    expect(persianWeekday('2026-11-07')).toBe(0) // Saturday
    expect(persianWeekday('2026-11-08')).toBe(1) // Sunday
    expect(persianWeekday('2026-11-13')).toBe(6) // Friday
  })
})

describe('digits', () => {
  it('converts both ways', () => {
    expect(normalizeDigits('۰۱۲۳۴۵۶۷۸۹ ٠١٢')).toBe('0123456789 012')
    expect(toFaDigits('P-1004')).toBe('P-۱۰۰۴')
    expect(toFaDigits(24)).toBe('۲۴')
  })
})

describe('validateEmployee', () => {
  it('passes a good record', () => {
    expect(validateEmployee(good, ctx)).toEqual({})
  })
  it('reports each problem with a code', () => {
    const bad: EmployeeInput = { ...good, givenName: '', surname: 'A1', nationalId: '0012345678', personnelNo: '1004', startDate: null, departmentId: 'zzz' }
    expect(validateEmployee(bad, ctx)).toEqual({
      givenName: 'required',
      surname: 'name_letters',
      nationalId: 'nid_checksum',
      personnelNo: 'pn_format',
      startDate: 'required',
      departmentId: 'dept_unknown',
    })
  })
  it('distinguishes length from checksum errors', () => {
    expect(validateEmployee({ ...good, nationalId: '12345' }, ctx).nationalId).toBe('nid_length')
    expect(validateEmployee({ ...good, nationalId: '' }, ctx).nationalId).toBe('required')
  })
  it('rejects future, old and impossible dates', () => {
    expect(validateEmployee({ ...good, startDate: '2027-01-01' }, ctx).startDate).toBe('date_future')
    expect(validateEmployee({ ...good, startDate: '1940-01-01' }, ctx).startDate).toBe('date_old')
    expect(validateEmployee({ ...good, startDate: '2023-02-30' }, ctx).startDate).toBe('date_invalid')
  })
  it('catches duplicates but not against itself', () => {
    const other = { ...good, id: 'e1', history: [] } as Employee
    const c = { ...ctx, employees: [other] }
    const e = validateEmployee(good, c)
    expect(e.personnelNo).toBe('pn_duplicate')
    expect(e.nationalId).toBe('nid_duplicate')
    expect(validateEmployee(good, { ...c, selfId: 'e1' })).toEqual({})
  })
})

describe('csv', () => {
  it('parses quotes, commas, newlines, CRLF and BOM', () => {
    const rows = parseCsv('\uFEFFa,b\r\n"x, y","He said ""hi"""\r\n"line1\nline2",z\r\n\r\n')
    expect(rows).toEqual([['a', 'b'], ['x, y', 'He said "hi"'], ['line1\nline2', 'z']])
  })
  it('round-trips through toCsv', () => {
    const rows = [['a', 'b,c'], ['"q"', 'نرگس']]
    expect(parseCsv(toCsv(rows))).toEqual(rows)
  })
  it('guards formula injection and reverses it on import', () => {
    expect(guardCell('=SUM(A1)')).toBe("'=SUM(A1)")
    expect(guardCell('+1')).toBe("'+1")
    expect(guardCell('Safe')).toBe('Safe')
    expect(unguardCell("'=SUM(A1)")).toBe('=SUM(A1)')
    expect(unguardCell("O'Neil")).toBe("O'Neil")
    expect(toCsv([['=HYPERLINK("x")']])).toContain("'=HYPERLINK")
  })
})

describe('import validation', () => {
  const header = 'personnelNo,givenName,surname,nationalId,department,jobTitle,status,shiftGroup,startDate'
  const run = (lines: string[], existing: Employee[] = []) =>
    validateRecords(csvRowsToRecords(parseCsv([header, ...lines].join('\n'))), existing, depts, '2026-11-08')

  it('splits valid rows from problems with row numbers', () => {
    const r = run([
      'P-2001,Ava,Nouri,0499370899,Sales,Rep,active,A,2024-01-01',
      'P-2002,Bad,Id,049937089,Sales,Rep,active,,2024-01-01',
      'P-2003,No,Dept,0084575948,Nowhere,Rep,active,,2024-01-01',
      'P-2001,Dup,Pn,0084575948,Sales,Rep,active,,2024-01-01',
      'P-2005,Odd,Status,0084575948,Sales,Rep,retired,,2024-01-01',
      'P-2006,Ok,Row,0084575948,تولید,Rep,مرخصی,none,۱۴۰۲/۰۱/۰۱',
    ])
    expect(r.total).toBe(6)
    expect(r.valid.map((v) => v.personnelNo)).toEqual(['P-2001', 'P-2006'])
    expect(r.valid[1]).toMatchObject({ departmentId: 'd1', status: 'leave', startDate: '2023-03-21', shiftGroup: 'none' })
    expect(r.problems.map((p) => [p.row, p.errors.nationalId ?? p.errors.departmentId ?? p.errors.personnelNo ?? p.message])).toEqual([
      [3, 'nid_length'],
      [4, 'dept_unknown'],
      [5, 'pn_duplicate'],
      [6, 'status'],
    ])
  })
  it('flags an unparseable date as invalid', () => {
    const r = run(['P-2001,Ava,Nouri,0499370899,Sales,Rep,active,A,31/31/2020'])
    expect(r.problems[0].errors.startDate).toBe('date_invalid')
  })
  it('parses JSON arrays and backup objects, rejects junk', () => {
    expect(parseJsonRecords('not json', depts)).toBeNull()
    expect(parseJsonRecords('{"a":1}', depts)).toBeNull()
    const arr = parseJsonRecords('[{"givenName":"A","departmentId":"d2"}]', depts)
    expect(arr?.records[0].department).toBe('Sales')
    const backup = parseJsonRecords('{"departments":[{"name":"HR"}],"employees":[{"givenName":"B"}]}', depts)
    expect(backup?.departmentNames).toEqual(['HR'])
  })
})

describe('queryEmployees', () => {
  const mk = (i: number, over: Partial<Employee>): Employee => ({
    ...good,
    id: `e${i}`,
    personnelNo: `P-${1000 + i}`,
    nationalId: `00000000${i}${i}`,
    history: [],
    ...over,
  })
  const list = [
    mk(1, { surname: 'Karimi', givenName: 'Mahdi', surnameFa: 'کریمی', departmentId: 'd1', startDate: '2019-03-12' }),
    mk(2, { surname: 'Ahmadi', givenName: 'Narges', surnameFa: 'احمدی', departmentId: 'd2', status: 'leave', startDate: '2022-05-08' }),
    mk(3, { surname: 'Zarei', givenName: 'Mina', surnameFa: 'زارعی', departmentId: 'd2', startDate: null }),
    mk(10, { surname: 'Bagheri', givenName: 'Leila', surnameFa: 'باقری', departmentId: 'd1', startDate: '2021-06-21' }),
  ]
  const q = (o: Partial<typeof DEFAULT_QUERY>) => ({ ...DEFAULT_QUERY, ...o })
  it('searches names, IDs, personnel numbers and Persian text', () => {
    expect(queryEmployees(list, depts, q({ search: 'karim' })).items.map((e) => e.id)).toEqual(['e1'])
    expect(queryEmployees(list, depts, q({ search: 'کریمی' })).total).toBe(1)
    expect(queryEmployees(list, depts, q({ search: 'p-۱۰۰۲' })).items[0].id).toBe('e2')
    expect(queryEmployees(list, depts, q({ search: '000000033' })).items[0].id).toBe('e3')
    expect(queryEmployees(list, depts, q({ search: 'nobody' })).total).toBe(0)
  })
  it('filters by department and status', () => {
    expect(queryEmployees(list, depts, q({ departmentId: 'd2' })).total).toBe(2)
    expect(queryEmployees(list, depts, q({ departmentId: 'd2', status: 'leave' })).items[0].id).toBe('e2')
  })
  it('sorts', () => {
    const ids = (sort: typeof DEFAULT_QUERY.sort) => queryEmployees(list, depts, q({ sort })).items.map((e) => e.id)
    expect(ids('surname_asc')).toEqual(['e2', 'e10', 'e1', 'e3'])
    expect(ids('surname_desc')).toEqual(['e3', 'e1', 'e10', 'e2'])
    expect(ids('start_desc')).toEqual(['e2', 'e10', 'e1', 'e3'])
    expect(ids('personnel')).toEqual(['e1', 'e2', 'e3', 'e10'])
  })
  it('paginates and clamps the page', () => {
    const p = queryEmployees(list, depts, q({ pageSize: 3, page: 2 }))
    expect(p).toMatchObject({ total: 4, page: 2, pageCount: 2 })
    expect(p.items).toHaveLength(1)
    expect(queryEmployees(list, depts, q({ pageSize: 3, page: 99 })).page).toBe(2)
    expect(queryEmployees([], depts, q({})).pageCount).toBe(1)
  })
})

describe('shifts', () => {
  it('has a 7-day pattern per group and rotates', () => {
    expect(weekPattern('A')).toEqual(['M', 'M', 'M', 'Off', 'Off', 'N', 'N'])
    expect(weekPattern('B')).not.toEqual(weekPattern('A'))
    expect(weekPattern('none').every((s) => s === 'Off')).toBe(true)
    expect(shiftOn('A', 7)).toBe('M')
  })
})
