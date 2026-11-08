/// <reference types="vite/client" />
declare const __DEMO__: boolean
interface ImportMetaEnv {
  readonly VITE_API_MODE?: 'mock' | 'live'
  readonly VITE_API_BASE_URL?: string
}
