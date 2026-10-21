import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { getResource } from '@/manifest'
import { DataTable } from './DataTable'

const persons = getResource('persons')
const rows = [
  { id: 7, firstName: 'Anna', lastName: 'Nowak', email: 'anna@example.com', birthDate: '1990-01-01', gender: 'FEMALE' },
]

function renderTable(onSortChange = vi.fn()) {
  render(
    <MemoryRouter>
      <DataTable
        resource={persons}
        rows={rows}
        sort={{ field: 'lastName', direction: 'asc' }}
        onSortChange={onSortChange}
        getRowHref={(row) => `/persons/${row.id}`}
      />
    </MemoryRouter>,
  )
  return onSortChange
}

describe('DataTable', () => {
  it('renders manifest columns with formatted values and marks the sorted column', () => {
    renderTable()
    const table = screen.getByRole('table')
    expect(within(table).getByRole('columnheader', { name: /Last name/ })).toHaveAttribute('aria-sort', 'ascending')
    expect(within(table).getByText('Jan 1, 1990')).toBeInTheDocument()
    expect(within(table).getByText('Female')).toBeInTheDocument()
    expect(within(table).getByRole('link', { name: 'Nowak' })).toHaveAttribute('href', '/persons/7')
  })

  it('toggles the direction of the sorted column and sorts another column ascending', async () => {
    const onSortChange = renderTable()
    await userEvent.click(screen.getByRole('button', { name: /Last name/ }))
    expect(onSortChange).toHaveBeenLastCalledWith({ field: 'lastName', direction: 'desc' })
    await userEvent.click(screen.getByRole('button', { name: /^Email/ }))
    expect(onSortChange).toHaveBeenLastCalledWith({ field: 'email', direction: 'asc' })
  })

  it('renders mobile cards from the primary and secondary columns', () => {
    renderTable()
    const card = screen.getAllByRole('link').find((link) => link.textContent?.includes('anna@example.com'))
    expect(card).toHaveTextContent('Nowak Annaanna@example.com')
    expect(card).toHaveAttribute('href', '/persons/7')
  })
})
