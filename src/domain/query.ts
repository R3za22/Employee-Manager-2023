import { normalizeDigits } from './digits'
import type { Department, Employee, EmployeeQuery, Page } from './types'

export const DEFAULT_QUERY: EmployeeQuery = {
  search: '',
  departmentId: '',
  status: '',
  sort: 'surname_asc',
  page: 1,
  pageSize: 8,
}

export function isFiltered(q: Pick<EmployeeQuery, 'search' | 'departmentId' | 'status'>): boolean {
  return q.search.trim() !== '' || q.departmentId !== '' || q.status !== ''
}

const fold = (s: string) => s.toLowerCase().replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/‌/g, ' ')

export function matchesSearch(e: Employee, search: string): boolean {
  const raw = search.trim()
  if (!raw) return true
  const needle = fold(normalizeDigits(raw))
  const hay = [e.givenName, e.surname, e.givenNameFa, e.surnameFa, e.nationalId, e.personnelNo, `${e.givenName} ${e.surname}`, `${e.givenNameFa} ${e.surnameFa}`]
    .map((v) => fold(normalizeDigits(v)))
  return hay.some((h) => h.includes(needle))
}

export function queryEmployees(
  all: Employee[],
  _departments: Department[],
  q: EmployeeQuery,
  locale: 'en' | 'fa' = 'en',
): Page<Employee> {
  const filtered = all.filter(
    (e) =>
      matchesSearch(e, q.search) &&
      (!q.departmentId || e.departmentId === q.departmentId) &&
      (!q.status || e.status === q.status),
  )
  const surname = (e: Employee) => (locale === 'fa' && e.surnameFa ? e.surnameFa : e.surname)
  const given = (e: Employee) => (locale === 'fa' && e.givenNameFa ? e.givenNameFa : e.givenName)
  const collator = new Intl.Collator(locale === 'fa' ? 'fa' : 'en')
  const bySurname = (a: Employee, b: Employee) =>
    collator.compare(surname(a), surname(b)) || collator.compare(given(a), given(b))
  const sorted = [...filtered]
  switch (q.sort) {
    case 'surname_desc':
      sorted.sort((a, b) => bySurname(b, a))
      break
    case 'start_desc':
      sorted.sort((a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? '') || bySurname(a, b))
      break
    case 'personnel':
      sorted.sort((a, b) => a.personnelNo.localeCompare(b.personnelNo, 'en', { numeric: true }))
      break
    default:
      sorted.sort(bySurname)
  }
  const pageSize = Math.max(1, q.pageSize)
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize))
  const page = Math.min(Math.max(1, q.page), pageCount)
  return {
    items: sorted.slice((page - 1) * pageSize, page * pageSize),
    total: sorted.length,
    page,
    pageSize,
    pageCount,
  }
}
