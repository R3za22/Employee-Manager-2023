import { describe, expect, it } from 'vitest'
import { DEFAULT_QUERY } from '../domain/query'
import type { EmployeeInput } from '../domain/types'
import { createLiveApi } from './liveAdapter'
import { createMockApi, STORAGE_KEY, type StorageLike } from './mockAdapter'
import { DepartmentError, NotFoundError, ValidationError } from './types'

const NOW = new Date('2026-11-08T09:00:00Z')
const mem = (): StorageLike & { data: Map<string, string> } => {
  const data = new Map<string, string>()
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) }
}
const make = (storage: StorageLike = mem()) => createMockApi({ storage, now: () => NOW })

const input: EmployeeInput = {
  givenName: 'Ava',
  surname: 'Nouri',
  givenNameFa: '',
  surnameFa: '',
  nationalId: '0499370899',
  personnelNo: 'P-2001',
  jobTitle: 'Analyst',
  jobTitleFa: '',
  departmentId: 'dep-sales',
  status: 'active',
  shiftGroup: 'none',
  startDate: '2024-01-01',
}

describe('mock adapter', () => {
  it('ships seeded fictional data: 24 employees in 5 departments', async () => {
    const api = make()
    expect((await api.allEmployees()).length).toBe(24)
    expect((await api.listDepartments()).length).toBe(5)
    const page = await api.listEmployees({ ...DEFAULT_QUERY, pageSize: 8 })
    expect(page).toMatchObject({ total: 24, pageCount: 3 })
  })

  it('creates, reads, updates with history, and persists across instances', async () => {
    const storage = mem()
    const a = make(storage)
    const created = await a.createEmployee({ ...input, nationalId: '۰۴۹۹۳۷۰۸۹۹', personnelNo: ' p-2001 ' })
    expect(created.personnelNo).toBe('P-2001')
    expect(created.nationalId).toBe('0499370899')
    const updated = await a.updateEmployee(created.id, { ...input, status: 'leave', shiftGroup: 'B' })
    expect(updated.history.map((h) => h.kind)).toEqual(expect.arrayContaining(['status', 'shift', 'created']))

    const b = make(storage) // a fresh instance reads the same storage
    expect((await b.getEmployee(created.id)).status).toBe('leave')
    expect((await b.allEmployees()).length).toBe(25)
  })

  it('rejects invalid input with field errors and stores nothing', async () => {
    const api = make()
    await expect(api.createEmployee({ ...input, nationalId: '0012345678' })).rejects.toBeInstanceOf(ValidationError)
    await expect(api.createEmployee({ ...input, personnelNo: 'P-1001' })).rejects.toMatchObject({ errors: { personnelNo: 'pn_duplicate' } })
    expect((await api.allEmployees()).length).toBe(24)
  })

  it('deletes and restores (undo), clearing a deleted department head', async () => {
    const api = make()
    const removed = await api.deleteEmployee('emp-1001')
    expect((await api.allEmployees()).length).toBe(23)
    expect((await api.listDepartments()).find((d) => d.id === 'dep-prod')?.headId).toBeNull()
    await api.restoreEmployee(removed)
    expect((await api.getEmployee('emp-1001')).surname).toBe('Karimi')
    await expect(api.getEmployee('nope')).rejects.toBeInstanceOf(NotFoundError)
    await expect(api.deleteEmployee('nope')).rejects.toBeInstanceOf(NotFoundError)
  })

  it('imports all-or-nothing and can add departments', async () => {
    const api = make()
    const ok = await api.importEmployees([input], 'a.csv', ['Legal'])
    expect(ok.added).toHaveLength(1)
    expect((await api.listDepartments()).some((d) => d.name === 'Legal')).toBe(true)
    await expect(api.importEmployees([{ ...input, personnelNo: 'P-2002', nationalId: '0084575948' }, { ...input, personnelNo: 'P-2002', nationalId: '0084575948' }], 'b.csv')).rejects.toBeInstanceOf(ValidationError)
    expect((await api.allEmployees()).length).toBe(25) // second batch rolled back
    expect((await api.listActivity(1))[0]).toMatchObject({ kind: 'imported', source: 'a.csv' })
  })

  it('manages departments', async () => {
    const api = make()
    const d = await api.createDepartment('Legal', 'حقوقی')
    await expect(api.createDepartment('legal')).rejects.toMatchObject({ code: 'dept_duplicate' })
    await expect(api.createDepartment('  ')).rejects.toBeInstanceOf(DepartmentError)
    expect((await api.renameDepartment(d.id, 'Law')).name).toBe('Law')
    await expect(api.deleteDepartment('dep-prod')).rejects.toMatchObject({ code: 'dept_not_empty' })
    await api.deleteDepartment(d.id)
    expect((await api.listDepartments()).length).toBe(5)
  })

  it('records activity newest first', async () => {
    const api = make()
    await api.createEmployee(input)
    const act = await api.listActivity(2)
    expect(act[0]).toMatchObject({ kind: 'created', subject: 'Ava Nouri' })
    expect(act).toHaveLength(2)
  })

  it('falls back to seed data when storage is corrupted or malformed', async () => {
    for (const bad of ['{not json', '{"employees":"x"}', 'null']) {
      const storage = mem()
      storage.setItem(STORAGE_KEY, bad)
      expect((await make(storage).allEmployees()).length).toBe(24)
    }
  })

  it('keeps working in memory when storage writes throw', async () => {
    const storage: StorageLike = { getItem: () => null, setItem: () => { throw new Error('quota') }, removeItem: () => {} }
    const api = make(storage)
    await api.createEmployee(input)
    expect((await api.allEmployees()).length).toBe(25)
    expect(api.storageBlocked).toBe(true)
  })

  it('resets to seed data', async () => {
    const api = make()
    await api.deleteEmployee('emp-1001')
    await api.resetData()
    expect((await api.allEmployees()).length).toBe(24)
  })

  it('injects errors', async () => {
    const api = createMockApi({ storage: mem(), inject: (op) => (op === 'allEmployees' ? new Error('boom') : null) })
    await expect(api.allEmployees()).rejects.toThrow('boom')
    await expect(api.listDepartments()).resolves.toHaveLength(5)
  })

  it('seed contains exactly one deliberately invalid national ID and one missing start date', async () => {
    const all = await make().allEmployees()
    const { isValidNationalId } = await import('../domain/validators')
    expect(all.filter((e) => !isValidNationalId(e.nationalId)).map((e) => e.surname)).toEqual(['Naderi'])
    expect(all.filter((e) => !e.startDate).map((e) => e.surname)).toEqual(['Hosseini'])
  })
})

