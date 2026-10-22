import { expect, test } from '@playwright/test'
import { authFile, loginAs, openAs } from './support/auth.ts'

// Tests that need the Keycloak form (login, logout, language passed to Keycloak) sign in with a fresh context.
test.describe('app shell', () => {
  test('an unauthenticated deep link returns to the same URL after login', async ({ page }) => {
    // List state that stays valid whatever the data (a page number could be clamped to the last page).
    await loginAs(page, 'editor', '/persons?sort=email%2Cdesc&q=nobody-e2e#top')

    await expect(page).toHaveURL('/persons?sort=email%2Cdesc&q=nobody-e2e#top')
    await expect(page.getByRole('heading', { level: 1, name: 'Persons' })).toBeVisible()
  })

  test('editor sees the sidebar navigation and their role, then logs out', async ({ page, isMobile }) => {
    test.skip(isMobile, 'the sidebar is shown from lg')
    await loginAs(page, 'editor')

    await expect(page).toHaveURL('/persons')
    await expect(
      page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Persons' }),
    ).toHaveAttribute('aria-current', 'page')

    await page.getByRole('button', { name: /user menu/i }).click()
    await expect(page.getByRole('menu')).toContainText('Demo Editor')
    await expect(page.getByRole('menu')).toContainText(/Roles\s*Editor/)
    await page.getByRole('menuitem', { name: 'Log out' }).click()

    await page.waitForURL(/\/realms\/person\/protocol\/openid-connect\/auth/)
  })

  test('the language switch is remembered and passed to Keycloak', async ({ page }) => {
    await loginAs(page, 'viewer')

    await page.getByRole('button', { name: /^EN – language/ }).click()
    await page.getByRole('menuitemradio', { name: 'Polski' }).click()

    await expect(page.getByRole('heading', { level: 1, name: 'Osoby' })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'pl')
    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: 'Osoby' })).toBeVisible()

    await page.getByRole('button', { name: /menu użytkownika/i }).click()
    await page.getByRole('menuitem', { name: 'Wyloguj' }).click()
    await page.waitForURL(/ui_locales=pl/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/zaloguj/i)
  })

  test('a failed Keycloak callback offers a new sign-in that lands in the app', async ({ page }) => {
    await page.goto('/?error=access_denied&state=bogus')

    await expect(page.getByRole('heading', { level: 1, name: 'Sign-in failed' })).toBeVisible()
    await page.getByRole('button', { name: 'Sign in again' }).click()
    await page.getByRole('textbox', { name: /username/i }).fill('viewer')
    await page.getByRole('textbox', { name: /password/i }).fill('viewer')
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page).toHaveURL('/persons')
    await expect(page.getByRole('heading', { level: 1, name: 'Persons' })).toBeVisible()
  })
})

// Tests that only need a signed-in user reuse the saved viewer session.
test.describe('app shell as viewer', () => {
  test.use({ storageState: authFile('viewer') })

  test('viewer sees the viewer role', async ({ page }) => {
    await openAs(page)

    await page.getByRole('button', { name: /user menu/i }).click()
    await expect(page.getByRole('menu')).toContainText(/Roles\s*Viewer/)
    await expect(page.getByRole('menu')).not.toContainText(/Roles\s*Editor/)
  })

  test('an unknown route shows the 404 page', async ({ page }) => {
    await openAs(page, '/no-such-page')

    await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible()
    await page.getByRole('link', { name: 'Back to start' }).click()
    await expect(page).toHaveURL('/persons')
  })

  test('on mobile the menu button opens the navigation sheet', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'the sheet menu is used below lg')
    await openAs(page, '/no-such-page')

    await page.getByRole('button', { name: 'Open menu' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('link', { name: 'Persons' }).click()

    await expect(dialog).toBeHidden()
    await expect(page).toHaveURL('/persons')
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(overflow).toBe(false)
  })
})
