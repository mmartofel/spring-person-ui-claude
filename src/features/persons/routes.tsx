import { Outlet, type RouteObject } from 'react-router'
import { RequireRole } from '@/auth'
import { getResource } from '@/manifest'

const persons = getResource('persons')

// Pages load lazily; read routes need a read role, create and edit need a write role (ui-manifest.yaml).
export const personsRoutes: RouteObject[] = [
  {
    path: persons.route,
    element: (
      <RequireRole roles={persons.permissions.read}>
        <Outlet />
      </RequireRole>
    ),
    children: [
      { index: true, lazy: () => import('./PersonsListPage').then((m) => ({ Component: m.PersonsListPage })) },
      { path: ':id', lazy: () => import('./PersonDetailPage').then((m) => ({ Component: m.PersonDetailPage })) },
      {
        element: (
          <RequireRole roles={persons.permissions.write}>
            <Outlet />
          </RequireRole>
        ),
        children: [
          { path: 'new', lazy: () => import('./PersonFormPage').then((m) => ({ Component: m.PersonCreatePage })) },
          { path: ':id/edit', lazy: () => import('./PersonFormPage').then((m) => ({ Component: m.PersonEditPage })) },
        ],
      },
    ],
  },
]
