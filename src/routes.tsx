import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { Departments } from './pages/Departments'
import { EmployeeForm } from './pages/EmployeeForm'
import { Employees } from './pages/Employees'
import { ImportExport } from './pages/ImportExport'
import { NotFound } from './pages/NotFound'
import { Profile } from './pages/Profile'
import { Schedule } from './pages/Schedule'

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="employees" element={<Employees />} />
        <Route path="employees/new" element={<EmployeeForm />} />
        <Route path="employees/:id" element={<Profile />} />
        <Route path="employees/:id/edit" element={<EmployeeForm />} />
        <Route path="departments" element={<Departments />} />
        <Route path="data" element={<ImportExport />} />
        <Route path="schedule" element={<Schedule />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
