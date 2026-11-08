import { useLoad } from '../app'
import { ErrorBox, Loading, Page } from '../components/ui'
import { weekPattern } from '../domain/shifts'
import { useLocale } from '../i18n'

export function Schedule() {
  const { t, personName, deptName } = useLocale()
  const state = useLoad(async (api) => {
    const [employees, departments] = await Promise.all([api.allEmployees(), api.listDepartments()])
    return { employees, departments }
  }, [])
  if (state.error) return <ErrorBox onRetry={state.reload} />
  if (!state.data) return <Loading />
  const { employees, departments } = state.data
  const groups = (['A', 'B', 'C'] as const).map((g) => ({ g, people: employees.filter((e) => e.status === 'active' && e.shiftGroup === g) })).filter((x) => x.people.length > 0)
  return (
    <Page title={t('sched.title')} actions={<button type="button" className="btn btn-primary" onClick={() => window.print()}>{t('sched.print')}</button>}>
      {groups.length === 0 && <p className="muted">{t('sched.none')}</p>}
      {groups.map(({ g, people }) => (
        <section key={g} className="card flush schedule-group" aria-labelledby={`sg-${g}`}>
          <h2 id={`sg-${g}`} className="pad">{t(`shift.${g}`)}</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">{t('emp.col.employee')}</th>
                  <th scope="col">{t('emp.col.dept')}</th>
                  {[0, 1, 2, 3, 4, 5, 6].map((i) => <th key={i} scope="col">{t(`day.${i as 0}`)}</th>)}
                </tr>
              </thead>
              <tbody>
                {people.map((p) => (
                  <tr key={p.id}>
                    <td>{personName(p)}</td>
                    <td>{deptName(departments.find((d) => d.id === p.departmentId))}</td>
                    {weekPattern(p.shiftGroup).map((c, i) => <td key={i}><span className={`shift-chip shift-${c}`}>{t(`shift.${c}`)}</span></td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      <p className="muted small">{t('shift.legend')}</p>
    </Page>
  )
}
