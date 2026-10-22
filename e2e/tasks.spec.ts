import { expect, test, type Page } from '@playwright/test'
import { authFile, openAs } from './support/auth.ts'
import { callApi, deleteViaApi, expectListParams, unique } from './support/data.ts'

// Detail URLs of records created by the current test; afterEach deletes them newest first (tasks before the persons
// they reference) even when the test fails.
let created: string[] = []

async function createPersonViaApi(page: Page, firstName: string, lastName: string) {
  const email = `${firstName}.${lastName}@example.com`.toLowerCase()
  const person = await callApi(page, 'POST', '/persons', { firstName, lastName, email })
  created.push(`/persons/${person!.id}`)
  return person!.id
}

async function createTaskViaApi(page: Page, title: string, extra: object = {}) {
  const task = await callApi(page, 'POST', '/tasks', { title, ...extra })
  created.push(`/tasks/${task!.id}`)
  return task!.id
}

/** Picks a record in a relation combobox by searching for it. */
async function pickRelation(page: Page, combobox: ReturnType<Page['getByRole']>, search: string, option: string) {
  await combobox.click()
  await page.getByRole('dialog').getByPlaceholder('Search…').fill(search)
  await page.getByRole('option', { name: option }).click()
}

test.beforeEach(() => {
  created = []
})

test.afterEach(async ({ page }) => {
  if (created.length && !page.url().startsWith('http://localhost:5173')) await openAs(page)
  for (const url of created.toReversed()) await deleteViaApi(page, url)
})

