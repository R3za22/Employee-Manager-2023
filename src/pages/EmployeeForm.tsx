import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useData, useLoad, useToast } from '../app'
import { NotFoundError, ValidationError } from '../api/types'
import { ErrorBox, Field, Loading, Page } from '../components/ui'
import { isoToJalali } from '../domain/jalali'
import { toFaDigits } from '../domain/digits'
import type { Employee, EmployeeInput, ShiftGroup, Status } from '../domain/types'
import { parseDateInput, validateEmployee, type ErrorCode, type FieldErrors } from '../domain/validators'
import { useLocale } from '../i18n'
import { NotFound } from './NotFound'

interface FormState {
  givenName: string
  surname: string
  givenNameFa: string
  surnameFa: string
  nationalId: string
  personnelNo: string
  jobTitle: string
  jobTitleFa: string
  startText: string
  departmentId: string
  status: Status
  shiftGroup: ShiftGroup
}

const EMPTY: FormState = {
  givenName: '', surname: '', givenNameFa: '', surnameFa: '', nationalId: '', personnelNo: '', jobTitle: '', jobTitleFa: '',
  startText: '', departmentId: '', status: 'active', shiftGroup: 'none',
}

function fromEmployee(e: Employee, fa: boolean): FormState {
  const start = e.startDate ? (fa ? toFaDigits(isoToJalali(e.startDate)) : e.startDate) : ''
  return { ...e, startText: start }
}

const FIELD_ORDER: (keyof FieldErrors)[] = ['givenName', 'surname', 'nationalId', 'personnelNo', 'jobTitle', 'startDate', 'departmentId', 'givenNameFa', 'surnameFa']
const FIELD_ID: Record<string, string> = {
  givenName: 'f-given', surname: 'f-sur', nationalId: 'f-nid', personnelNo: 'f-no', jobTitle: 'f-title', startDate: 'f-start',
  departmentId: 'f-dept', givenNameFa: 'f-given-fa', surnameFa: 'f-sur-fa',
}

