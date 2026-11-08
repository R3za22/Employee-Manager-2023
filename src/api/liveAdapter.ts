import type { Activity, Department, Employee, EmployeeInput, EmployeeQuery, Page } from '../domain/types'
import type { Backup, EmployeeApi, ImportResult } from './types'

export interface LiveOptions {
  /** REST base URL, e.g. https://api.example.com/v1 */
  baseUrl: string
  fetchImpl?: typeof fetch
  /** Optional bearer token supplier. Never hard-code tokens. */
  getToken?: () => string | null
}

/**
 * Live adapter stub. It maps the EmployeeApi contract onto a conventional REST API:
 *   GET/POST /employees, GET/PUT/DELETE /employees/:id, POST /employees/import,
 *   GET/POST /departments, PUT/DELETE /departments/:id, GET /activity, GET /backup.
 * No server ships with this repo; point VITE_API_BASE_URL at one that implements these routes.
 */
export function createLiveApi(opts: LiveOptions): EmployeeApi {
  const base = opts.baseUrl.replace(/\/+$/, '')
  const doFetch = opts.fetchImpl ?? ((...a: Parameters<typeof fetch>) => fetch(...a))

  async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    const token = opts.getToken?.()
    if (token) headers.Authorization = `Bearer ${token}`
    const res = await doFetch(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
    if (!res.ok) throw new Error(`${method} ${path} failed with ${res.status}`)
    return res.status === 204 ? (undefined as T) : ((await res.json()) as T)
  }

  const qs = (q: EmployeeQuery, locale: string) => {
    const p = new URLSearchParams({ page: String(q.page), pageSize: String(q.pageSize), sort: q.sort, locale })
    if (q.search) p.set('search', q.search)
    if (q.departmentId) p.set('departmentId', q.departmentId)
    if (q.status) p.set('status', q.status)
    return p.toString()
  }

  return {
    listEmployees: (q, locale = 'en') => call<Page<Employee>>('GET', `/employees?${qs(q, locale)}`),
    allEmployees: () => call<Employee[]>('GET', '/employees?all=1'),
    getEmployee: (id) => call<Employee>('GET', `/employees/${encodeURIComponent(id)}`),
    createEmployee: (input: EmployeeInput) => call<Employee>('POST', '/employees', input),
    updateEmployee: (id, input) => call<Employee>('PUT', `/employees/${encodeURIComponent(id)}`, input),
    deleteEmployee: async (id) => {
      const e = await call<Employee>('GET', `/employees/${encodeURIComponent(id)}`)
      await call<void>('DELETE', `/employees/${encodeURIComponent(id)}`)
      return e
    },
    restoreEmployee: (e) => call<Employee>('POST', '/employees', e),
    importEmployees: (rows, source, newDepartments = []) =>
      call<ImportResult>('POST', '/employees/import', { rows, source, newDepartments }),
    listDepartments: () => call<Department[]>('GET', '/departments'),
    createDepartment: (name, nameFa) => call<Department>('POST', '/departments', { name, nameFa }),
    renameDepartment: (id, name, nameFa) => call<Department>('PUT', `/departments/${encodeURIComponent(id)}`, { name, nameFa }),
    deleteDepartment: (id) => call<void>('DELETE', `/departments/${encodeURIComponent(id)}`),
    listActivity: (limit = 5) => call<Activity[]>('GET', `/activity?limit=${limit}`),
    exportBackup: () => call<Backup>('GET', '/backup'),
    resetData: () => Promise.reject(new Error('Reset is only available in mock mode')),
  }
}
