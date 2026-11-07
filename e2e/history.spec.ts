import { expect, test, type Page } from '@playwright/test'

const cardsIn = (page: Page, name: string) =>
  page.getByRole('region', { name, exact: true }).getByRole('list').getByRole('listitem')
const card = (page: Page, name: string) => page.getByRole('button', { name, exact: true })
const modifier = process.platform === 'darwin' ? 'Meta' : 'Control'

async function startDrag(page: Page, name: string, to: { x: number; y: number }) {
  const box = (await card(page, name).boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(to.x, to.y, { steps: 15 })
  await page.waitForTimeout(100)
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('undoes and redoes a mouse drag', async ({ page }) => {
  const done = (await page.getByRole('region', { name: 'Done', exact: true }).boundingBox())!
  await startDrag(page, 'Design the empty state', { x: done.x + 50, y: done.y + done.height - 10 })
  await page.mouse.up()
  await expect(cardsIn(page, 'Done').last()).toHaveText('Design the empty state')

  await page.keyboard.press(`${modifier}+z`)
  await expect(cardsIn(page, 'To do').first()).toHaveText('Design the empty state')

  await page.getByRole('button', { name: 'Redo' }).click()
  await expect(cardsIn(page, 'Done').last()).toHaveText('Design the empty state')
})

test('ignores Ctrl+Z in the middle of a mouse drag', async ({ page }) => {
  await page.getByRole('button', { name: 'Add a card to Review' }).click()
  await page.keyboard.type('Extra')
  await page.keyboard.press('Enter')
  await page.keyboard.press('Escape')

  const done = (await page.getByRole('region', { name: 'Done', exact: true }).boundingBox())!
  await startDrag(page, 'Pick an icon set', { x: done.x + 50, y: done.y + 20 })
  await page.keyboard.press(`${modifier}+z`)
  await page.mouse.up()

  // The earlier "Extra" card is still there; only the drop happened.
  await expect(cardsIn(page, 'Review')).toHaveText(['Accessible card dialog', 'Extra'])
  await expect(cardsIn(page, 'Done').first()).toHaveText('Pick an icon set')
})

test('leaves native undo to text fields', async ({ page }) => {
  await page.getByRole('button', { name: 'Add a card to Review' }).click()
  const input = page.getByRole('textbox', { name: 'New card title in Review' })
  await page.keyboard.type('abc')
  await page.keyboard.press(`${modifier}+z`)

  // How much native undo reverts differs by browser (Chrome: one keystroke, Firefox: the word).
  await expect(input).not.toHaveValue('abc')
  await expect(cardsIn(page, 'Review')).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Undo' })).toHaveAttribute('aria-disabled', 'true')
})
