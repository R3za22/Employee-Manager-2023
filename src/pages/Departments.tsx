import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { DepartmentError } from '../api/types'
import { useData, useLoad, useToast } from '../app'
import { Avatar, Dialog, ErrorBox, Field, Loading, Page } from '../components/ui'
import type { Department } from '../domain/types'
import { useLocale } from '../i18n'

const FA_GROUP: Record<string, string> = { A: 'الف', B: 'ب', C: 'ج' }

function DeptDialog({ target, onClose }: { target: Department | 'new' | null; onClose: () => void }) {
  const { t } = useLocale()
  const { api, bump } = useData()
  const toast = useToast()
  const [name, setName] = useState(target && target !== 'new' ? target.name : '')
  const [nameFa, setNameFa] = useState(target && target !== 'new' ? target.nameFa : '')
  const [error, setError] = useState<string | null>(null)
  const isNew = target === 'new'

  async function submit(ev: FormEvent) {
    ev.preventDefault()
    if (!target) return
    try {
      if (isNew) await api.createDepartment(name, nameFa)
      else await api.renameDepartment(target.id, name, nameFa)
      bump()
      toast.show(t('form.saved'))
      onClose()
    } catch (err) {
      setError(err instanceof DepartmentError ? t(`dept.err.${err.code}`) : t('common.error'))
    }
  }

  return (
    <Dialog open={!!target} onClose={onClose} labelledBy="dept-title">
      {target && (
        <form className="dialog-body" onSubmit={submit} noValidate>
          <h2 id="dept-title">{isNew ? t('dept.addTitle') : t('dept.renameTitle')}</h2>
          <Field id="d-name" label={t('dept.name')} error={error ?? undefined}>
            {(p) => <input {...p} type="text" autoFocus value={name} onChange={(e) => { setName(e.target.value); setError(null) }} />}
          </Field>
          <Field id="d-name-fa" label={t('dept.nameFa')}>
            {(p) => <input {...p} type="text" lang="fa" dir="rtl" value={nameFa} onChange={(e) => setNameFa(e.target.value)} />}
          </Field>
          <div className="dialog-actions">
            <button type="button" className="btn btn-link" onClick={onClose}>{t('common.cancel')}</button>
            <button type="submit" className="btn btn-primary">{t('common.save')}</button>
          </div>
        </form>
      )}
    </Dialog>
  )
}

export function Departments() {
  const { t, locale, num, deptName, personName, initials } = useLocale()
  const { api, bump } = useData()
  const toast = useToast()
  const [dialog, setDialog] = useState<Department | 'new' | null>(null)
  const state = useLoad(async (a) => {
    const [departments, employees] = await Promise.all([a.listDepartments(), a.allEmployees()])
    return { departments, employees }
  }, [])
  if (state.error) return <ErrorBox onRetry={state.reload} />
  if (!state.data) return <Loading />
  const { departments, employees } = state.data

  async function remove(d: Department) {
    try {
      await api.deleteDepartment(d.id)
      bump()
      toast.show(t('dept.removed', { name: deptName(d) }))
    } catch (err) {
      toast.show(err instanceof DepartmentError ? t(`dept.err.${err.code}`) : t('common.error'))
    }
  }

  return (
    <Page
      title={t('dept.title')}
      sub={t('dept.summary', { d: num(departments.length), e: num(employees.length) })}
      actions={<button type="button" className="btn btn-primary" onClick={() => setDialog('new')}>{t('dept.add')}</button>}
    >
      <ul className="dept-grid">
        {departments.map((d) => {
          const people = employees.filter((e) => e.departmentId === d.id)
          const head = employees.find((e) => e.id === d.headId)
          const groups = [...new Set(people.map((p) => p.shiftGroup).filter((g) => g !== 'none'))].sort()
          const gText = groups.map((g) => (locale === 'fa' ? FA_GROUP[g] : g)).join(locale === 'fa' ? '، ' : ', ')
          return (
            <li key={d.id} className="card dept" data-testid={`dept-${d.id}`}>
              <div className="card-head">
                <div>
                  <h2>{deptName(d)}</h2>
                  <span className="muted small">{head ? t('dept.head', { name: personName(head) }) : t('dept.noHead')}</span>
                </div>
                <span className="dept-count">{num(people.length)}</span>
              </div>
              <div className="avatars">
                {people.slice(0, 3).map((p, i) => <Avatar key={p.id} text={initials(p)} index={i} />)}
                {people.length > 3 && <span className="muted small">{t('dept.more', { n: num(people.length - 3) })}</span>}
              </div>
              <span className="muted small">{groups.length ? t('dept.groups', { g: gText }) : t('dept.noShifts')}</span>
              <div className="dept-actions">
                <Link to={`/employees?dept=${encodeURIComponent(d.id)}`}>{t('dept.view')}</Link>
                <button type="button" className="link-btn" onClick={() => setDialog(d)} aria-label={`${t('dept.rename')}: ${deptName(d)}`}>{t('dept.rename')}</button>
                {people.length === 0 && (
                  <button type="button" className="link-btn danger" onClick={() => remove(d)} aria-label={`${t('dept.remove')}: ${deptName(d)}`}>{t('dept.remove')}</button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
      <DeptDialog key={dialog === 'new' ? 'new' : dialog ? dialog.id : 'none'} target={dialog} onClose={() => setDialog(null)} />
    </Page>
  )
}
