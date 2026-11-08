import { useState, type DragEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData, useLoad, useToast } from '../app'
import { downloadText } from '../download'
import { csvTemplate, employeesToCsv } from '../exporter'
import { csvRowsToRecords, parseJsonRecords, validateRecords, type ImportPreview } from '../domain/importer'
import { parseCsv } from '../domain/csv'
import type { Department, Employee } from '../domain/types'
import { ErrorBox, Loading, Page } from '../components/ui'
import { useLocale, type TFn } from '../i18n'
import { LAST_QUERY_KEY, readQuery } from './Employees'

const MAX_BYTES = 2 * 1024 * 1024

interface Loaded {
  file: string
  records: Record<string, unknown>[]
  extraDepartments: string[]
  preview: ImportPreview
}

const FIELD_LABEL = {
  givenName: 'form.givenName', surname: 'form.surname', givenNameFa: 'form.givenNameFa', surnameFa: 'form.surnameFa',
  nationalId: 'form.nid', personnelNo: 'form.no', jobTitle: 'form.title', jobTitleFa: 'form.titleFa', startDate: 'form.start',
  departmentId: 'form.department', status: 'form.status', shiftGroup: 'form.shift',
} as const

function problemText(p: ImportPreview['problems'][number], t: TFn): string {
  if (p.message) return t(`err.${p.message}`)
  return Object.entries(p.errors)
    .map(([field, code]) => `${t(FIELD_LABEL[field as keyof typeof FIELD_LABEL])}: ${t(`err.${code}` as 'err.required')}`)
    .join(' ')
}

