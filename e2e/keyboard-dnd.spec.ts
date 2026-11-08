import { expect, test, type Page } from '@playwright/test'
import { cardTitle } from './helpers.ts'

const column = (page: Page, name: string) => page.getByRole('region', { name, exact: true })
const cardsIn = (page: Page, name: string) =>
  column(page, name).getByRole('list').getByRole('listitem')
const card = (page: Page, name: string) => page.getByRole('button', { name, exact: true })
const liveRegion = (page: Page) => page.locator('[aria-live="assertive"]')

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('moves a card across columns with the keyboard and keeps focus on it', async ({ page }) => {
  await card(page, 'Design the empty state').focus()
  await page.keyboard.press('Space')
  await expect(liveRegion(page)).toHaveText(
    'Picked up card “Design the empty state”, position 1 of 3 in To do.',
  )

  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowDown')
  await expect(liveRegion(page)).toHaveText(
    'Card “Design the empty state” moved to position 2 of 2 in Review.',
  )
  // Focus follows the card even though it was re-created in another column.
  await expect(card(page, 'Design the empty state')).toBeFocused()

  await page.keyboard.press('Space')
  await expect(cardsIn(page, 'Review')).toHaveText([
    cardTitle('Accessible card dialog'),
    cardTitle('Design the empty state'),
  ])
  await expect(card(page, 'Design the empty state')).toBeFocused()
  await expect(page.getByRole('dialog', { name: 'Edit card' })).toBeHidden()
})

test('dropping with Enter does not open the card', async ({ page }) => {
  await card(page, 'Pick an icon set').focus()
  await page.keyboard.press('Space')
  await page.keyboard.press('ArrowUp')
  await page.keyboard.press('Enter')

  await expect(cardsIn(page, 'To do').nth(1)).toHaveText(cardTitle('Pick an icon set'))
  await expect(page.getByRole('dialog', { name: 'Edit card' })).toBeHidden()
})

test('Escape cancels and Enter still opens the card afterwards', async ({ page }) => {
  await card(page, 'Pick an icon set').focus()
  await page.keyboard.press('Space')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Escape')

  await expect(cardsIn(page, 'To do').last()).toHaveText(cardTitle('Pick an icon set'))
  await expect(card(page, 'Pick an icon set')).toBeFocused()

  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: 'Edit card' })).toBeVisible()
})

test('reorders columns from the column title', async ({ page }) => {
  await page.getByRole('button', { name: 'Review', exact: true }).focus()
  await page.keyboard.press('Space')
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('Space')

  await expect(page.getByRole('region').locator('h2')).toHaveText([
    'Review',
    'To do',
    'In progress',
    'Done',
  ])
  await expect(page.getByRole('button', { name: 'Review', exact: true })).toBeFocused()
  // Space on the title button picked the column up instead of starting a rename.
  await expect(page.getByRole('textbox', { name: 'Column title' })).toBeHidden()
})

test('scrolls a card that is moved off-screen back into view', async ({ page }) => {
  await page.setViewportSize({ width: 700, height: 600 })
  await card(page, 'Design the empty state').focus()
  await page.keyboard.press('Space')
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Space')

  await expect(cardsIn(page, 'Done').first()).toHaveText(cardTitle('Design the empty state'))
  await expect(card(page, 'Design the empty state')).toBeInViewport()
})
