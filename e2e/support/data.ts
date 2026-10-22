import { expect, type Page } from '@playwright/test'

// Test data through the API, with the signed-in user's token. Shared by the resource specs.

/** Unique per run so tests never collide with existing data or with each other. */
export const unique = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`

/** Calls the API with the signed-in user's token (the page must be on the app). */
export async function callApi(page: Page, method: string, path: string, body?: object) {
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

/** Deletes through the API, so cleanup never depends on the UI state. */
export async function deleteViaApi(page: Page, detailUrl: string) {
  await callApi(page, 'DELETE', detailUrl).catch(() => {})
}

/** Checks the list state in the URL: exactly these search params (defaults are left out). */
export async function expectListParams(page: Page, params: Record<string, string>) {
  await expect.poll(() => Object.fromEntries(new URL(page.url()).searchParams)).toEqual(params)
}

