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