export function ImportExport() {
  const { t, num } = useLocale()
  const { api, bump } = useData()
  const toast = useToast()
  const navigate = useNavigate()
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [format, setFormat] = useState<'csv' | 'json' | 'print'>('csv')
  const [scope, setScope] = useState<'all' | 'filter' | 'active'>('all')
  const state = useLoad(async (a) => {
    const [employees, departments] = await Promise.all([a.allEmployees(), a.listDepartments()])
    return { employees, departments }
  }, [])
  if (state.error) return <ErrorBox onRetry={state.reload} />
  if (!state.data) return <Loading />
  const { employees, departments } = state.data

  async function readFile(file: File | undefined) {
    setFileError(null)
    setLoaded(null)
    if (!file) return
    if (file.size > MAX_BYTES) return setFileError(t('data.tooBig'))
    const text = await file.text()
    const isJson = /\.json$/i.test(file.name) || /^\s*[[{]/.test(text)
    let records: Record<string, unknown>[] = []
    let extraDepartments: string[] = []
    if (isJson) {
      const parsed = parseJsonRecords(text, departments)
      if (!parsed) return setFileError(t('data.badFile'))
      records = parsed.records
      extraDepartments = parsed.departmentNames
    } else {
      const rows = parseCsv(text)
      if (rows.length === 0 || !rows[0].map((h) => h.trim()).includes('personnelNo')) return setFileError(t('data.badFile'))
      records = csvRowsToRecords(rows)
    }
    setLoaded({ file: file.name, records, extraDepartments, preview: validateRecords(records, employees, withProvisional(departments, extraDepartments)) })
  }

  function withProvisional(base: Department[], names: string[]): Department[] {
    const extra = names
      .filter((n) => !base.some((d) => d.name.toLowerCase() === n.toLowerCase()))
      .map((n) => ({ id: `provisional:${n}`, name: n, nameFa: n, headId: null }))
    return [...base, ...extra]
  }

  async function confirmImport() {
    if (!loaded) return
    setBusy(true)
    try {
      for (const name of loaded.extraDepartments) {
        if (!departments.some((d) => d.name.toLowerCase() === name.toLowerCase())) await api.createDepartment(name)
      }
      const [freshEmployees, freshDepartments] = await Promise.all([api.allEmployees(), api.listDepartments()])
      const final = validateRecords(loaded.records, freshEmployees, freshDepartments)
      const result = await api.importEmployees(final.valid, loaded.file)
      bump()
      setLoaded(null)
      toast.show(t('data.imported', { n: num(result.added.length) }))
    } catch {
      setFileError(t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  function onDrop(ev: DragEvent) {
    ev.preventDefault()
    setDragging(false)
    void readFile(ev.dataTransfer.files[0])
  }

  async function exportNow() {
    if (format === 'print') return navigate('/schedule')
    let list: Employee[] = employees
    if (scope === 'active') list = employees.filter((e) => e.status === 'active')
    if (scope === 'filter') {
      let saved = ''
      try { saved = window.sessionStorage.getItem(LAST_QUERY_KEY) ?? '' } catch { /* blocked */ }
      const q = readQuery(new URLSearchParams(saved))
      list = (await api.listEmployees({ ...q, page: 1, pageSize: 100000 }, 'en')).items
    }
    if (format === 'csv') downloadText('employees.csv', employeesToCsv(list, departments), 'text/csv', true)
    else {
      const backup = await api.exportBackup()
      const ids = new Set(list.map((e) => e.id))
      downloadText('employees-backup.json', JSON.stringify({ ...backup, employees: backup.employees.filter((e) => ids.has(e.id)) }, null, 2), 'application/json')
    }
    toast.show(t('data.exported'))
  }

  async function reset() {
    await api.resetData()
    bump()
    setLoaded(null)
    toast.show(t('data.resetDone'))
  }

  const ok = loaded?.preview.valid.length ?? 0
  const bad = loaded?.preview.problems.length ?? 0

  return (
    <Page title={t('data.title')} sub={t('data.sub')}>
      <div className="grid-2">
        <section className="card" aria-labelledby="imp-h">
          <h2 id="imp-h">{t('data.import')}</h2>
          <div
            className={`drop${dragging ? ' drop-on' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <span>{t('data.drop')}</span>
            <label htmlFor="file-in" className="btn btn-secondary">{t('data.choose')}</label>
            <input id="file-in" className="sr-only-focus" type="file" accept=".csv,.json,text/csv,application/json" onChange={(e) => { void readFile(e.target.files?.[0]); e.target.value = '' }} />
          </div>
          <button type="button" className="link-btn" onClick={() => downloadText('employees-template.csv', csvTemplate(), 'text/csv', true)}>{t('data.template')}</button>
          {fileError && <p className="field-error" role="alert">{fileError}</p>}
          {loaded && (
            <div className="import-result" aria-live="polite">
              <p className="strong">{t('data.fileSummary', { file: loaded.file, ok: num(ok), bad: num(bad) })}</p>
              {bad > 0 && (
                <>
                  <h3>{t('data.problems')}</h3>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr><th scope="col">{t('data.col.row')}</th><th scope="col">{t('data.col.employee')}</th><th scope="col">{t('data.col.problem')}</th></tr>
                      </thead>
                      <tbody>
                        {loaded.preview.problems.map((p) => (
                          <tr key={p.row}><td className="nums">{num(p.row)}</td><td>{p.label}</td><td>{problemText(p, t)}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="muted small">{t('data.skipNote')}</p>
                </>
              )}
              <div className="row">
                <button type="button" className="btn btn-link" onClick={() => setLoaded(null)}>{t('common.cancel')}</button>
                <button type="button" className="btn btn-primary" disabled={ok === 0 || busy} onClick={confirmImport}>
                  {ok === 0 ? t('data.importNone') : t('data.importBtn', { n: num(ok) })}
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="card" aria-labelledby="exp-h">
          <h2 id="exp-h">{t('data.export')}</h2>
          <fieldset className="radios">
            <legend>{t('data.format')}</legend>
            {(['csv', 'json', 'print'] as const).map((f) => (
              <label key={f}><input type="radio" name="format" checked={format === f} onChange={() => setFormat(f)} /> {t(`data.fmt.${f}`)}</label>
            ))}
          </fieldset>
          <div className="field">
            <label htmlFor="scope">{t('data.scope')}</label>
            <select id="scope" value={scope} disabled={format === 'print'} onChange={(e) => setScope(e.target.value as typeof scope)}>
              <option value="all">{t('data.scope.all', { n: num(employees.length) })}</option>
              <option value="filter">{t('data.scope.filter')}</option>
              <option value="active">{t('data.scope.active')}</option>
            </select>
          </div>
          <button type="button" className="btn btn-primary" onClick={exportNow}>{t('data.exportBtn')}</button>
          <p className="notice small">{t('data.exportWarn')}</p>
          {import.meta.env.VITE_API_MODE !== 'live' && (
            <div className="reset">
              <button type="button" className="link-btn danger" onClick={reset}>{t('data.reset')}</button>
              <span className="muted small block">{t('data.resetNote')}</span>
            </div>
          )}
        </section>
      </div>
    </Page>
  )
}
