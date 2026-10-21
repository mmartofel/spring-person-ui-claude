import { expect, test, type Page } from '@playwright/test'
import { loginAs } from './support/auth.ts'

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

/** Deletes through the API with the signed-in user's token, so cleanup never depends on the UI state. */
async function deleteViaApi(page: Page, detailUrl: string) {
  await page.evaluate(async (path) => {
    const key = Object.keys(sessionStorage).find((k) => k.startsWith('oidc.user:'))
    const token = key ? JSON.parse(sessionStorage.getItem(key)!).access_token : ''
    await fetch(`/api${path}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
  }, detailUrl)
}

test.beforeEach(() => {
  created = []
})

test.afterEach(async ({ page }) => {
  for (const url of created) await deleteViaApi(page, url)
})

test.describe('persons', () => {
  test('editor creates, edits and deletes a person', async ({ page }) => {
    const id = unique()
    const lastName = `E2e${id}`
    await loginAs(page, 'editor', '/persons')

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
    await expect(page.getByText('Not provided')).toBeVisible()

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
    await loginAs(page, 'editor', '/persons/new')

    await page.getByLabel('Email').fill('not-an-email')
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByLabel('First name')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByText('This field is required.')).toHaveCount(2)
    await expect(page.getByText('Enter a valid email address.')).toBeVisible()
    await expect(page).toHaveURL('/persons/new')
  })

  test('leaving a form with unsaved changes asks first', async ({ page, isMobile }) => {
    test.skip(isMobile, 'uses the sidebar link')
    await loginAs(page, 'editor', '/persons/new')

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

  test('viewer sees no write actions and cannot open the form', async ({ page }) => {
    await loginAs(page, 'viewer', '/persons')

    await expect(page.getByRole('heading', { level: 1, name: 'Persons' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'New' })).toHaveCount(0)

    await page.goto('/persons/new')
    await expect(page.getByRole('heading', { level: 1, name: 'Access denied' })).toBeVisible()
  })

  test('an unknown person id shows the 404 page', async ({ page }) => {
    await loginAs(page, 'viewer', '/persons/999999999')
    await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible()
  })

  test('a duplicate email is shown on the email field', async ({ page }) => {
    const id = unique()
    const email = `dup.${id}@example.com`
    await loginAs(page, 'editor')
    const url = await createPerson(page, 'First', `Dup${id}`, email)

    await page.goto('/persons/new')
    await page.getByLabel('First name').fill('Second')
    await page.getByLabel('Last name').fill(`Dup${id}`)
    await page.getByLabel('Email').fill(email)
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByLabel('Email')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByLabel('Email')).toBeFocused()
    await expect(page).toHaveURL('/persons/new')

    expect(created).toEqual([url])
  })

  test('saving over a newer version offers to reload the record', async ({ page, browser }) => {
    const id = unique()
    await loginAs(page, 'editor')
    const url = await createPerson(page, 'Stale', `Ver${id}`, `stale.${id}@example.com`)
    await page.goto(`${url}/edit`)

    // Someone else saves the same record in another session.
    const other = await browser.newPage()
    await loginAs(other, 'editor', `${url}/edit`)
    await other.getByLabel('First name').fill('Newer')
    await other.getByRole('button', { name: 'Save' }).click()
    await expect(other.getByRole('heading', { level: 1, name: `Newer Ver${id}` })).toBeVisible()
    await other.close()

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
})