export function EmployeeForm() {
  const { id } = useParams()
  const editing = !!id
  const { t, locale } = useLocale()
  const { api, bump } = useData()
  const toast = useToast()
  const navigate = useNavigate()
  const state = useLoad(async (a) => {
    const [all, departments] = await Promise.all([a.allEmployees(), a.listDepartments()])
    return { all, departments, current: id ? (all.find((e) => e.id === id) ?? null) : null }
  }, [id])
  const [form, setForm] = useState<FormState>(EMPTY)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)
  const initialised = useRef(false)
  const summaryRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!state.data || initialised.current) return
    initialised.current = true
    if (state.data.current) setForm(fromEmployee(state.data.current, locale === 'fa'))
    else setForm((f) => ({ ...f, departmentId: state.data?.departments[0]?.id ?? '' }))
  }, [state.data, locale])

  useEffect(() => {
    if (submitted && Object.keys(errors).length > 0) summaryRef.current?.focus()
  }, [submitted, errors])

  if (state.error) return <ErrorBox onRetry={state.reload} />
  if (!state.data) return <Loading />
  const { all, departments, current } = state.data
  if (editing && !current) return <NotFound />

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }))

  function toInput(): EmployeeInput {
    const text = form.startText.trim()
    const parsed = parseDateInput(text)
    return {
      givenName: form.givenName, surname: form.surname, givenNameFa: form.givenNameFa, surnameFa: form.surnameFa,
      nationalId: form.nationalId, personnelNo: form.personnelNo, jobTitle: form.jobTitle, jobTitleFa: form.jobTitleFa,
      departmentId: form.departmentId, status: form.status, shiftGroup: form.shiftGroup,
      startDate: text === '' ? null : (parsed ?? `invalid:${text}`),
    }
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    setSubmitted(true)
    setFailed(false)
    const input = toInput()
    const found = validateEmployee(input, { employees: all, departments, selfId: id })
    setErrors(found)
    if (Object.keys(found).length > 0) return
    setSaving(true)
    try {
      const saved = editing && id ? await api.updateEmployee(id, input) : await api.createEmployee(input)
      bump()
      toast.show(t('form.saved'))
      navigate(`/employees/${saved.id}`)
    } catch (err) {
      if (err instanceof ValidationError) setErrors(err.errors)
      else if (err instanceof NotFoundError) navigate('/employees')
      else setFailed(true)
    } finally {
      setSaving(false)
    }
  }

  const msg = (field: keyof FieldErrors) => (errors[field] ? t(`err.${errors[field] as ErrorCode}`) : undefined)
  const errorFields = FIELD_ORDER.filter((f) => errors[f])
  const label = (f: keyof FieldErrors) =>
    ({ givenName: t('form.givenName'), surname: t('form.surname'), nationalId: t('form.nid'), personnelNo: t('form.no'), jobTitle: t('form.title'), startDate: t('form.start'), departmentId: t('form.department'), givenNameFa: t('form.givenNameFa'), surnameFa: t('form.surnameFa') })[f as string] ?? f

  return (
    <Page title={editing ? t('form.editTitle') : t('form.addTitle')} sub={current ? `${current.givenName} ${current.surname}` : undefined}>
      <p className="crumb"><Link to={editing && id ? `/employees/${id}` : '/employees'}>{t('common.back')}</Link></p>
      <form noValidate onSubmit={onSubmit} className="card form" aria-label={editing ? t('form.editTitle') : t('form.addTitle')}>
        {errorFields.length > 0 && (
          <div className="summary" role="alert" tabIndex={-1} ref={summaryRef}>
            <strong>{errorFields.length === 1 ? t('form.summary.one') : t('form.summary.many', { n: String(errorFields.length) })}</strong>
            <span>
              {errorFields.map((f, i) => (
                <span key={f}>
                  {i > 0 && ', '}
                  <a href={`#${FIELD_ID[f]}`} onClick={(e) => { e.preventDefault(); document.getElementById(FIELD_ID[f])?.focus() }}>{label(f)}</a>
                </span>
              ))}
              {'. '}
              {t('form.summary.body')}
            </span>
          </div>
        )}
        {failed && <p className="field-error" role="alert">{t('common.error')}</p>}
        <div className="form-grid">
          <Field id="f-given" label={t('form.givenName')} hint={t('form.givenName.hint')} error={msg('givenName')}>
            {(p) => <input {...p} type="text" autoComplete="off" value={form.givenName} onChange={(e) => set('givenName', e.target.value)} />}
          </Field>
          <Field id="f-sur" label={t('form.surname')} hint={t('form.surname.hint')} error={msg('surname')}>
            {(p) => <input {...p} type="text" autoComplete="off" value={form.surname} onChange={(e) => set('surname', e.target.value)} />}
          </Field>
          <Field id="f-given-fa" label={t('form.givenNameFa')} error={msg('givenNameFa')}>
            {(p) => <input {...p} type="text" lang="fa" dir="rtl" value={form.givenNameFa} onChange={(e) => set('givenNameFa', e.target.value)} />}
          </Field>
          <Field id="f-sur-fa" label={t('form.surnameFa')} error={msg('surnameFa')}>
            {(p) => <input {...p} type="text" lang="fa" dir="rtl" value={form.surnameFa} onChange={(e) => set('surnameFa', e.target.value)} />}
          </Field>
          <Field id="f-nid" label={t('form.nid')} hint={t('form.nid.hint')} error={msg('nationalId')}>
            {(p) => <input {...p} type="text" inputMode="numeric" dir="ltr" autoComplete="off" value={form.nationalId} onChange={(e) => set('nationalId', e.target.value)} />}
          </Field>
          <Field id="f-no" label={t('form.no')} hint={t('form.no.hint')} error={msg('personnelNo')}>
            {(p) => <input {...p} type="text" dir="ltr" autoComplete="off" placeholder="P-1010" value={form.personnelNo} onChange={(e) => set('personnelNo', e.target.value)} />}
          </Field>
          <Field id="f-title" label={t('form.title')} hint={t('form.title.hint')} error={msg('jobTitle')}>
            {(p) => <input {...p} type="text" value={form.jobTitle} onChange={(e) => set('jobTitle', e.target.value)} />}
          </Field>
          <Field id="f-title-fa" label={t('form.titleFa')}>
            {(p) => <input {...p} type="text" lang="fa" dir="rtl" value={form.jobTitleFa} onChange={(e) => set('jobTitleFa', e.target.value)} />}
          </Field>
          <Field id="f-start" label={t('form.start')} hint={locale === 'fa' ? t('form.start.hintFa') : t('form.start.hintEn')} error={msg('startDate')}>
            {(p) => <input {...p} type="text" inputMode="numeric" dir="ltr" autoComplete="off" placeholder={locale === 'fa' ? '۱۴۰۱/۰۲/۱۸' : 'YYYY-MM-DD'} value={form.startText} onChange={(e) => set('startText', e.target.value)} />}
          </Field>
          <Field id="f-dept" label={t('form.department')} hint={t('form.department.hint')} error={msg('departmentId')}>
            {(p) => (
              <select {...p} value={form.departmentId} onChange={(e) => set('departmentId', e.target.value)}>
                {departments.map((d) => <option key={d.id} value={d.id}>{locale === 'fa' ? d.nameFa : d.name}</option>)}
              </select>
            )}
          </Field>
          <Field id="f-status" label={t('form.status')} hint={t('form.status.hint')}>
            {(p) => (
              <select {...p} value={form.status} onChange={(e) => set('status', e.target.value as Status)}>
                {(['active', 'leave', 'inactive'] as const).map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
              </select>
            )}
          </Field>
          <Field id="f-shift" label={t('form.shift')} hint={t('form.shift.hint')}>
            {(p) => (
              <select {...p} value={form.shiftGroup} onChange={(e) => set('shiftGroup', e.target.value as ShiftGroup)}>
                {(['A', 'B', 'C', 'none'] as const).map((s) => <option key={s} value={s}>{t(`shift.${s}`)}</option>)}
              </select>
            )}
          </Field>
        </div>
        <div className="form-actions">
          <Link to={editing && id ? `/employees/${id}` : '/employees'} className="btn btn-link">{t('common.cancel')}</Link>
          <button type="submit" className="btn btn-primary" disabled={saving}>{t('form.saveBtn')}</button>
        </div>
      </form>
    </Page>
  )
}
