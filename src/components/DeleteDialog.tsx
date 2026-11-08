import { useState } from 'react'
import { useData, useToast } from '../app'
import { downloadText } from '../download'
import { employeesToCsv } from '../exporter'
import { useLocale } from '../i18n'
import type { Department, Employee } from '../domain/types'
import { Dialog } from './ui'

export function DeleteDialog({
  employee,
  departments,
  onClose,
  onDeleted,
}: {
  employee: Employee | null
  departments: Department[]
  onClose: () => void
  onDeleted?: () => void
}) {
  const { t, personName, jobTitle, deptName } = useLocale()
  const { api, bump } = useData()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  async function backup() {
    const [all, depts] = await Promise.all([api.allEmployees(), api.listDepartments()])
    downloadText('employees-backup.csv', employeesToCsv(all, depts), 'text/csv', true)
  }

  async function confirm() {
    if (!employee) return
    setBusy(true)
    setFailed(false)
    try {
      const removed = await api.deleteEmployee(employee.id)
      bump()
      onClose()
      onDeleted?.()
      const name = personName(removed)
      toast.show(t('del.done', { name }), {
        label: t('common.undo'),
        run: () => {
          api.restoreEmployee(removed).then(() => {
            bump()
            toast.show(t('del.restored', { name }))
          })
        },
      })
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  const dept = departments.find((d) => d.id === employee?.departmentId)
  return (
    <Dialog open={!!employee} onClose={onClose} labelledBy="del-title" alert>
      {employee && (
        <div className="dialog-body">
          <h2 id="del-title">{t('del.title', { name: personName(employee) })}</h2>
          <p className="muted">{t('del.body', { no: employee.personnelNo, role: jobTitle(employee), dept: deptName(dept) })}</p>
          <button type="button" className="link-btn" onClick={backup}>
            {t('del.backup')}
          </button>
          <p className="muted small">{t('del.hint')}</p>
          {failed && <p className="field-error" role="alert">{t('common.error')}</p>}
          <div className="dialog-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} autoFocus>
              {t('del.keep')}
            </button>
            <button type="button" className="btn btn-danger" onClick={confirm} disabled={busy}>
              {t('del.confirm')}
            </button>
          </div>
        </div>
      )}
    </Dialog>
  )
}
