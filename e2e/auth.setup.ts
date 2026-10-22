import { test as setup } from '@playwright/test'
import { authFile, loginAs, type DemoUser } from './support/auth.ts'

// Signs in each demo user once through the Keycloak form and saves the browser state (its Keycloak session cookie).
for (const user of ['editor', 'viewer'] satisfies DemoUser[]) {
  setup(`sign in as ${user}`, async ({ page }) => {
    await loginAs(page, user)
    await page.context().storageState({ path: authFile(user) })
  })
}
