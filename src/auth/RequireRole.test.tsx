import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { RequireRole } from './RequireRole'

const roles = vi.hoisted(() => ({ current: [] as string[] }))
vi.mock('./roles', () => ({ useRoles: () => roles.current }))

function renderGuard() {
  render(
    <MemoryRouter>
      <RequireRole roles={['person-viewer', 'person-editor']}>
        <p>secret</p>
      </RequireRole>
    </MemoryRouter>,
  )
}

describe('RequireRole', () => {
  it('renders the children for a user with one of the roles', () => {
    roles.current = ['person-viewer']
    renderGuard()
    expect(screen.getByText('secret')).toBeInTheDocument()
  })

  it('renders the 403 page otherwise', () => {
    roles.current = ['offline_access']
    renderGuard()
    expect(screen.queryByText('secret')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Access denied' })).toBeInTheDocument()
  })
})
