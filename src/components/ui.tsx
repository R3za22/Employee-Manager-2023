import { useEffect, useRef, type ReactNode } from 'react'
import { useLocale } from '../i18n'
import type { Status } from '../domain/types'

export function Icon({ d, size = 20 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}

export const ICONS = {
  dashboard: 'M4 4h7v7H4zM13 4h7v4h-7zM13 11h7v9h-7zM4 14h7v6H4z',
  people: 'M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM2.5 20c0-3.5 2.9-6 6.5-6s6.5 2.5 6.5 6M16 4.5a3.5 3.5 0 010 6.5M18 14.3c2 .6 3.5 2.3 3.5 5.7',
  dept: 'M3 21V8l9-5 9 5v13M9 21v-6h6v6',
  data: 'M12 4v11M7 10l5 5 5-5M4 20h16',
  search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-4-4',
  addPerson: 'M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM2.5 20c0-3.5 2.9-6 6.5-6s6.5 2.5 6.5 6M19 8v6M16 11h6',
}

export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" aria-hidden="true">
      <rect x="2" y="2" width="68" height="68" rx="10" fill="#1F5C4D" />
      <path d="M18 22h36M18 33h36M18 44h22" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
      <circle cx="50" cy="48" r="6" fill="#FBEBCB" />
    </svg>
  )
}

const TINTS = ['tint-0', 'tint-1', 'tint-2']
export function Avatar({ text, index = 0, size = 'md' }: { text: string; index?: number; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  return (
    <span className={`avatar avatar-${size} ${TINTS[index % 3]}`} aria-hidden="true">
      {text}
    </span>
  )
}

export function StatusBadge({ status }: { status: Status }) {
  const { t } = useLocale()
  return <span className={`badge badge-${status}`}>{t(`status.${status}`)}</span>
}

export function Page({ title, sub, actions, children }: { title: string; sub?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <>
      <header className="page-head">
        <div>
          <h1>{title}</h1>
          {sub && <span className="muted">{sub}</span>}
        </div>
        {actions && <div className="page-actions">{actions}</div>}
      </header>
      {children}
    </>
  )
}

export function Loading() {
  const { t } = useLocale()
  return (
    <p className="muted" role="status">
      {t('common.loading')}
    </p>
  )
}

export function ErrorBox({ onRetry }: { onRetry: () => void }) {
  const { t } = useLocale()
  return (
    <div className="card state" role="alert">
      <p>{t('common.error')}</p>
      <button type="button" className="btn btn-secondary" onClick={onRetry}>
        {t('common.retry')}
      </button>
    </div>
  )
}

export function Pagination({ page, pageCount, onPage }: { page: number; pageCount: number; onPage: (p: number) => void }) {
  const { t, num } = useLocale()
  const pages: (number | 'gap')[] = []
  for (let p = 1; p <= pageCount; p += 1) {
    if (pageCount <= 7 || p === 1 || p === pageCount || Math.abs(p - page) <= 1) pages.push(p)
    else if (pages[pages.length - 1] !== 'gap') pages.push('gap')
  }
  return (
    <nav className="pager" aria-label={t('emp.col.actions')}>
      <button type="button" className="pg" aria-label={t('emp.prev')} disabled={page <= 1} onClick={() => onPage(page - 1)}>
        <span aria-hidden="true" className="flip">&lsaquo;</span>
      </button>
      {pages.map((p, i) =>
        p === 'gap' ? (
          <span key={`g${i}`} className="muted" aria-hidden="true">…</span>
        ) : (
          <button key={p} type="button" className="pg" aria-label={t('emp.page', { n: num(p) })} aria-current={p === page ? 'page' : undefined} onClick={() => onPage(p)}>
            {num(p)}
          </button>
        ),
      )}
      <button type="button" className="pg" aria-label={t('emp.next')} disabled={page >= pageCount} onClick={() => onPage(page + 1)}>
        <span aria-hidden="true" className="flip">&rsaquo;</span>
      </button>
    </nav>
  )
}

export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string
  label: string
  hint?: string
  error?: string
  children: (props: { id: string; 'aria-invalid': boolean; 'aria-describedby': string }) => ReactNode
}) {
  const describedBy = `${id}-msg`
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children({ id, 'aria-invalid': !!error, 'aria-describedby': describedBy })}
      <span id={describedBy} className={error ? 'field-msg field-error' : 'field-msg'}>
        {error ?? hint ?? ''}
      </span>
    </div>
  )
}

export function Dialog({ open, onClose, labelledBy, children, alert }: { open: boolean; onClose: () => void; labelledBy: string; children: ReactNode; alert?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog ref={ref} className="dialog" aria-labelledby={labelledBy} role={alert ? 'alertdialog' : 'dialog'} onClose={onClose} onCancel={onClose}>
      {open && children}
    </dialog>
  )
}