test.describe('tasks as editor', () => {
  test.use({ storageState: authFile('editor') })

  test('editor creates a task with every input type, a relation and defaults, then edits it', async ({ page }) => {
    const id = unique()
    await openAs(page, '/tasks')
    await createPersonViaApi(page, 'Tia', `Owner${id}`)

    await page.getByRole('link', { name: 'New', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'New task' })).toBeVisible()
    // Contract defaults: priority MEDIUM, done false.
    await expect(page.getByRole('combobox', { name: 'Priority' })).toHaveText('Medium')
    await expect(page.getByRole('checkbox', { name: 'Done' })).not.toBeChecked()

    const title = `Report ${id}`
    await page.getByLabel('Title').fill(title)
    await page.getByLabel('Description').fill('First line\nSecond line')
    await page.getByRole('combobox', { name: 'Priority' }).click()
    await page.getByRole('option', { name: 'High' }).click()
    await expect(page.getByLabel('Estimate (hours)')).toHaveAttribute('step', '0.5')
    await page.getByLabel('Estimate (hours)').fill('2.5')
    await page.getByLabel('Due date').fill('2026-11-15')
    await pickRelation(page, page.getByRole('combobox', { name: 'Assignee' }), `Owner${id}`, `Tia Owner${id}`)
    await page.getByRole('checkbox', { name: 'Done' }).check()
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible()
    created.push(new URL(page.url()).pathname)
    await expect(page.getByText('High', { exact: true })).toBeVisible()
    await expect(page.getByText('Done', { exact: true }).last()).toBeVisible()
    await expect(page.getByText('2.5', { exact: true })).toBeVisible()
    await expect(page.getByText('Second line')).toBeVisible()
    const assignee = page.getByRole('link', { name: `Tia Owner${id}` })
    await expect(assignee).toBeVisible()

    // Edit: the relation starts from the record, server-set fields are shown but not editable; clear the assignee.
    await page.getByRole('link', { name: 'Edit' }).click()
    await expect(page.getByRole('combobox', { name: 'Assignee' })).toHaveText(`Tia Owner${id}`)
    await expect(page.getByText('Created', { exact: true })).toBeVisible()
    await expect(page.getByText('Last changed', { exact: true })).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'Created' })).toHaveCount(0)
    await page.getByRole('combobox', { name: 'Assignee' }).click()
    await page.getByRole('option', { name: '— none —' }).click()
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible()
    await expect(page.getByRole('link', { name: `Tia Owner${id}` })).toHaveCount(0)
    await expect(page.getByText('Assignee').locator('xpath=following-sibling::dd[1]')).toHaveText('Not provided')
  })

  test('an estimate outside the contract limits is rejected on the field and nothing is saved', async ({ page }) => {
    await openAs(page, '/tasks/new')
    await page.getByLabel('Title').fill(`Estimate ${unique()}`)
    await page.getByLabel('Estimate (hours)').fill('0.3')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByLabel('Estimate (hours)')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByText('Enter a value of at least 0.5.')).toBeVisible()

    await page.getByLabel('Estimate (hours)').fill('1.25')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Enter a multiple of 0.5.')).toBeVisible()
    await expect(page).toHaveURL('/tasks/new')
  })

  // Regression for Person API 3.4.0, where this PUT saved the change but answered 500 (fixed in 3.4.1).
  test('changing the assignee of a saved task saves it, and the next save works too', async ({ page }) => {
    const id = unique()
    await openAs(page, '/tasks')
    const first = await createPersonViaApi(page, 'Ada', `First${id}`)
    await createPersonViaApi(page, 'Bo', `Second${id}`)
    const taskId = await createTaskViaApi(page, `Move ${id}`, { assigneeId: first })

    await page.goto(`/tasks/${taskId}/edit`)
    // Enter picks the first match of the search.
    await page.getByRole('combobox', { name: 'Assignee' }).click()
    await page.getByRole('dialog').getByPlaceholder('Search…').fill(`Second${id}`)
    await expect(page.getByRole('option')).toHaveCount(1)
    await page.keyboard.press('Enter')
    await expect(page.getByRole('combobox', { name: 'Assignee' })).toHaveText(`Bo Second${id}`)
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText(`Move ${id} was saved.`)).toBeVisible()
    await expect(page.getByRole('link', { name: `Bo Second${id}` })).toBeVisible()

    // Saving again starts from the new version: no stale-version dialog.
    await page.getByRole('link', { name: 'Edit' }).click()
    await page.getByLabel('Title').fill(`Moved ${id}`)
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('heading', { level: 1, name: `Moved ${id}` })).toBeVisible()
    await expect(page.getByRole('alertdialog')).toHaveCount(0)
  })

  test('task filters (done, priority, assignee) are kept in the URL and can be cleared', async ({ page, isMobile }) => {
    test.skip(isMobile, 'filters are a row from md')
    const tag = `Tf${unique()}`
    await openAs(page, '/tasks')
    const ownerId = await createPersonViaApi(page, 'Flo', tag)
    await createTaskViaApi(page, `${tag} open high`, { priority: 'HIGH', assigneeId: ownerId })
    await createTaskViaApi(page, `${tag} done high`, { priority: 'HIGH', done: true, assigneeId: ownerId })
    await createTaskViaApi(page, `${tag} open low`, { priority: 'LOW' })
    await page.goto(`/tasks?q=${tag}`)
    const table = page.getByRole('table')
    await expect(table.getByRole('row')).toHaveCount(4)
    await expect(table.getByRole('link', { name: `Flo ${tag}` })).toHaveCount(2)

    const filters = page.getByRole('group', { name: 'Filters' })
    // Keyboard: Enter after a search picks the first match.
    await filters.getByRole('combobox', { name: 'Assignee' }).click()
    await page.getByRole('dialog').getByPlaceholder('Search…').fill(tag)
    await expect(page.getByRole('option')).toHaveCount(1)
    await expect(page.getByRole('option', { name: `Flo ${tag}` })).toHaveAttribute('aria-selected', 'true')
    await page.keyboard.press('Enter')
    await expectListParams(page, { q: tag, assigneeId: String(ownerId) })
    await expect(table.getByRole('row')).toHaveCount(3)

    await filters.getByRole('combobox', { name: 'State' }).click()
    await page.getByRole('option', { name: 'Done' }).click()
    await expectListParams(page, { q: tag, assigneeId: String(ownerId), done: 'true' })
    await expect(table.getByRole('row')).toHaveCount(2)
    await expect(table).toContainText(`${tag} done high`)

    // After a reload the assignee filter shows the person's name, loaded by id.
    await page.reload()
    await expect(filters.getByRole('combobox', { name: 'Assignee' })).toHaveText(`Flo ${tag}`)
    await expect(table.getByRole('row')).toHaveCount(2)

    await filters.getByRole('button', { name: 'Clear filters' }).click()
    await filters.getByRole('combobox', { name: 'Priority' }).click()
    await page.getByRole('option', { name: 'Low' }).click()
    await expectListParams(page, { q: tag, priority: 'LOW' })
    await expect(table.getByRole('row')).toHaveCount(2)
    await expect(table).toContainText(`${tag} open low`)
  })

  test("a person's tasks are listed on the person page and link to the filtered task list", async ({ page }) => {
    const tag = `Rel${unique()}`
    await openAs(page, '/tasks')
    const ownerId = await createPersonViaApi(page, 'Rae', tag)
    await createTaskViaApi(page, `${tag} first`, { assigneeId: ownerId })
    await createTaskViaApi(page, `${tag} second`, { assigneeId: ownerId, done: true })

    await page.goto(`/persons/${ownerId}`)
    await expect(page.getByRole('heading', { level: 2, name: 'Tasks (2)' })).toBeVisible()
    await expect(page.getByRole('link', { name: new RegExp(`${tag} second`) })).toContainText('Done')
    await page.getByRole('link', { name: /^Show all/ }).click()
    await expectListParams(page, { assigneeId: String(ownerId) })
    await expect(page.getByRole('link', { name: new RegExp(`${tag} first`) })).toBeVisible()
  })

  test('a person who still has tasks cannot be deleted and the reason is shown', async ({ page }) => {
    const tag = `Use${unique()}`
    await openAs(page, '/tasks')
    const ownerId = await createPersonViaApi(page, 'Ugo', tag)
    await createTaskViaApi(page, `${tag} task`, { assigneeId: ownerId })

    await page.goto(`/persons/${ownerId}`)
    await page.getByRole('button', { name: 'Delete' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click()
    await expect(page.getByText(`Ugo ${tag} is still used by other records and was not deleted.`)).toBeVisible()
    await expect(page).toHaveURL(`/persons/${ownerId}`)
    await expect(page.getByRole('heading', { level: 1, name: `Ugo ${tag}` })).toBeVisible()
  })
})

test.describe('tasks as viewer', () => {
  test.use({ storageState: authFile('viewer') })

  test('viewer sees tasks without write actions and cannot open the form', async ({ page }) => {
    await openAs(page, '/tasks')
    await expect(page.getByRole('heading', { level: 1, name: 'Tasks' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'New', exact: true })).toHaveCount(0)
    await page.goto('/tasks/new')
    await expect(page.getByRole('heading', { level: 1, name: 'Access denied' })).toBeVisible()
  })
})