describe('live adapter', () => {
  it('builds REST requests against the configured base URL', async () => {
    const calls: { url: string; method?: string; body?: unknown; auth?: string }[] = []
    const fetchImpl = (async (url: string, init?: RequestInit) => {
      calls.push({ url, method: init?.method, body: init?.body, auth: (init?.headers as Record<string, string>)?.Authorization })
      return new Response(JSON.stringify({ items: [], total: 0, page: 1, pageSize: 8, pageCount: 1 }), { status: 200 })
    }) as unknown as typeof fetch
    const api = createLiveApi({ baseUrl: 'https://api.example.test/v1/', fetchImpl, getToken: () => 'tok' })
    await api.listEmployees({ ...DEFAULT_QUERY, search: 'a b', status: 'leave' }, 'fa')
    expect(calls[0].url).toBe('https://api.example.test/v1/employees?page=1&pageSize=8&sort=surname_asc&locale=fa&search=a+b&status=leave')
    expect(calls[0].auth).toBe('Bearer tok')
    await api.createEmployee(input)
    expect(calls[1]).toMatchObject({ method: 'POST', url: 'https://api.example.test/v1/employees' })
    await expect(api.resetData()).rejects.toThrow()
  })

  it('throws on HTTP errors', async () => {
    const fetchImpl = (async () => new Response('', { status: 500 })) as unknown as typeof fetch
    await expect(createLiveApi({ baseUrl: 'http://x', fetchImpl }).listDepartments()).rejects.toThrow('500')
  })
})
