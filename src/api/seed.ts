// Fictional sample data. Every person, ID and number here is invented.
import { nationalIdCheckDigit } from '../domain/validators'
import type { Activity, Department, Employee, ShiftGroup, Status } from '../domain/types'

export const SEED_DEPARTMENTS: Department[] = [
  { id: 'dep-prod', name: 'Production', nameFa: 'تولید', headId: 'emp-1001' },
  { id: 'dep-ware', name: 'Warehouse', nameFa: 'انبار', headId: 'emp-1003' },
  { id: 'dep-admin', name: 'Administration', nameFa: 'اداری', headId: 'emp-1002' },
  { id: 'dep-sales', name: 'Sales', nameFa: 'فروش', headId: 'emp-1004' },
  { id: 'dep-maint', name: 'Maintenance', nameFa: 'تعمیرات', headId: 'emp-1005' },
]

type Row = [string, string, string, string, string, string, string, Status, ShiftGroup, string | null]
// given, surname, givenFa, surnameFa, title, titleFa, dept, status, group, start
const ROWS: Row[] = [
  ['Mahdi', 'Karimi', 'مهدی', 'کریمی', 'Line supervisor', 'سرپرست خط', 'dep-prod', 'active', 'A', '2019-03-12'],
  ['Zahra', 'Mousavi', 'زهرا', 'موسوی', 'HR officer', 'کارشناس منابع انسانی', 'dep-admin', 'active', 'none', '2020-09-01'],
  ['Ali', 'Rezaei', 'علی', 'رضایی', 'Forklift operator', 'اپراتور لیفتراک', 'dep-ware', 'leave', 'B', '2021-01-17'],
  ['Narges', 'Ahmadi', 'نرگس', 'احمدی', 'Account manager', 'مدیر حساب', 'dep-sales', 'active', 'none', '2022-05-08'],
  ['Hossein', 'Jafari', 'حسین', 'جعفری', 'Technician', 'تکنسین', 'dep-maint', 'active', 'A', '2018-11-24'],
  ['Maryam', 'Sadeghi', 'مریم', 'صادقی', 'Operator', 'اپراتور', 'dep-prod', 'active', 'A', '2023-02-13'],
  ['Reza', 'Naderi', 'رضا', 'نادری', 'Storekeeper', 'انباردار', 'dep-ware', 'inactive', 'C', '2017-07-02'],
  ['Sara', 'Hosseini', 'سارا', 'حسینی', 'Accountant', 'حسابدار', 'dep-admin', 'active', 'none', null],
  ['Farhad', 'Azizi', 'فرهاد', 'عزیزی', 'Operator', 'اپراتور', 'dep-prod', 'active', 'B', '2020-02-03'],
  ['Leila', 'Bagheri', 'لیلا', 'باقری', 'Quality inspector', 'بازرس کیفیت', 'dep-prod', 'active', 'B', '2021-06-21'],
  ['Kaveh', 'Tehrani', 'کاوه', 'تهرانی', 'Operator', 'اپراتور', 'dep-prod', 'active', 'C', '2022-09-10'],
  ['Parisa', 'Behzadi', 'پریسا', 'بهزادی', 'Operator', 'اپراتور', 'dep-prod', 'leave', 'A', '2019-12-14'],
  ['Omid', 'Jalili', 'امید', 'جلیلی', 'Machine setter', 'تنظیم‌کار دستگاه', 'dep-prod', 'active', 'C', '2018-04-28'],
  ['Shirin', 'Dehghan', 'شیرین', 'دهقان', 'Operator', 'اپراتور', 'dep-prod', 'active', 'B', '2024-01-20'],
  ['Behrouz', 'Rahimi', 'بهروز', 'رحیمی', 'Warehouse clerk', 'کارمند انبار', 'dep-ware', 'active', 'A', '2020-08-16'],
  ['Mina', 'Zarei', 'مینا', 'زارعی', 'Loader', 'باربر', 'dep-ware', 'active', 'B', '2022-03-05'],
  ['Davood', 'Karami', 'داوود', 'کرمی', 'Logistics coordinator', 'هماهنگ‌کننده لجستیک', 'dep-ware', 'leave', 'C', '2019-10-09'],
  ['Elham', 'Farhadi', 'الهام', 'فرهادی', 'Office assistant', 'دستیار اداری', 'dep-admin', 'active', 'none', '2023-07-02'],
  ['Babak', 'Sharifi', 'بابک', 'شریفی', 'Purchasing officer', 'کارشناس خرید', 'dep-admin', 'active', 'none', '2021-04-12'],
  ['Pegah', 'Moradi', 'پگاه', 'مرادی', 'Sales representative', 'نماینده فروش', 'dep-sales', 'active', 'none', '2023-09-18'],
  ['Omran', 'Kazemi', 'عمران', 'کاظمی', 'Sales representative', 'نماینده فروش', 'dep-sales', 'active', 'none', '2020-11-30'],
  ['Niloofar', 'Yazdani', 'نیلوفر', 'یزدانی', 'Customer support', 'پشتیبانی مشتریان', 'dep-sales', 'active', 'none', '2022-12-26'],
  ['Kourosh', 'Mehrabi', 'کوروش', 'مهرابی', 'Electrician', 'برق‌کار', 'dep-maint', 'active', 'C', '2019-05-22'],
  ['Mojtaba', 'Soltani', 'مجتبی', 'سلطانی', 'Mechanic', 'مکانیک', 'dep-maint', 'active', 'A', '2021-08-08'],
]

function nid(i: number): string {
  const base = String(1000000 + i * 7919).padStart(9, '0')
  return base + nationalIdCheckDigit(base)
}

export function buildSeedEmployees(): Employee[] {
  return ROWS.map((r, i) => {
    const no = 1001 + i
    // Reza Naderi (index 6) deliberately has a wrong check digit so the dashboard shows an attention item.
    const good = nid(i + 1)
    const nationalId = i === 6 ? good.slice(0, 9) + String((Number(good[9]) + 1) % 10) : good
    const e: Employee = {
      id: `emp-${no}`,
      givenName: r[0],
      surname: r[1],
      givenNameFa: r[2],
      surnameFa: r[3],
      jobTitle: r[4],
      jobTitleFa: r[5],
      departmentId: r[6],
      status: r[7],
      shiftGroup: r[8],
      startDate: r[9],
      nationalId,
      personnelNo: `P-${no}`,
      history: r[9] ? [{ at: r[9], kind: 'created' }] : [],
    }
    if (i === 0) {
      e.history.push({ at: '2022-02-14', kind: 'title', to: 'Line supervisor' }, { at: '2023-06-03', kind: 'shift', from: 'B', to: 'A' }, { at: '2024-01-20', kind: 'status', to: 'active' })
    }
    return e
  })
}

export function buildSeedActivity(now: Date): Activity[] {
  const ago = (days: number) => new Date(now.getTime() - days * 86_400_000).toISOString()
  return [
    { id: 'act-1', at: ago(0), kind: 'updated', subject: 'Zahra Mousavi', subjectFa: 'زهرا موسوی' },
    { id: 'act-2', at: ago(1), kind: 'imported', subject: '6', subjectFa: '6', source: 'staff-2026.csv' },
    { id: 'act-3', at: ago(5), kind: 'updated', subject: 'Reza Naderi', subjectFa: 'رضا نادری' },
  ]
}
