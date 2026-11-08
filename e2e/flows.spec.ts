import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

const rows = (page: Page) => page.locator('tbody tr')

test.beforeEach(async ({ page }) => {
  // Every test starts from the seeded sample data in a fresh origin storage.
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('e2e-init')) {
      localStorage.clear()
      sessionStorage.setItem('e2e-init', '1')
    }
  })
})

test('no request leaves the origin in mock mode', async ({ page, baseURL }) => {
  const external: string[] = []
  page.on('request', (r) => {
    const u = r.url()
    if (!u.startsWith(baseURL!) && !u.startsWith('data:') && !u.startsWith('blob:')) external.push(u)
  })
  for (const p of ['/#/', '/#/employees', '/#/employees/emp-1001', '/#/departments', '/#/data', '/#/schedule', '/?lang=fa#/employees']) {
    await page.goto(p)
    await page.waitForLoadState('networkidle')
  }
  expect(external).toEqual([])
})

test('dashboard shows totals, attention items and recent changes', async ({ page }) => {
  await page.goto('/#/')
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  const totals = page.getByRole('region', { name: 'Totals' })
  await expect(totals).toContainText('24')
  await expect(page.getByText('National ID fails the check-digit test')).toBeVisible()
  await expect(page.getByText('Missing start date')).toBeVisible()
  await page.getByRole('link', { name: /^Fix: Reza Naderi/ }).click()
  await expect(page.getByRole('heading', { name: 'Edit employee' })).toBeVisible()
})

