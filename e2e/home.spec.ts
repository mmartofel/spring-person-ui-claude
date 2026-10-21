import { expect, test } from '@playwright/test'

test('placeholder home page renders without horizontal scroll', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()))

  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1, name: 'Person UI' })).toBeVisible()
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(overflow).toBe(false)
  expect(errors).toEqual([])
})
