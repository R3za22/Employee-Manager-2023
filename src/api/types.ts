import type { Activity, Department, Employee, EmployeeInput, EmployeeQuery, Page } from '../domain/types'
import type { ErrorCode, FieldErrors } from '../domain/validators'

export class ValidationError extends Error {
  readonly errors: FieldErrors
  constructor(errors: FieldErrors) {
    super('Validation failed')
    this.name = 'ValidationError'
    this.errors = errors
  }
}

export class NotFoundError extends Error {
  constructor(what: string) {
    super(`${what} not found`)
    this.name = 'NotFoundError'
  }
}

export class DepartmentError extends Error {
  readonly code: Extract<ErrorCode, 'required'> | 'dept_duplicate' | 'dept_not_empty'
  constructor(code: DepartmentError['code']) {
    super(code)
    this.name = 'DepartmentError'
    this.code = code
  }
}

export interface ImportResult {
  added: Employee[]
}

export interface Backup {
  version: 1
  exportedAt: string
  departments: Department[]
  employees: Employee[]
}

/** The contract both adapters implement. */
export interface EmployeeApi {
  listEmployees(query: EmployeeQuery, locale?: 'en' | 'fa'): Promise<Page<Employee>>
  /** Every employee, unpaged (dashboard, export, validation). */
  allEmployees(): Promise<Employee[]>
  getEmployee(id: string): Promise<Employee>
  createEmployee(input: EmployeeInput): Promise<Employee>
  updateEmployee(id: string, input: EmployeeInput): Promise<Employee>
  /** Removes and returns the record so the caller can offer undo. */
  deleteEmployee(id: string): Promise<Employee>
  /** Puts back a record removed by deleteEmployee (undo). */
  restoreEmployee(employee: Employee): Promise<Employee>
  importEmployees(rows: EmployeeInput[], source: string, newDepartments?: string[]): Promise<ImportResult>

  listDepartments(): Promise<Department[]>
  createDepartment(name: string, nameFa?: string): Promise<Department>
  renameDepartment(id: string, name: string, nameFa?: string): Promise<Department>
  deleteDepartment(id: string): Promise<void>

  listActivity(limit?: number): Promise<Activity[]>
  exportBackup(): Promise<Backup>
  /** Restore sample data (mock mode only; live adapter rejects). */
  resetData(): Promise<void>
}
