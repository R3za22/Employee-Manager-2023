import { normalizeDigits } from '../domain/digits'
import { queryEmployees } from '../domain/query'
import type { Activity, Department, Employee, EmployeeInput, HistoryEntry } from '../domain/types'
import { normalizePersonnelNo, todayIso, validateEmployee } from '../domain/validators'
import { buildSeedActivity, buildSeedEmployees, SEED_DEPARTMENTS } from './seed'
import { DepartmentError, NotFoundError, ValidationError, type Backup, type EmployeeApi } from './types'

export const STORAGE_KEY = 'employee-manager:v1'

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface MockOptions {
  storage?: StorageLike
  now?: () => Date
  /** Simulated network latency in ms (0 in tests). */
  latencyMs?: number
  /** Return an Error to make an operation fail (error injection). */
  inject?: (op: string) => Error | null
}

interface State {
  employees: Employee[]
  departments: Department[]
  activity: Activity[]
}

function memoryStorage(): StorageLike {
  const m = new Map<string, string>()
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  }
}

const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`

function isState(v: unknown): v is State {
  const s = v as State
  return (
    !!s &&
    Array.isArray(s.employees) &&
    Array.isArray(s.departments) &&
    Array.isArray(s.activity) &&
    s.employees.every((e) => e && typeof e.id === 'string' && typeof e.personnelNo === 'string' && Array.isArray(e.history))
  )
}

function clean(input: EmployeeInput): EmployeeInput {
  return {
    ...input,
    givenName: input.givenName.trim(),
    surname: input.surname.trim(),
    givenNameFa: input.givenNameFa.trim(),
    surnameFa: input.surnameFa.trim(),
    jobTitle: input.jobTitle.trim(),
    jobTitleFa: input.jobTitleFa.trim(),
    nationalId: normalizeDigits(input.nationalId.trim()),
    personnelNo: normalizePersonnelNo(input.personnelNo),
  }
}

export function createMockApi(options: MockOptions = {}): EmployeeApi & { storageBlocked: boolean } {
  const now = options.now ?? (() => new Date())
  const latency = options.latencyMs ?? 0
  let storage: StorageLike = options.storage ?? memoryStorage()
  let storageBlocked = false

  function load(): State {
    try {
      const raw = storage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed: unknown = JSON.parse(raw)
        if (isState(parsed)) return parsed
      }
    } catch {
      /* corrupted JSON or blocked storage: fall through to the seed */
    }
    return seed()
  }

  function seed(): State {
    return {
      employees: buildSeedEmployees(),
      departments: SEED_DEPARTMENTS.map((d) => ({ ...d })),
      activity: buildSeedActivity(now()),
    }
  }

  let state = load()

  function persist() {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Storage is full or blocked: keep working from memory and tell the UI.
      storageBlocked = true
      storage = memoryStorage()
    }
  }

  async function run<T>(op: string, fn: () => T): Promise<T> {
    if (latency > 0) await new Promise((r) => setTimeout(r, latency))
    const err = options.inject?.(op)
    if (err) throw err
    return structuredClone(fn())
  }

  function log(kind: Activity['kind'], subject: string, subjectFa = subject, source?: string) {
    state.activity.unshift({ id: uid('act'), at: now().toISOString(), kind, subject, subjectFa, source })
    state.activity = state.activity.slice(0, 50)
  }

  const fullName = (e: Pick<Employee, 'givenName' | 'surname'>) => `${e.givenName} ${e.surname}`
  const fullNameFa = (e: Employee) =>
    e.givenNameFa || e.surnameFa ? `${e.givenNameFa} ${e.surnameFa}`.trim() : fullName(e)

  function check(input: EmployeeInput, selfId?: string) {
    const errors = validateEmployee(input, {
      employees: state.employees,
      departments: state.departments,
      selfId,
      today: todayIso(now()),
    })
    if (Object.keys(errors).length > 0) throw new ValidationError(errors)
  }

  function diffHistory(prev: Employee, next: EmployeeInput): HistoryEntry[] {
    const at = todayIso(now())
    const out: HistoryEntry[] = []
    if (prev.status !== next.status) out.push({ at, kind: 'status', from: prev.status, to: next.status })
    if (prev.departmentId !== next.departmentId) out.push({ at, kind: 'department', from: prev.departmentId, to: next.departmentId })
    if (prev.shiftGroup !== next.shiftGroup) out.push({ at, kind: 'shift', from: prev.shiftGroup, to: next.shiftGroup })
    if (prev.jobTitle !== next.jobTitle) out.push({ at, kind: 'title', from: prev.jobTitle, to: next.jobTitle })
    return out
  }

  const api: EmployeeApi & { storageBlocked: boolean } = {
    get storageBlocked() {
      return storageBlocked
    },

    listEmployees: (query, locale = 'en') =>
      run('listEmployees', () => queryEmployees(state.employees, state.departments, query, locale)),
    allEmployees: () => run('allEmployees', () => state.employees),
    getEmployee: (id) =>
      run('getEmployee', () => {
        const e = state.employees.find((x) => x.id === id)
        if (!e) throw new NotFoundError('Employee')
        return e
      }),

    createEmployee: (raw) =>
      run('createEmployee', () => {
        const input = clean(raw)
        check(input)
        const e: Employee = {
          ...input,
          id: uid('emp'),
          history: [{ at: input.startDate ?? todayIso(now()), kind: 'created' }],
        }
        state.employees.push(e)
        log('created', fullName(e), fullNameFa(e))
        persist()
        return e
      }),

    updateEmployee: (id, raw) =>
      run('updateEmployee', () => {
        const prev = state.employees.find((x) => x.id === id)
        if (!prev) throw new NotFoundError('Employee')
        const input = clean(raw)
        check(input, id)
        const next: Employee = { ...prev, ...input, history: [...diffHistory(prev, input), ...prev.history] }
        state.employees = state.employees.map((x) => (x.id === id ? next : x))
        log('updated', fullName(next), fullNameFa(next))
        persist()
        return next
      }),

    deleteEmployee: (id) =>
      run('deleteEmployee', () => {
        const e = state.employees.find((x) => x.id === id)
        if (!e) throw new NotFoundError('Employee')
        state.employees = state.employees.filter((x) => x.id !== id)
        state.departments = state.departments.map((d) => (d.headId === id ? { ...d, headId: null } : d))
        log('deleted', fullName(e), fullNameFa(e))
        persist()
        return e
      }),

    restoreEmployee: (e) =>
      run('restoreEmployee', () => {
        if (!state.employees.some((x) => x.id === e.id)) state.employees.push(e)
        log('restored', fullName(e), fullNameFa(e))
        persist()
        return e
      }),

    importEmployees: (rows, source, newDepartments = []) =>
      run('importEmployees', () => {
        const added: Employee[] = []
        const snapshot = structuredClone(state)
        try {
          for (const name of newDepartments) {
            if (!state.departments.some((d) => d.name.toLowerCase() === name.toLowerCase()))
              state.departments.push({ id: uid('dep'), name, nameFa: name, headId: null })
          }
          for (const raw of rows) {
            const input = clean(raw)
            check(input)
            const e: Employee = { ...input, id: uid('emp'), history: [{ at: input.startDate ?? todayIso(now()), kind: 'created' }] }
            state.employees.push(e)
            added.push(e)
          }
        } catch (err) {
          state = snapshot // all or nothing
          throw err
        }
        log('imported', String(added.length), String(added.length), source)
        persist()
        return { added }
      }),

    listDepartments: () => run('listDepartments', () => state.departments),
    createDepartment: (name, nameFa) =>
      run('createDepartment', () => {
        const n = name.trim()
        if (!n) throw new DepartmentError('required')
        if (state.departments.some((d) => d.name.toLowerCase() === n.toLowerCase())) throw new DepartmentError('dept_duplicate')
        const d: Department = { id: uid('dep'), name: n, nameFa: nameFa?.trim() || n, headId: null }
        state.departments.push(d)
        log('dept_added', d.name, d.nameFa)
        persist()
        return d
      }),
    renameDepartment: (id, name, nameFa) =>
      run('renameDepartment', () => {
        const d = state.departments.find((x) => x.id === id)
        if (!d) throw new NotFoundError('Department')
        const n = name.trim()
        if (!n) throw new DepartmentError('required')
        if (state.departments.some((x) => x.id !== id && x.name.toLowerCase() === n.toLowerCase())) throw new DepartmentError('dept_duplicate')
        d.name = n
        d.nameFa = nameFa?.trim() || n
        log('dept_renamed', d.name, d.nameFa)
        persist()
        return d
      }),
    deleteDepartment: (id) =>
      run('deleteDepartment', () => {
        const d = state.departments.find((x) => x.id === id)
        if (!d) throw new NotFoundError('Department')
        if (state.employees.some((e) => e.departmentId === id)) throw new DepartmentError('dept_not_empty')
        state.departments = state.departments.filter((x) => x.id !== id)
        log('dept_removed', d.name, d.nameFa)
        persist()
      }),

    listActivity: (limit = 5) => run('listActivity', () => state.activity.slice(0, limit)),

    exportBackup: () =>
      run('exportBackup', (): Backup => ({
        version: 1,
        exportedAt: now().toISOString(),
        departments: state.departments,
        employees: state.employees,
      })),

    resetData: () =>
      run('resetData', () => {
        state = seed()
        persist()
      }),
  }
  return api
}
