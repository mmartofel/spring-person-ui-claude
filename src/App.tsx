import { Route, Routes } from 'react-router'
import { RequireAuth, RequireRole } from '@/auth'
import { AppShell } from '@/components/app/AppShell'
import { HomeRedirect } from '@/components/app/HomeRedirect'
import { NotFoundPage } from '@/components/app/NotFoundPage'
import { PersonsPlaceholderPage } from '@/features/persons/PersonsPlaceholderPage'
import { getResource } from '@/manifest'

const persons = getResource('persons')

export default function App() {
  return (
    <Routes>
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<HomeRedirect />} />
        <Route
          path={persons.route}
          element={
            <RequireRole roles={persons.permissions.read}>
              <PersonsPlaceholderPage />
            </RequireRole>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
