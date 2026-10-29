import { expect, test } from '@playwright/test'

test('app loads', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Kanban' })).toBeVisible()
})
