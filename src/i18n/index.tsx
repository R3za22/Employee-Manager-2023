import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { toFaDigits } from '../domain/digits'
import { isoToJalali } from '../domain/jalali'
import type { Department, Employee } from '../domain/types'
import { en, type Dict } from './en'
import { fa } from './fa'

export type Locale = 'en' | 'fa'
const KEY = 'employee-manager:locale'

function initialLocale(): Locale {
  try {
    const q = new URLSearchParams(window.location.search).get('lang')
    if (q === 'fa' || q === 'en') return q
    const saved = window.localStorage.getItem(KEY)
    if (saved === 'fa' || saved === 'en') return saved
  } catch {
    /* storage blocked */
  }
  return 'en'
}

export type TFn = (key: keyof Dict, params?: Record<string, string | number>) => string

export interface LocaleApi {
  locale: Locale
  dir: 'ltr' | 'rtl'
  setLocale: (l: Locale) => void
  t: TFn
  /** Number, with Persian digits in FA. */
  num: (n: number | string) => string
  /** ISO date to display text: ISO in EN, Jalali with Persian digits in FA. */
  date: (iso: string | null) => string
  personName: (e: Pick<Employee, 'givenName' | 'surname' | 'givenNameFa' | 'surnameFa'>) => string
  surnameFirst: (e: Pick<Employee, 'surname' | 'surnameFa'>) => string
  jobTitle: (e: Pick<Employee, 'jobTitle' | 'jobTitleFa'>) => string
  deptName: (d: Department | undefined) => string
  initials: (e: Pick<Employee, 'givenName' | 'surname' | 'givenNameFa' | 'surnameFa'>) => string
}

const Ctx = createContext<LocaleApi | null>(null)

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale)
  const dir = locale === 'fa' ? 'rtl' : 'ltr'

  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = dir
    document.title = locale === 'fa' ? fa['app.name'] : en['app.name']
  }, [locale, dir])

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    try {
      window.localStorage.setItem(KEY, l)
    } catch {
      /* storage blocked */
    }
  }, [])

  const value = useMemo<LocaleApi>(() => {
    const dict: Dict = locale === 'fa' ? fa : en
    const isFa = locale === 'fa'
    const num = (n: number | string) => (isFa ? toFaDigits(n) : String(n))
    const t: TFn = (key, params) => {
      const raw = dict[key] ?? en[key] ?? String(key)
      const out = raw.replace(/\{(\w+)\}/g, (_, k: string) => (params && k in params ? String(params[k]) : `{${k}}`))
      return out
    }
    return {
      locale,
      dir,
      setLocale,
      t,
      num,
      date: (iso) => {
        if (!iso) return '—'
        if (!isFa) return iso
        const j = isoToJalali(iso)
        return j ? toFaDigits(j) : iso
      },
      personName: (e) => (isFa && (e.givenNameFa || e.surnameFa) ? `${e.givenNameFa} ${e.surnameFa}`.trim() : `${e.givenName} ${e.surname}`),
      surnameFirst: (e) => (isFa && e.surnameFa ? e.surnameFa : e.surname),
      jobTitle: (e) => (isFa && e.jobTitleFa ? e.jobTitleFa : e.jobTitle),
      deptName: (d) => (d ? (isFa ? d.nameFa || d.name : d.name) : '—'),
      initials: (e) => {
        const a = isFa && e.givenNameFa ? e.givenNameFa : e.givenName
        const b = isFa && e.surnameFa ? e.surnameFa : e.surname
        const sep = isFa ? '‌' : ''
        return `${[...a][0] ?? ''}${sep}${[...b][0] ?? ''}`.toUpperCase()
      },
    }
  }, [locale, dir, setLocale])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useLocale(): LocaleApi {
  const v = useContext(Ctx)
  if (!v) throw new Error('useLocale outside LocaleProvider')
  return v
}
