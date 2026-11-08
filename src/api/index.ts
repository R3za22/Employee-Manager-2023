import { createLiveApi } from './liveAdapter'
import { createMockApi } from './mockAdapter'
import type { EmployeeApi } from './types'

export type { EmployeeApi } from './types'
export * from './types'

export type ApiMode = 'mock' | 'live'

export function createApi(): EmployeeApi & { storageBlocked?: boolean } {
  const env = import.meta.env
  const mode: ApiMode = env.VITE_API_MODE === 'live' ? 'live' : 'mock'
  if (mode === 'live') {
    const baseUrl = env.VITE_API_BASE_URL
    if (!baseUrl) throw new Error('VITE_API_BASE_URL is required when VITE_API_MODE=live')
    return createLiveApi({ baseUrl })
  }
  let storage: Storage | undefined
  try {
    storage = window.localStorage
    storage.getItem('probe')
  } catch {
    storage = undefined
  }
  return createMockApi({ storage, latencyMs: 60 })
}
