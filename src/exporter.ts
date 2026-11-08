import { toCsv } from './domain/csv'
import { CSV_COLUMNS } from './domain/importer'
import type { Department, Employee } from './domain/types'

export function employeesToCsv(employees: Employee[], departments: Department[]): string {
  const dept = new Map(departments.map((d) => [d.id, d.name]))
  const rows = employees.map((e) => [
    e.personnelNo,
    e.givenName,
    e.surname,
    e.givenNameFa,
    e.surnameFa,
    e.nationalId,
    dept.get(e.departmentId) ?? '',
    e.jobTitle,
    e.jobTitleFa,
    e.status,
    e.shiftGroup,
    e.startDate ?? '',
  ])
  return toCsv([[...CSV_COLUMNS], ...rows])
}

export function csvTemplate(): string {
  return toCsv([
    [...CSV_COLUMNS],
    ['P-2001', 'Ava', 'Nouri', 'آوا', 'نوری', '0499370899', 'Sales', 'Analyst', 'تحلیلگر', 'active', 'none', '2024-01-15'],
  ])
}
