import { AxeBuilder } from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

/** Scans the page with axe (WCAG 2.2 A and AA rules) and fails with a readable list. */
async function expectNoViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze()
  const summary = violations.map(
    (v) =>
      `${v.id} (${v.impact}): ${v.help}\n    ${v.nodes.map((n) => n.target.join(' ')).join('\n    ')}`,
  )
  expect(summary, summary.join('\n')).toEqual([])
}

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} mode`, () => {
    test.use({ colorScheme })

    test('board', async ({ page }) => {
      await page.goto('/')
      await expect(page.getByRole('region', { name: 'To do' })).toBeVisible()
      await expectNoViolations(page)
    })

    test('card dialog', async ({ page }) => {
      await page.goto('/')
      await page.getByRole('button', { name: 'Pick an icon set', exact: true }).click()
      await expect(page.getByRole('dialog', { name: 'Edit card' })).toBeVisible()
      await expectNoViolations(page)
    })

    test('keyboard drag in progress', async ({ page }) => {
      await page.goto('/')
      await page.getByRole('button', { name: 'Pick an icon set', exact: true }).focus()
      await page.keyboard.press('Space')
      await page.keyboard.press('ArrowRight')
      await expectNoViolations(page)
    })

    test('composer open and a toast showing', async ({ page }) => {
      await page.goto('/?api=fake&latency=0&fail=0&reject=1')
      await page.getByRole('button', { name: 'Add a card to Review' }).click()
      await page.keyboard.type('Refused')
      await page.keyboard.press('Enter')
      await expect(page.getByText(/so they were undone/)).toBeVisible()
      await expectNoViolations(page)
    })

    test('filtered by text and label', async ({ page }) => {
      await page.goto('/')
      await page.getByRole('searchbox', { name: 'Filter cards' }).fill('design')
      await page.getByRole('button', { name: 'Feature', exact: true }).click()
      await expect(page.getByRole('button', { name: 'Clear filters' })).toBeVisible()
      await expectNoViolations(page)
    })

    test('load error', async ({ page }) => {
      await page.goto('/?api=fake&latency=0&fail=1')
      await expect(page.getByRole('alert')).toBeVisible()
      await expectNoViolations(page)
    })
  })
}
