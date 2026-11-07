import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test.describe('card details dialog (native <dialog>)', () => {
  test('keeps focus out of the page behind it, closes on Escape, and returns focus', async ({
    page,
  }) => {
    const card = page.getByRole('button', { name: 'Design the empty state' })
    await card.click()
    const dialog = page.getByRole('dialog', { name: 'Edit card' })
    await expect(dialog).toBeVisible()

    // showModal() makes the page inert. Tabbing past the last control may go to the browser's
    // own UI (activeElement is <body>), but must never reach anything behind the dialog.
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab')
      const focus = await dialog.evaluate((el) => {
        const active = document.activeElement
        return active === document.body ? 'browser' : el.contains(active) ? 'dialog' : 'page'
      })
      expect(focus).not.toBe('page')
    }

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(card).toBeFocused()
  })

  test('closes when the backdrop is clicked', async ({ page }) => {
    await page.getByRole('button', { name: 'Design the empty state' }).click()
    const dialog = page.getByRole('dialog', { name: 'Edit card' })
    await expect(dialog).toBeVisible()

    await page.mouse.click(5, 5)
    await expect(dialog).toBeHidden()
  })

  test('saves edits', async ({ page }) => {
    await page.getByRole('button', { name: 'Pick an icon set' }).click()
    await page.getByRole('textbox', { name: 'Title' }).fill('Pick Lucide icons')
    await page.getByRole('textbox', { name: 'Description' }).fill('Tree-shakeable')
    await page.getByRole('button', { name: 'Save' }).click()

    const card = page.getByRole('button', { name: 'Pick Lucide icons' })
    await expect(card).toBeVisible()
    await expect(card).toHaveAccessibleDescription('Has description')
  })
})

test('adds a card from the keyboard', async ({ page }) => {
  await page.getByRole('button', { name: 'Add a card to Review' }).click()
  await page.keyboard.type('Keyboard-only card')
  await page.keyboard.press('Enter')

  const review = page.getByRole('region', { name: 'Review' })
  await expect(review.getByRole('listitem')).toHaveText([
    'Accessible card dialog',
    'Keyboard-only card',
  ])
})

test('renaming a column with Enter does not reopen the editor', async ({ page }) => {
  await page.getByRole('button', { name: 'Review', exact: true }).click()
  await page.getByRole('textbox', { name: 'Column title' }).fill('QA')
  await page.keyboard.press('Enter')

  await expect(page.getByRole('textbox', { name: 'Column title' })).toBeHidden()
  await expect(page.getByRole('button', { name: 'QA', exact: true })).toBeFocused()
})

test('the board scrolls, not the page', async ({ page }) => {
  await page.setViewportSize({ width: 700, height: 600 })
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBe(0)
})
