import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createApi, type EmployeeApi } from './api'
import { useLocale } from './i18n'

interface DataCtx {
  api: EmployeeApi & { storageBlocked?: boolean }
  /** Bumps after every mutation so views refetch. */
  version: number
  bump: () => void
}
const Data = createContext<DataCtx | null>(null)

export function DataProvider({ children, api: provided }: { children: ReactNode; api?: DataCtx['api'] }) {
  const [api] = useState(() => provided ?? createApi())
  const [version, setVersion] = useState(0)
  const bump = useCallback(() => setVersion((v) => v + 1), [])
  const value = useMemo(() => ({ api, version, bump }), [api, version, bump])
  return <Data.Provider value={value}>{children}</Data.Provider>
}

export function useData(): DataCtx {
  const v = useContext(Data)
  if (!v) throw new Error('useData outside DataProvider')
  return v
}

export interface AsyncState<T> {
  data: T | null
  error: Error | null
  loading: boolean
  reload: () => void
}

/** Load data through the API; refetches after mutations; ignores stale responses. */
export function useLoad<T>(fn: (api: EmployeeApi) => Promise<T>, deps: unknown[]): AsyncState<T> {
  const { api, version } = useData()
  const [state, setState] = useState<{ data: T | null; error: Error | null; loading: boolean }>({ data: null, error: null, loading: true })
  const [tick, setTick] = useState(0)
  const seq = useRef(0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps)
  useEffect(() => {
    const id = ++seq.current
    setState((s) => ({ ...s, loading: s.data === null, error: null }))
    run(api).then(
      (data) => id === seq.current && setState({ data, error: null, loading: false }),
      (error: Error) => id === seq.current && setState({ data: null, error, loading: false }),
    )
  }, [api, run, version, tick])
  return { ...state, reload: () => setTick((n) => n + 1) }
}

interface ToastItem {
  id: number
  message: string
  actionLabel?: string
  onAction?: () => void
}
interface ToastCtx {
  show: (message: string, action?: { label: string; run: () => void }, ms?: number) => void
}
const ToastC = createContext<ToastCtx | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const { t } = useLocale()
  const show = useCallback<ToastCtx['show']>((message, action, ms = 8000) => {
    window.clearTimeout(timer.current)
    setToast({ id: Date.now(), message, actionLabel: action?.label, onAction: action?.run })
    timer.current = window.setTimeout(() => setToast(null), ms)
  }, [])
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const value = useMemo(() => ({ show }), [show])
  return (
    <ToastC.Provider value={value}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {toast && (
          <div className="toast" key={toast.id}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12l5 5 9-10" />
            </svg>
            <span className="toast-msg">{toast.message}</span>
            {toast.onAction && (
              <button
                type="button"
                className="toast-action"
                onClick={() => {
                  toast.onAction?.()
                  setToast(null)
                }}
              >
                {toast.actionLabel ?? t('common.undo')}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastC.Provider>
  )
}

export function useToast(): ToastCtx {
  const v = useContext(ToastC)
  if (!v) throw new Error('useToast outside ToastProvider')
  return v
}
