export type Status = 'active' | 'leave' | 'inactive'
export type ShiftGroup = 'A' | 'B' | 'C' | 'none'

export interface HistoryEntry {
  /** ISO date (YYYY-MM-DD). */
  at: string
  kind: 'created' | 'status' | 'department' | 'shift' | 'title' | 'edited'
  from?: string
  to?: string
}

export interface Employee {
  id: string
  givenName: string
  surname: string
  givenNameFa: string
  surnameFa: string
  nationalId: string
  personnelNo: string
  jobTitle: string
  jobTitleFa: string
  departmentId: string
  status: Status
  shiftGroup: ShiftGroup
  /** ISO date (YYYY-MM-DD) or null when unknown. */
  startDate: string | null
  history: HistoryEntry[]
}

/** The editable part of an employee (what the form and import produce). */
export type EmployeeInput = Omit<Employee, 'id' | 'history'>

export interface Department {
  id: string
  name: string
  nameFa: string
  headId: string | null
}

export interface Activity {
  id: string
  /** ISO timestamp. */
  at: string
  kind: 'created' | 'updated' | 'deleted' | 'restored' | 'imported' | 'dept_added' | 'dept_renamed' | 'dept_removed'
  subject: string
  subjectFa: string
  source?: string
}

export type SortKey = 'surname_asc' | 'surname_desc' | 'start_desc' | 'personnel'

export interface EmployeeQuery {
  search: string
  departmentId: string
  status: Status | ''
  sort: SortKey
  page: number
  pageSize: number
}

export interface Page<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  pageCount: number
}

export const STATUSES: Status[] = ['active', 'leave', 'inactive']
export const SHIFT_GROUPS: ShiftGroup[] = ['A', 'B', 'C', 'none']
