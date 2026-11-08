import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLoad } from '../app'
import { DeleteDialog } from '../components/DeleteDialog'
import { Avatar, ErrorBox, Loading, StatusBadge } from '../components/ui'
import { persianWeekday } from '../domain/jalali'
import { weekPattern } from '../domain/shifts'
import { NotFoundError } from '../api/types'
import { isValidNationalId, todayIso } from '../domain/validators'
import { useLocale } from '../i18n'
import { NotFound } from './NotFound'

export function Profile() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { t, num, personName, jobTitle, deptName, initials, date } = useLocale()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const state = useLoad(async (api) => {
    const [employee, departments] = await Promise.all([api.getEmployee(id), api.listDepartments()])
    return { employee, departments }
  }, [id])

  if (state.error) return state.error instanceof NotFoundError ? <NotFound /> : <ErrorBox onRetry={state.reload} />
  if (!state.data) return <Loading />
  const { employee: e, departments } = state.data
  const dept = departments.find((d) => d.id === e.departmentId)
  const nidOk = isValidNationalId(e.nationalId)
  const week = weekPattern(e.shiftGroup)
  const today = persianWeekday(todayIso())
  const details = [
    [t('profile.no'), <bdi key="n">{num(e.personnelNo)}</bdi>],
    [t('profile.nid'), <span key="i"><bdi className="nums">{num(e.nationalId)}</bdi> {!nidOk && <span className="badge badge-bad">{t('profile.invalidId')}</span>}</span>],
    [t('profile.dept'), deptName(dept)],
    [t('profile.title'), jobTitle(e)],
    [t('profile.start'), <span key="s" className="nums">{date(e.startDate)}</span>],
  ] as const
  const histText = (h: (typeof e.history)[number]) => {
    const label = (v?: string) => (v === 'active' || v === 'leave' || v === 'inactive' ? t(`status.${v}`) : v === 'A' || v === 'B' || v === 'C' || v === 'none' ? t(`shift.${v}`) : (v ?? ''))
    const to = h.kind === 'department' ? deptName(departments.find((d) => d.id === h.to)) : h.kind === 'title' && h.to === e.jobTitle ? jobTitle(e) : label(h.to)
    return t(`hist.${h.kind}`, { from: label(h.from), to })
  }

  return (
    <>
      <p className="crumb">
        <Link to="/employees">{t('common.back')}</Link>
      </p>
      <header className="page-head profile-head">
        <div className="person">
          <Avatar text={initials(e)} size="xl" />
          <div>
            <h1>{personName(e)}</h1>
            <span className="muted">{jobTitle(e)} · {deptName(dept)}</span>
          </div>
          <StatusBadge status={e.status} />
        </div>
        <div className="page-actions">
          <Link to={`/employees/${e.id}/edit`} className="btn btn-secondary">{t('common.edit')}</Link>
          <button type="button" className="btn btn-danger" onClick={() => setConfirmDelete(true)}>{t('common.delete')}</button>
        </div>
      </header>

      <div className="grid-2">
        <section className="card" aria-labelledby="p-details">
          <h2 id="p-details">{t('profile.details')}</h2>
          <dl className="dl">
            {details.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </section>
        <div className="stack">
          <section className="card" aria-labelledby="p-shift">
            <div className="card-head">
              <h2 id="p-shift">{t('profile.shift')}</h2>
              <span className="muted small">{t(`shift.${e.shiftGroup}`)}</span>
            </div>
            <ol className="week">
              {week.map((code, i) => (
                <li key={i} className={`shift shift-${code}${i === today ? ' today' : ''}`} aria-current={i === today ? 'date' : undefined}>
                  <span className="small">{t(`day.${i as 0}`)}</span>
                  <strong>{t(`shift.${code}`)}</strong>
                </li>
              ))}
            </ol>
            <p className="muted small">{t('shift.legend')}</p>
          </section>
          <section className="card" aria-labelledby="p-hist">
            <h2 id="p-hist">{t('profile.history')}</h2>
            <ul className="rows">
              {e.history.map((h, i) => (
                <li key={i}>
                  <span className="grow">{histText(h)}</span>
                  <span className="muted small nums">{date(h.at)}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
      <DeleteDialog employee={confirmDelete ? e : null} departments={departments} onClose={() => setConfirmDelete(false)} onDeleted={() => navigate('/employees')} />
    </>
  )
}
