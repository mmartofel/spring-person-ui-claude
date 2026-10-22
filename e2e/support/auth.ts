import { expect, type Page } from '@playwright/test'

export type DemoUser = 'editor' | 'viewer'

/** Opens `path` and signs in through the Keycloak login form (demo users have password = username). */
export async function loginAs(page: Page, user: DemoUser, path = '/') {
  await page.goto(path)
  await page.waitForURL(/\/realms\/person\/protocol\/openid-connect\/auth/)
  await page.getByRole('textbox', { name: /username|nazwa użytkownika/i }).fill(user)
  await page.getByRole('textbox', { name: /password|hasło/i }).fill(user)
  await page.getByRole('button', { name: /sign in|logowanie/i }).click()
  await page.waitForURL((url) => url.origin === 'http://localhost:5173' && !url.searchParams.has('code'))
  await expect(page.getByRole('banner')).toBeVisible()
}

/** Saved browser state of a signed-in demo user, written by `e2e/auth.setup.ts`. */
export const authFile = (user: DemoUser) => `e2e/.auth/${user}.json`

/**
 * Opens `path` as the user whose storage state the test uses. The app keeps its tokens in sessionStorage, which
 * storage state does not save, but the Keycloak session cookie is saved: Keycloak redirects back without the form.
 */
export async function openAs(page: Page, path = '/') {
  await page.goto(path)
  await page.waitForURL((url) => url.origin === 'http://localhost:5173' && !url.searchParams.has('code'))
  await expect(page.getByRole('banner')).toBeVisible()
}