test('list: search, filter, sort, paginate, no-results', async ({ page }) => {
  await page.goto('/#/employees')
  await expect(rows(page)).toHaveCount(8)
  await expect(page.getByText('Showing 1 to 8 of 24')).toBeVisible()
  await page.getByRole('button', { name: 'Page 2' }).click()
  await expect(page.getByText('Showing 9 to 16 of 24')).toBeVisible()
  await page.getByRole('button', { name: 'Next page' }).click()
  await expect(page.getByText('Showing 17 to 24 of 24')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Next page' })).toBeDisabled()

  await page.getByLabel('Search').fill('karimi')
  await expect(rows(page)).toHaveCount(1)
  await expect(rows(page).first()).toContainText('Mahdi Karimi')
  await page.getByLabel('Search').fill('')

  await page.getByLabel('Department').selectOption({ label: 'Maintenance' })
  await expect(rows(page)).toHaveCount(3)
  await page.getByLabel('Status').selectOption('leave')
  await expect(rows(page)).toHaveCount(0)
  await expect(page.getByTestId('no-results')).toContainText('No employees match these filters')
  await page.getByRole('button', { name: 'Clear search and filters' }).click()
  await expect(rows(page)).toHaveCount(8)

  await page.getByLabel('Sort by').selectOption('surname_desc')
  await expect(rows(page).first()).toContainText('Zarei')
  await page.getByLabel('Sort by').selectOption('personnel')
  await expect(rows(page).first()).toContainText('P-1001')

  await page.getByLabel('Search').fill('Rahimi')
  await expect(rows(page)).toHaveCount(1)
  await page.getByLabel('Search').fill('nobody-here')
  await expect(page.getByRole('heading', { name: 'No results for “nobody-here”' })).toBeVisible()
})

test('add employee: validation errors, then save and persist across reload', async ({ page }) => {
  await page.goto('/#/employees/new')
  await page.getByLabel('Given name', { exact: true }).fill('Ava')
  await page.getByLabel('Surname', { exact: true }).fill('Nouri')
  await page.getByLabel('National ID').fill('0012345678') // bad check digit
  await page.getByLabel('Personnel number').fill('P-1001') // duplicate
  await page.getByLabel('Job title', { exact: true }).fill('Analyst')
  await page.getByRole('button', { name: 'Save employee' }).click()
  const summary = page.getByRole('alert').filter({ hasText: 'need attention' })
  await expect(summary).toContainText('3 fields need attention')
  await expect(page.getByText('The check digit does not match')).toBeVisible()
  await expect(page.getByText('already used by another employee')).toBeVisible()
  await expect(page.getByText('This field is required.')).toBeVisible()
  await expect(page.getByLabel('National ID')).toHaveAttribute('aria-invalid', 'true')

  await page.getByLabel('National ID').fill('0499370899')
  await page.getByLabel('Personnel number').fill('P-2001')
  await page.getByLabel('Start date').fill('2099-01-01')
  await page.getByRole('button', { name: 'Save employee' }).click()
  await expect(page.getByText('cannot be in the future')).toBeVisible()
  await page.getByLabel('Start date').fill('2024-02-30')
  await page.getByRole('button', { name: 'Save employee' }).click()
  await expect(page.getByText('This is not a real date.')).toBeVisible()
  await page.getByLabel('Start date').fill('2024-02-29')
  await page.getByRole('button', { name: 'Save employee' }).click()

  await expect(page.getByRole('heading', { name: 'Ava Nouri' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Ava Nouri' })).toBeVisible()
  await page.goto('/#/employees')
  await expect(page.getByText('25 records')).toBeVisible()
})

test('edit employee updates profile and history', async ({ page }) => {
  await page.goto('/#/employees/emp-1001/edit')
  await page.getByLabel('Job title', { exact: true }).fill('Senior line supervisor')
  await page.getByLabel('Status').selectOption('leave')
  await page.getByRole('button', { name: 'Save employee' }).click()
  await expect(page.getByText('Senior line supervisor · Production')).toBeVisible()
  await expect(page.getByText('Status set to On leave')).toBeVisible()
  await expect(page.getByText('Job title changed to Senior line supervisor')).toBeVisible()
})

test('delete asks for confirmation and can be undone', async ({ page }) => {
  await page.goto('/#/employees')
  await page.getByLabel('Search').fill('naderi')
  await page.getByRole('button', { name: 'Delete Reza Naderi' }).click()
  const dialog = page.getByRole('alertdialog')
  await expect(dialog).toContainText('Delete Reza Naderi?')
  await dialog.getByRole('button', { name: 'Keep employee' }).click()
  await expect(rows(page)).toHaveCount(1)

  await page.getByRole('button', { name: 'Delete Reza Naderi' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete employee' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Reza Naderi was deleted.' })).toBeVisible()
  await expect(page.getByTestId('no-results')).toBeVisible()
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(rows(page)).toHaveCount(1)
  await expect(page.getByText('Reza Naderi was restored.')).toBeVisible()
})

test('departments: add, rename, remove, and guard non-empty', async ({ page }) => {
  await page.goto('/#/departments')
  await expect(page.getByText('5 departments, 24 employees')).toBeVisible()
  await page.getByRole('button', { name: 'Add department' }).click()
  await page.getByLabel('Department name').fill('Production')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByText('A department with this name already exists.')).toBeVisible()
  await page.getByLabel('Department name').fill('Legal')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Legal' })).toBeVisible()

  await page.getByRole('button', { name: 'Rename: Legal' }).click()
  await page.getByLabel('Department name').fill('Legal affairs')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Legal affairs' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Remove: Production' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Remove: Legal affairs' }).click()
  await expect(page.getByRole('heading', { name: 'Legal affairs' })).toHaveCount(0)
})

test('import CSV with bad rows, then export CSV', async ({ page }) => {
  await page.goto('/#/data')
  const csv = [
    'personnelNo,givenName,surname,givenNameFa,surnameFa,nationalId,department,jobTitle,jobTitleFa,status,shiftGroup,startDate',
    'P-3001,Ava,Nouri,,,0499370899,Sales,Analyst,,active,A,2024-01-15',
    'P-3002,Bad,Digits,,,0499370890,Sales,Analyst,,active,,2024-01-15',
    'P-3003,Odd,Dept,,,0084575948,Nowhere,Analyst,,active,,2024-01-15',
    'P-3004,Sam,Ok,,,0084575948,Production,Operator,,leave,none,1402/05/10',
  ].join('\n')
  await page.locator('#file-in').setInputFiles({ name: 'staff-test.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) })
  await expect(page.getByText('staff-test.csv: 2 ready, 2 need fixing')).toBeVisible()
  await expect(page.getByRole('row', { name: /4 Odd Dept/ })).toContainText('Department')
  await expect(page.getByRole('row', { name: /3 Bad Digits/ })).toContainText('check digit')
  await page.getByRole('button', { name: 'Import 2 employees' }).click()
  await expect(page.getByText('Imported 2 employees.')).toBeVisible()

  await page.goto('/#/employees')
  await expect(page.getByText('26 records')).toBeVisible()
  await page.goto('/#/data')
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export file' }).click()])
  expect(download.suggestedFilename()).toBe('employees.csv')
  const body = readFileSync((await download.path())!, 'utf8')
  expect(body).toContain('personnelNo,givenName,surname')
  expect(body).toContain('P-3001')
  expect(body.split('\r\n').filter(Boolean)).toHaveLength(27)
})

test('rejects unreadable import files', async ({ page }) => {
  await page.goto('/#/data')
  await page.locator('#file-in').setInputFiles({ name: 'junk.csv', mimeType: 'text/csv', buffer: Buffer.from('hello,world\n1,2') })
  await expect(page.getByRole('alert').filter({ hasText: 'could not be read' })).toBeVisible()
})

test('JSON backup export is valid JSON with all employees', async ({ page }) => {
  await page.goto('/#/data')
  await page.getByLabel(/JSON backup/).check()
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export file' }).click()])
  const json = JSON.parse(readFileSync((await download.path())!, 'utf8'))
  expect(json.employees).toHaveLength(24)
  expect(json.departments).toHaveLength(5)
})

test('empty state when there are no employees', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'employee-manager:v1',
      JSON.stringify({ employees: [], departments: [{ id: 'dep-prod', name: 'Production', nameFa: 'تولید', headId: null }], activity: [] }),
    )
  })
  await page.goto('/#/employees')
  await expect(page.getByRole('heading', { name: 'No employees yet' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Import from CSV' })).toBeVisible()
  await expect(page.getByText('0 records')).toBeVisible()
})

test('Persian mode: RTL, Persian digits, Jalali dates, and back', async ({ page }) => {
  await page.goto('/?lang=fa#/employees')
  const html = page.locator('html')
  await expect(html).toHaveAttribute('dir', 'rtl')
  await expect(html).toHaveAttribute('lang', 'fa')
  await expect(page.getByRole('heading', { name: 'کارکنان' })).toBeVisible()
  await expect(page.getByText('۲۴ رکورد')).toBeVisible()
  await expect(page.getByText('۱۴۰۱/۰۲/۱۸')).toBeVisible() // Narges Ahmadi, 2022-05-08
  expect(await page.locator('tbody').innerText()).not.toMatch(/[0-9]/)
  const font = await page.evaluate(() => getComputedStyle(document.body).fontFamily)
  expect(font).toContain('Vazirmatn')

  await page.getByRole('link', { name: 'ویرایش نرگس احمدی' }).click()
  await expect(page.getByLabel('تاریخ شروع')).toHaveValue('۱۴۰۱/۰۲/۱۸')
  await page.getByLabel('کد ملی').fill('۰۴۹۹۳۷۰۸۹۰')
  await page.getByRole('button', { name: 'ذخیره کارمند' }).click()
  await expect(page.getByText('رقم کنترل مطابقت ندارد')).toBeVisible()

  await page.getByRole('button', { name: 'English' }).click()
  await expect(html).toHaveAttribute('dir', 'ltr')
  await expect(page.getByRole('heading', { name: 'Edit employee' })).toBeVisible()
})

test('profile of unknown employee shows not found', async ({ page }) => {
  await page.goto('/#/employees/nope')
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
  await page.goto('/#/nothing-here')
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
})

test('layout holds at 360px without horizontal page scroll', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 })
  for (const p of ['/#/', '/#/employees', '/#/employees/emp-1001', '/#/employees/new', '/#/departments', '/#/data']) {
    await page.goto(p)
    await page.waitForLoadState('networkidle')
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow, p).toBeLessThanOrEqual(0)
  }
})
