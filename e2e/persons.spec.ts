import { expect, test, type Page } from '@playwright/test'
import { authFile, openAs } from './support/auth.ts'

// Unique per run so tests never collide with existing data or with each other.
const unique = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`

// Detail URLs of persons created by the current test; afterEach deletes them even when the test fails.
let created: string[] = []

/** Creates a person through the UI and returns its detail URL. */
async function createPerson(page: Page, firstName: string, lastName: string, email: string) {
  await page.goto('/persons/new')
  await page.getByLabel('First name').fill(firstName)
  await page.getByLabel('Last name').fill(lastName)
  await page.getByLabel('Email').fill(email)
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('heading', { level: 1, name: `${firstName} ${lastName}` })).toBeVisible()
  const url = new URL(page.url()).pathname
  created.push(url)
  return url
}

/** Calls the API with the signed-in user's token (the page must be on the app). */
async function callApi(page: Page, method: string, path: string, body?: object) {
  return page.evaluate(
    async ({ method, path, body }) => {
      const key = Object.keys(sessionStorage).find((k) => k.startsWith('oidc.user:'))
      const token = key ? JSON.parse(sessionStorage.getItem(key)!).access_token : ''
      const response = await fetch(`/api${path}`, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: body && JSON.stringify(body),
      })
      if (!response.ok) throw new Error(`${method} ${path}: ${response.status}`)
      return response.status === 204 ? undefined : ((await response.json()) as { id: number })
    },
    { method, path, body },
  )
}

/** Creates a person through the API (fast test data) and returns its detail URL. */
async function createViaApi(page: Page, firstName: string, lastName: string, extra: object = {}) {
  const email = `${firstName}.${lastName}@example.com`.toLowerCase()
  const person = await callApi(page, 'POST', '/persons', { firstName, lastName, email, ...extra })
  const url = `/persons/${person!.id}`
  created.push(url)
  return url
}

/** Deletes through the API, so cleanup never depends on the UI state. */
async function deleteViaApi(page: Page, detailUrl: string) {
  await callApi(page, 'DELETE', detailUrl).catch(() => {})
}

/** Checks the list state in the URL: exactly these search params (defaults are left out). */
async function expectListParams(page: Page, params: Record<string, string>) {
  await expect.poll(() => Object.fromEntries(new URL(page.url()).searchParams)).toEqual(params)
}

test.beforeEach(() => {
  created = []
})

test.afterEach(async ({ page }) => {
  if (created.length && !page.url().startsWith('http://localhost:5173')) await openAs(page)
  for (const url of created) await deleteViaApi(page, url)
})

test.describe('persons as editor', () => {
  test.use({ storageState: authFile('editor') })

  test('editor creates, edits and deletes a person', async ({ page }) => {
    const id = unique()
    const lastName = `E2e${id}`
    await openAs(page, '/persons')

    await page.getByRole('link', { name: 'New' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'New person' })).toBeVisible()
    await page.getByLabel('First name').fill('Anna')
    await page.getByLabel('Last name').fill(lastName)
    await page.getByLabel('Email').fill(`anna.${id}@example.com`)
    await page.getByLabel('Date of birth').fill('1990-01-15')
    await page.getByRole('combobox', { name: 'Gender' }).click()
    await page.getByRole('option', { name: 'Female' }).click()
    await page.getByRole('button', { name: 'Save' }).click()

    // Detail page of the new record.
    await expect(page.getByRole('heading', { level: 1, name: `Anna ${lastName}` })).toBeVisible()
    created.push(new URL(page.url()).pathname)
    await expect(page.getByText(`Anna ${lastName} was created.`)).toBeVisible()
    await expect(page.getByText('Jan 15, 1990')).toBeVisible()
    await expect(page.getByText('Female')).toBeVisible()

    // Edit: rename and clear the optional date (PUT replaces the record).
    await page.getByRole('link', { name: 'Edit' }).click()
    await page.getByLabel('First name').fill('Anne')
    await page.getByLabel('Date of birth').fill('')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('heading', { level: 1, name: `Anne ${lastName}` })).toBeVisible()
    await expect(page.getByText('Date of birth').locator('xpath=following-sibling::dd[1]')).toHaveText('Not provided')

    // Delete with a confirmation that names the person; cancelling returns focus to the Delete button.
    await page.getByRole('button', { name: 'Delete' }).click()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'Delete' })).toBeFocused()
    await page.getByRole('button', { name: 'Delete' }).click()
    const dialog = page.getByRole('alertdialog', { name: `Delete Anne ${lastName}?` })
    await dialog.getByRole('button', { name: 'Delete' }).click()
    await expect(page).toHaveURL('/persons')
    await expect(page.getByText(`Anne ${lastName} was deleted.`)).toBeVisible()

    await page.getByRole('searchbox').fill(lastName)
    await expect(page.getByText(`No results for “${lastName}”.`)).toBeVisible()
  })

  test('create shows translated validation errors and saves nothing', async ({ page }) => {
    await openAs(page, '/persons/new')

    await page.getByLabel('Email').fill('not-an-email')
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByLabel('First name')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByText('This field is required.')).toHaveCount(2)
    await expect(page.getByText('Enter a valid email address.')).toBeVisible()
    await expect(page).toHaveURL('/persons/new')
  })

  test('leaving a form with unsaved changes asks first', async ({ page, isMobile }) => {
    test.skip(isMobile, 'uses the sidebar link')
    await openAs(page, '/persons/new')

    await page.getByLabel('First name').fill('Draft')
    await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Persons' }).click()

    const dialog = page.getByRole('alertdialog', { name: 'Leave without saving?' })
    await dialog.getByRole('button', { name: 'Stay' }).click()
    await expect(page).toHaveURL('/persons/new')
    await expect(page.getByLabel('First name')).toHaveValue('Draft')

    await page.getByRole('link', { name: 'Cancel' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Leave' }).click()
    await expect(page).toHaveURL('/persons')
  })

  test('a duplicate email is shown on the email field, in the current language', async ({ page }) => {
    const id = unique()
    const email = `dup.${id}@example.com`
    await openAs(page)
    const url = await createPerson(page, 'First', `Dup${id}`, email)

    await page.goto('/persons/new')
    await page.getByLabel('First name').fill('Second')
    await page.getByLabel('Last name').fill(`Dup${id}`)
    await page.getByLabel('Email').fill(email)
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByLabel('Email')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByLabel('Email')).toBeFocused()
    await expect(page.getByText('This value is already in use.')).toBeVisible()
    await expect(page).toHaveURL('/persons/new')

    // The server error is translated from its code, so it follows a language switch.
    await page.getByRole('button', { name: /^EN – language/ }).click()
    await page.getByRole('menuitemradio', { name: 'Polski' }).click()
    await expect(page.getByText('Ta wartość jest już zajęta.')).toBeVisible()

    expect(created).toEqual([url])
  })

  test('a birth date in the future is rejected by the API with a translated message', async ({ page }) => {
    await openAs(page, '/persons/new')
    const nextYear = new Date().getFullYear() + 1

    await page.getByLabel('First name').fill('Future')
    await page.getByLabel('Last name').fill(`Born${unique()}`)
    await page.getByLabel('Email').fill(`future.${unique()}@example.com`)
    await page.getByLabel('Date of birth').fill(`${nextYear}-01-01`)
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByLabel('Date of birth')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByText('Enter a date in the past.')).toBeVisible()
    await expect(page).toHaveURL('/persons/new')
  })

  test('saving over a newer version offers to reload the record', async ({ page, browser }) => {
    const id = unique()
    await openAs(page)
    const url = await createPerson(page, 'Stale', `Ver${id}`, `stale.${id}@example.com`)
    await page.goto(`${url}/edit`)

    // Someone else saves the same record in another session.
    const otherContext = await browser.newContext({ storageState: authFile('editor') })
    const other = await otherContext.newPage()
    await openAs(other, `${url}/edit`)
    await other.getByLabel('First name').fill('Newer')
    await other.getByRole('button', { name: 'Save' }).click()
    await expect(other.getByRole('heading', { level: 1, name: `Newer Ver${id}` })).toBeVisible()
    await otherContext.close()

    // Returning to the tab refetches the record in the background; the form must keep the version it started from.
    const refetch = page.waitForResponse((r) => r.url().endsWith(url.replace('/persons', '/api/persons')) && r.ok())
    await page.evaluate(() => window.dispatchEvent(new Event('visibilitychange')))
    await refetch

    await page.getByLabel('First name').fill('Older')
    await page.getByRole('button', { name: 'Save' }).click()
    const dialog = page.getByRole('alertdialog', { name: 'This record was changed' })
    await dialog.getByRole('button', { name: 'Reload' }).click()
    await expect(page.getByLabel('First name')).toHaveValue('Newer')
  })

  test('search, page size, sorting and paging are kept in the URL', async ({ page, isMobile }) => {
    test.skip(isMobile, 'sorts with the table headers, shown from md')
    const tag = `Pag${unique()}`
    await openAs(page, '/persons')
    for (let i = 0; i <= 10; i++) await createViaApi(page, `P${String(i).padStart(2, '0')}`, tag)
    const firstRow = page.getByRole('table').getByRole('row').nth(1)

    await page.getByRole('searchbox').fill(tag)
    await expectListParams(page, { q: tag })
    await page.getByLabel('Rows per page').click()
    await page.getByRole('option', { name: '10', exact: true }).click()
    await expectListParams(page, { q: tag, size: '10' })
    await expect(page.getByText('1–10 of 11')).toBeVisible()

    await page.getByRole('button', { name: 'First name' }).click()
    await page.getByRole('button', { name: 'First name' }).click()
    await expectListParams(page, { q: tag, size: '10', sort: 'firstName,desc' })
    await expect(firstRow).toContainText('P10')

    await page.getByRole('button', { name: 'Next page' }).click()
    await expectListParams(page, { q: tag, size: '10', sort: 'firstName,desc', page: '1' })
    await expect(firstRow).toContainText('P00')

    // The state survives a reload and Back returns to the previous page.
    await page.reload()
    await expect(firstRow).toContainText('P00')
    await page.goBack()
    await expectListParams(page, { q: tag, size: '10', sort: 'firstName,desc' })
    await expect(firstRow).toContainText('P10')

    // A page past the end (an old link) moves to the last page.
    await page.goto(`/persons?q=${tag}&size=10&page=99`)
    await expectListParams(page, { q: tag, size: '10', page: '1' })
    await expect(page.getByText('11–11 of 11')).toBeVisible()
  })

  test('status, availability and address are saved and shown as a badge and an address block', async ({ page }) => {
    const id = unique()
    const lastName = `Addr${id}`
    await openAs(page, '/persons/new')

    // A new record starts with the contract default status.
    await expect(page.getByRole('combobox', { name: 'Status' })).toHaveText('Available')
    await page.getByLabel('First name').fill('Ola')
    await page.getByLabel('Last name').fill(lastName)
    await page.getByLabel('Email').fill(`ola.${id}@example.com`)
    await page.getByRole('combobox', { name: 'Status' }).click()
    await page.getByRole('option', { name: 'Unavailable' }).click()
    await page.getByLabel('Available from').fill('2026-03-01')
    await page.getByLabel('Available to').fill('2026-03-31')
    const address = page.getByRole('group', { name: 'Address' })
    await address.getByLabel('Street').fill('Floriańska 1')
    await address.getByLabel('Postal code').fill('31-019')
    await address.getByLabel('City').fill('Kraków')
    await address.getByRole('combobox', { name: 'Country' }).click()
    await page.getByPlaceholder('Search countries…').fill('pola')
    await page.getByRole('option', { name: 'Poland' }).click()
    await expect(address.getByRole('combobox', { name: 'Country' })).toHaveText('Poland')
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByRole('heading', { level: 1, name: `Ola ${lastName}` })).toBeVisible()
    created.push(new URL(page.url()).pathname)
    await expect(page.getByText('Unavailable')).toBeVisible()
    await expect(page.getByText('Mar 31, 2026')).toBeVisible()
    await expect(page.getByText('Address', { exact: true })).toBeVisible()
    await expect(page.getByText('Kraków')).toBeVisible()
    await expect(page.getByText('Poland')).toBeVisible()

    // Country names follow the UI language (Intl.DisplayNames), the stored code stays the same.
    await page.getByRole('button', { name: /^EN – language/ }).click()
    await page.getByRole('menuitemradio', { name: 'Polski' }).click()
    await expect(page.getByText('Polska')).toBeVisible()
    await expect(page.getByText('Niedostępna')).toBeVisible()

    // Emptying every address part removes the address.
    await page.getByRole('link', { name: 'Edytuj' }).click()
    const adres = page.getByRole('group', { name: 'Adres' })
    for (const label of ['Ulica', 'Kod pocztowy', 'Miasto']) await adres.getByLabel(label).fill('')
    await adres.getByRole('combobox', { name: 'Kraj' }).click()
    await page.getByRole('option', { name: '— brak —' }).click()
    await page.getByRole('button', { name: 'Zapisz' }).click()
    await expect(page.getByText('Kraków')).toHaveCount(0)
    await expect(page.getByText('Polska')).toHaveCount(0)
  })

  test('an availability end before its start is rejected on the field and nothing is saved', async ({ page }) => {
    await openAs(page, '/persons/new')
    await page.getByLabel('First name').fill('Range')
    await page.getByLabel('Last name').fill(`Range${unique()}`)
    await page.getByLabel('Email').fill(`range.${unique()}@example.com`)
    await page.getByLabel('Available from').fill('2026-05-10')
    await page.getByLabel('Available to').fill('2026-05-01')
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByLabel('Available to')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByText('The end date cannot be earlier than the start date.')).toBeVisible()
    await expect(page).toHaveURL('/persons/new')

    // Fixing the start date clears the error on the end date.
    await page.getByLabel('Available from').fill('2026-04-01')
    await expect(page.getByText('The end date cannot be earlier than the start date.')).toHaveCount(0)
  })

  test('list filters are kept in the URL, combine with search and can be cleared', async ({ page, isMobile }) => {
    test.skip(isMobile, 'filters are a row from md; the sheet is tested on mobile')
    const tag = `Flt${unique()}`
    await openAs(page, '/persons')
    await createViaApi(page, 'Pia', tag, { status: 'AVAILABLE', address: { city: 'Gdańsk', countryCode: 'PL' } })
    await createViaApi(page, 'Dirk', tag, {
      status: 'AVAILABLE',
      availableFrom: '2026-07-01',
      address: { city: 'Berlin', countryCode: 'DE' },
    })
    await createViaApi(page, 'Una', tag, { status: 'UNAVAILABLE', address: { countryCode: 'PL' } })
    await page.goto(`/persons?q=${tag}`)
    const table = page.getByRole('table')
    await expect(table.getByRole('row')).toHaveCount(4)
    await expect(table.getByRole('columnheader', { name: 'City' })).toBeVisible()
    await expect(table.getByText('Berlin')).toBeVisible()

    const filters = page.getByRole('group', { name: 'Filters' })
    await filters.getByRole('combobox', { name: 'Country' }).click()
    await page.getByPlaceholder('Search countries…').fill('Poland')
    await page.getByRole('option', { name: 'Poland' }).click()
    await expectListParams(page, { q: tag, countryCode: 'PL' })
    await expect(table.getByRole('row')).toHaveCount(3)

    await filters.getByRole('combobox', { name: 'Status' }).click()
    await page.getByRole('option', { name: 'Unavailable' }).click()
    await expectListParams(page, { q: tag, countryCode: 'PL', status: 'UNAVAILABLE' })
    await expect(table.getByRole('row')).toHaveCount(2)
    await expect(table).toContainText('Una')

    // The filters survive a reload.
    await page.reload()
    await expect(table.getByRole('row')).toHaveCount(2)
    await expect(filters.getByRole('combobox', { name: 'Status' })).toHaveText('Unavailable')

    await filters.getByRole('button', { name: 'Clear filters' }).click()
    await expectListParams(page, { q: tag })
    await expect(filters.getByRole('combobox', { name: 'Status' })).toBeFocused()
    await expect(filters.getByRole('combobox', { name: 'Country' })).toHaveText('Any')
    await expect(table.getByRole('row')).toHaveCount(4)

    // availableOn: AVAILABLE persons whose window contains the date (Dirk only from July).
    await filters.getByLabel('Available on').fill('2026-06-15')
    await expectListParams(page, { q: tag, availableOn: '2026-06-15' })
    await expect(table.getByRole('row')).toHaveCount(2)
    await expect(table).toContainText('Pia')

    // No match: the empty state says so and clears the filters.
    await filters.getByRole('combobox', { name: 'Status' }).click()
    await page.getByRole('option', { name: 'Unavailable' }).click()
    await expect(page.getByText('No records match the filters.')).toBeVisible()
    await page.getByRole('main').getByRole('button', { name: 'Clear filters' }).last().click()
    await expectListParams(page, { q: tag })
  })

  test('a filter value the contract rejects is ignored instead of failing the list', async ({ page }) => {
    const tag = `Bad${unique()}`
    await openAs(page, '/persons')
    await createViaApi(page, 'Bea', tag)
    const listCall = page.waitForResponse((r) => r.url().includes('/api/persons?'))
    await page.goto(`/persons?q=${tag}&status=SOMETIMES&countryCode=pl`)
    const response = await listCall
    expect(response.status()).toBe(200)
    expect(new URL(response.url()).searchParams.has('status')).toBe(false)
    await expect(page.getByRole('link', { name: new RegExp(tag) }).first()).toBeVisible()
  })

  test('on a 375 px screen the filters open in a sheet', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'the sheet is shown below md')
    await page.setViewportSize({ width: 375, height: 800 })
    const tag = `Sht${unique()}`
    await openAs(page, '/persons')
    await createViaApi(page, 'Sam', tag, { status: 'UNAVAILABLE' })
    await createViaApi(page, 'Sue', tag)
    await page.goto(`/persons?q=${tag}`)
    await expect(page.getByRole('link', { name: new RegExp(tag) })).toHaveCount(2)

    await page.getByRole('button', { name: 'Filters' }).click()
    const sheet = page.getByRole('dialog', { name: 'Filters' })
    await sheet.getByRole('combobox', { name: 'Status' }).click()
    await page.getByRole('option', { name: 'Unavailable' }).click()
    await expectListParams(page, { q: tag, status: 'UNAVAILABLE' })
    await sheet.getByRole('button', { name: 'Close filters' }).click()
    await expect(sheet).toBeHidden()

    await expect(page.getByRole('link', { name: new RegExp(tag) })).toHaveCount(1)
    await expect(page.getByRole('link', { name: `Sam ${tag}` })).toContainText('Unavailable')
    await expect(page.getByRole('button', { name: /Filters.*1 active/ })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  })

  test('on a 375 px screen the list shows cards titled by the display name', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'cards are shown below md')
    await page.setViewportSize({ width: 375, height: 800 })
    const tag = `Card${unique()}`
    await openAs(page, '/persons')
    const url = await createViaApi(page, 'Anna', tag)

    await page.goto(`/persons?q=${tag}`)
    const card = page.getByRole('link', { name: `Anna ${tag}` })
    await expect(card).toContainText(`anna.${tag.toLowerCase()}@example.com`)
    await expect(page.getByRole('table')).toBeHidden()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

    await card.click()
    await expect(page).toHaveURL(url)
    await expect(page.getByRole('heading', { level: 1, name: `Anna ${tag}` })).toBeVisible()
  })
})

test.describe('persons as viewer', () => {
  test.use({ storageState: authFile('viewer') })

  test('viewer sees no write actions and cannot open the form', async ({ page }) => {
    await openAs(page, '/persons')

    await expect(page.getByRole('heading', { level: 1, name: 'Persons' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'New' })).toHaveCount(0)

    await page.goto('/persons/new')
    await expect(page.getByRole('heading', { level: 1, name: 'Access denied' })).toBeVisible()
  })

  test('an unknown person id shows the 404 page', async ({ page }) => {
    await openAs(page, '/persons/999999999')
    await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible()
  })
})
