import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useLoad } from '../app'
import { DeleteDialog } from '../components/DeleteDialog'
import { Avatar, ErrorBox, ICONS, Icon, Loading, Page, Pagination, StatusBadge } from '../components/ui'
import { DEFAULT_QUERY } from '../domain/query'
import type { Employee, EmployeeQuery, SortKey, Status } from '../domain/types'
import { useLocale } from '../i18n'

export const LAST_QUERY_KEY = 'employee-manager:last-query'
const SORTS: SortKey[] = ['surname_asc', 'surname_desc', 'start_desc', 'personnel']

export function readQuery(params: URLSearchParams): EmployeeQuery {
  const sort = params.get('sort') as SortKey | null
  const status = params.get('status') as Status | null
  return {
    ...DEFAULT_QUERY,
    search: params.get('q') ?? '',
    departmentId: params.get('dept') ?? '',
    status: status && ['active', 'leave', 'inactive'].includes(status) ? status : '',
    sort: sort && SORTS.includes(sort) ? sort : DEFAULT_QUERY.sort,
    page: Math.max(1, Number(params.get('page')) || 1),
  }
}

export function Employees() {
  const { t, locale, num, personName, jobTitle, deptName, initials, date } = useLocale()
  const [params, setParams] = useSearchParams()
  const query = readQuery(params)
  const [toDelete, setToDelete] = useState<Employee | null>(null)
  const [searchText, setSearchText] = useState(query.search)

  useEffect(() => {
    try {
      window.sessionStorage.setItem(LAST_QUERY_KEY, params.toString())
    } catch {
      /* storage blocked */
    }
  }, [params])

  const state = useLoad(
    async (api) => {
      const [page, departments, all] = await Promise.all([api.listEmployees(query, locale), api.listDepartments(), api.listEmployees({ ...DEFAULT_QUERY, pageSize: 1 })])
      return { page, departments, totalAll: all.total }
    },
    [params.toString(), locale],
  )

  function update(patch: Record<string, string>, resetPage = true) {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    if (resetPage) next.delete('page')
    setParams(next, { replace: true })
  }

  if (state.error) return <ErrorBox onRetry={state.reload} />
  const data = state.data

  const toolbar = (
    <>
      <Link to="/data" className="btn btn-secondary">{t('emp.importExport')}</Link>
      <Link to="/employees/new" className="btn btn-primary">{t('emp.add')}</Link>
    </>
  )

  return (
    <Page title={t('emp.title')} sub={data ? t('emp.records', { n: num(data.totalAll) }) : undefined} actions={toolbar}>
      {!data ? (
        <Loading />
      ) : data.totalAll === 0 ? (
        <section className="card state empty" aria-labelledby="empty-t">
          <Icon d={ICONS.addPerson} size={44} />
          <h2 id="empty-t">{t('emp.empty.title')}</h2>
          <p className="muted">{t('emp.empty.body')}</p>
          <div className="row">
            <Link to="/employees/new" className="btn btn-primary">{t('emp.add')}</Link>
            <Link to="/data" className="btn btn-secondary">{t('emp.empty.import')}</Link>
          </div>
        </section>
      ) : (
        <>
          <form role="search" className="filters" onSubmit={(e) => e.preventDefault()}>
            <div className="field grow2">
              <label htmlFor="q">{t('emp.search')}</label>
              <div className="search-box">
                <Icon d={ICONS.search} size={18} />
                <input
                  id="q"
                  type="search"
                  placeholder={t('emp.search.ph')}
                  value={searchText}
                  onChange={(e) => {
                    setSearchText(e.target.value)
                    update({ q: e.target.value })
                  }}
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="dp">{t('emp.department')}</label>
              <select id="dp" value={query.departmentId} onChange={(e) => update({ dept: e.target.value })}>
                <option value="">{t('emp.department.all')}</option>
                {data.departments.map((d) => (
                  <option key={d.id} value={d.id}>{deptName(d)}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="st">{t('emp.status')}</label>
              <select id="st" value={query.status} onChange={(e) => update({ status: e.target.value })}>
                <option value="">{t('status.any')}</option>
                {(['active', 'leave', 'inactive'] as const).map((s) => (
                  <option key={s} value={s}>{t(`status.${s}`)}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="so">{t('emp.sort')}</label>
              <select id="so" value={query.sort} onChange={(e) => update({ sort: e.target.value === DEFAULT_QUERY.sort ? '' : e.target.value })}>
                {SORTS.map((s) => (
                  <option key={s} value={s}>{t(`sort.${s}`)}</option>
                ))}
              </select>
            </div>
          </form>

          {data.page.total === 0 ? (
            <section className="card state empty" aria-labelledby="nores-t" data-testid="no-results">
              <Icon d={ICONS.search} size={44} />
              <h2 id="nores-t">{query.search.trim() ? t('emp.noresults.title', { q: query.search.trim() }) : t('emp.noresults.titleFilter')}</h2>
              <p className="muted">{t('emp.noresults.body')}</p>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setSearchText('')
                  setParams(new URLSearchParams(), { replace: true })
                }}
              >
                {t('emp.noresults.clear')}
              </button>
            </section>
          ) : (
            <section className="card flush">
              <div className="table-wrap" tabIndex={0} role="region" aria-label={t('emp.title')}>
                <table>
                  <caption className="sr-only">{t('emp.caption', { page: num(data.page.page), pages: num(data.page.pageCount) })}</caption>
                  <thead>
                    <tr>
                      <th scope="col" aria-sort={query.sort === 'surname_asc' ? 'ascending' : query.sort === 'surname_desc' ? 'descending' : 'none'}>
                        <button type="button" className="th-btn" onClick={() => update({ sort: query.sort === 'surname_asc' ? 'surname_desc' : '' })}>
                          {t('emp.col.employee')} {query.sort === 'surname_desc' ? '↑' : '↓'}
                        </button>
                      </th>
                      <th scope="col">{t('emp.col.no')}</th>
                      <th scope="col">{t('emp.col.dept')}</th>
                      <th scope="col">{t('emp.col.status')}</th>
                      <th scope="col">{t('emp.col.start')}</th>
                      <th scope="col">{t('emp.col.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.page.items.map((e, i) => (
                      <tr key={e.id}>
                        <td>
                          <div className="person">
                            <Avatar text={initials(e)} index={i} />
                            <span>
                              <Link to={`/employees/${e.id}`} className="strong">{personName(e)}</Link>
                              <span className="muted small block">{jobTitle(e)}</span>
                            </span>
                          </div>
                        </td>
                        <td className="nums"><bdi>{num(e.personnelNo)}</bdi></td>
                        <td>{deptName(data.departments.find((d) => d.id === e.departmentId))}</td>
                        <td><StatusBadge status={e.status} /></td>
                        <td className="nums">{date(e.startDate)}</td>
                        <td>
                          <div className="row-actions">
                            <Link to={`/employees/${e.id}/edit`} aria-label={t('emp.editFor', { name: personName(e) })}>{t('common.edit')}</Link>
                            <button type="button" className="link-btn danger" aria-label={t('emp.deleteFor', { name: personName(e) })} onClick={() => setToDelete(e)}>
                              {t('common.delete')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="table-foot">
                <span className="muted small">
                  {t('emp.showing', {
                    from: num((data.page.page - 1) * data.page.pageSize + 1),
                    to: num((data.page.page - 1) * data.page.pageSize + data.page.items.length),
                    total: num(data.page.total),
                  })}
                </span>
                <Pagination page={data.page.page} pageCount={data.page.pageCount} onPage={(p) => update({ page: p === 1 ? '' : String(p) }, false)} />
              </div>
            </section>
          )}
        </>
      )}
      <DeleteDialog employee={toDelete} departments={data?.departments ?? []} onClose={() => setToDelete(null)} />
    </Page>
  )
}
