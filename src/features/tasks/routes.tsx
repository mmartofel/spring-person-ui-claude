import { Outlet, type RouteObject } from 'react-router'
import { RequireRole } from '@/auth'
import { getResource } from '@/manifest'

const tasks = getResource('tasks')

// Pages load lazily; read routes need a read role, create and edit need a write role (ui-manifest.yaml).
export const tasksRoutes: RouteObject[] = [
  {
    path: tasks.route,
    element: (
      <RequireRole roles={tasks.permissions.read}>
        <Outlet />
      </RequireRole>
    ),
    children: [
      { index: true, lazy: () => import('./TasksListPage').then((m) => ({ Component: m.TasksListPage })) },
      { path: ':id', lazy: () => import('./TaskDetailPage').then((m) => ({ Component: m.TaskDetailPage })) },
      {
        element: (
          <RequireRole roles={tasks.permissions.write}>
            <Outlet />
          </RequireRole>
        ),
        children: [
          { path: 'new', lazy: () => import('./TaskFormPage').then((m) => ({ Component: m.TaskCreatePage })) },
          { path: ':id/edit', lazy: () => import('./TaskFormPage').then((m) => ({ Component: m.TaskEditPage })) },
        ],
      },
    ],
  },
]
