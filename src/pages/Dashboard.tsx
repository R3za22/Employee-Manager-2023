import { Link } from 'react-router-dom'
import { useLoad } from '../app'
import { Avatar, ErrorBox, Loading, Page } from '../components/ui'
import { persianWeekday } from '../domain/jalali'
import { SHIFT_HOURS, shiftOn } from '../domain/shifts'
import { isValidNationalId, todayIso } from '../domain/validators'
import { useLocale } from '../i18n'

export function Dashboard() {
  const { t, locale, num, personName, deptName, initials, date } = useLocale()
  const state = useLoad(async (api) => {
    const [employees, departments, activity] = await Promise.all([api.allEmployees(), api.listDepartments(), api.listActivity(4)])
    return { employees, departments, activity }
  }, [])
  if (state.error) return <ErrorBox onRetry={state.reload} />
  if (!state.data) return <Loading />
  const { employees, departments, activity } = state.data
  const today = todayIso()
  const weekday = persianWeekday(today)
  const count = (s: string) => employees.filter((e) => e.status === s).length
  const stats = [
    { label: t('dash.total'), value: employees.length, note: t('dash.total.note', { n: num(departments.length) }) },
    { label: t('status.active'), value: count('active'), note: t('dash.active.note') },
    { label: t('status.leave'), value: count('leave'), note: t('dash.leave.note') },
    { label: t('status.inactive'), value: count('inactive'), note: t('dash.inactive.note') },
  ]
  const perDept = departments
    .map((d) => ({ d, n: employees.filter((e) => e.departmentId === d.id).length }))
    .sort((a, b) => b.n - a.n)
  const max = Math.max(1, ...perDept.map((x) => x.n))
  const onShift = employees
    .filter((e) => e.status === 'active' && shiftOn(e.shiftGroup, weekday) !== 'Off')
    .slice(0, 5)
  const attention = employees.flatMap((e) => {
    const out: { e: typeof e; issue: string }[] = []
    if (!isValidNationalId(e.nationalId)) out.push({ e, issue: t('attn.nid') })
    if (!e.startDate) out.push({ e, issue: t('attn.start') })
    return out
  })
  const longDate = new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR-u-ca-persian' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())
  const when = (iso: string) => {
    const days = Math.floor((new Date(todayIso()).getTime() - new Date(iso.slice(0, 10)).getTime()) / 86_400_000)
    return days <= 0 ? t('act.today') : days === 1 ? t('act.yesterday') : date(iso.slice(0, 10))
  }

  return (
    <Page
      title={t('dash.title')}
      sub={longDate}
      actions={
        <>
          <Link to="/data" className="btn btn-secondary">{t('dash.export')}</Link>
          <Link to="/employees/new" className="btn btn-primary">{t('dash.add')}</Link>
        </>
      }
    >
      <section aria-label={t('dash.totals')} className="stats">
        {stats.map((s) => (
          <div key={s.label} className="card stat">
            <span className="label">{s.label}</span>
            <span className="stat-value">{num(s.value)}</span>
            <span className="muted small">{s.note}</span>
          </div>
        ))}
      </section>

      <div className="grid-2">
        <section className="card" aria-labelledby="h-head">
          <div className="card-head">
            <h2 id="h-head">{t('dash.headcount')}</h2>
            <Link to="/departments">{t('dash.viewDepts')}</Link>
          </div>
          <ul className="bars">
            {perDept.map(({ d, n }) => (
              <li key={d.id}>
                <span>{deptName(d)}</span>
                <span className="bar" aria-hidden="true"><span style={{ width: `${Math.round((n / max) * 100)}%` }} /></span>
                <span className="num">{num(n)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card" aria-labelledby="h-shift">
          <div className="card-head">
            <h2 id="h-shift">{t('dash.onShift')}</h2>
            <Link to="/schedule">{t('sched.title')}</Link>
          </div>
          {onShift.length === 0 ? (
            <p className="muted">{t('dash.onShift.none')}</p>
          ) : (
            <ul className="rows">
              {onShift.map((e, i) => {
                const code = shiftOn(e.shiftGroup, weekday) as 'M' | 'N'
                return (
                  <li key={e.id}>
                    <Avatar text={initials(e)} index={i} size="sm" />
                    <span className="grow">
                      <Link to={`/employees/${e.id}`} className="strong">{personName(e)}</Link>
                      <span className="muted small block">{deptName(departments.find((d) => d.id === e.departmentId))}</span>
                    </span>
                    <span className="muted small nums" dir="ltr">{num(SHIFT_HOURS[code])}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      <div className="grid-2">
        <section className="card" aria-labelledby="h-attn">
          <h2 id="h-attn">{t('dash.attention')}</h2>
          {attention.length === 0 ? (
            <p className="muted">{t('dash.attention.none')}</p>
          ) : (
            <ul className="rows">
              {attention.map(({ e, issue }) => (
                <li key={e.id + issue}>
                  <span className="grow">
                    <span className="strong">{personName(e)}</span>
                    <span className="muted small block">{issue}</span>
                  </span>
                  <Link to={`/employees/${e.id}/edit`} className="btn btn-secondary btn-sm" aria-label={`${t('dash.fix')}: ${personName(e)}`}>{t('dash.fix')}</Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card" aria-labelledby="h-recent">
          <h2 id="h-recent">{t('dash.recent')}</h2>
          {activity.length === 0 ? (
            <p className="muted">{t('dash.recent.none')}</p>
          ) : (
            <ul className="rows">
              {activity.map((a) => (
                <li key={a.id}>
                  <span className="grow">
                    <span className="strong">{t(`act.${a.kind}`, { name: locale === 'fa' ? num(a.subjectFa) : a.subject })}</span>
                    <span className="muted small block">{a.source ?? t('act.by')}</span>
                  </span>
                  <span className="muted small">{when(a.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Page>
  )
}
