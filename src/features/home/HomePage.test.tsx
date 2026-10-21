import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { HomePage } from './HomePage'

describe('HomePage', () => {
  it('renders the heading and the persons link', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Person UI' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Persons' })).toHaveAttribute('href', '/persons')
  })
})
