import { expect, test, type Locator, type Page } from '@playwright/test'

/** Press on `source`, move in small steps (like a real hand) to `to`, optionally release. */
async function drag(page: Page, source: Locator, to: { x: number; y: number }, release = true) {
  const box = await source.boundingBox()
  if (!box) throw new Error('drag source is not visible')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(to.x, to.y, { steps: 15 })
  await page.waitForTimeout(100) // let the frame loop pick up the final position
  if (release) await page.mouse.up()
}

async function pointIn(locator: Locator, where: 'top' | 'bottom' | 'center' = 'center') {
  const box = await locator.boundingBox()
  if (!box) throw new Error('target is not visible')
  const y = { top: box.y + 4, center: box.y + box.height / 2, bottom: box.y + box.height - 4 }[
    where
  ]
  return { x: box.x + box.width / 2, y }
}

const column = (page: Page, name: string) => page.getByRole('region', { name, exact: true })
const cardsIn = (page: Page, name: string) =>
  column(page, name).getByRole('list').getByRole('listitem')
const card = (page: Page, name: string) => page.getByRole('button', { name, exact: true })
const columnTitles = (page: Page) => page.getByRole('region').locator('h2')

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('reorders a card within its column', async ({ page }) => {
  await drag(
    page,
    card(page, 'Design the empty state'),
    await pointIn(card(page, 'Pick an icon set'), 'bottom'),
  )

  await expect(cardsIn(page, 'To do')).toHaveText([
    'Write keyboard shortcuts doc',
    'Pick an icon set',
    'Design the empty state',
  ])
})

test('moves a card to another column', async ({ page }) => {
  await drag(
    page,
    card(page, 'Design the empty state'),
    await pointIn(card(page, 'Scaffold the project'), 'top'),
  )

  await expect(cardsIn(page, 'Done')).toHaveText([
    'Design the empty state',
    'Scaffold the project',
    'Normalized board model',
  ])
  await expect(cardsIn(page, 'To do')).toHaveCount(2)
})

test('drops a card into an empty column', async ({ page }) => {
  await page.getByRole('button', { name: 'Add a column' }).click()
  await page.keyboard.type('Empty')
  await page.keyboard.press('Enter')
  const emptyList = column(page, 'Empty').getByRole('list')
  await emptyList.scrollIntoViewIfNeeded()

  await drag(page, card(page, 'Accessible card dialog'), await pointIn(emptyList))

  await expect(cardsIn(page, 'Empty')).toHaveText(['Accessible card dialog'])
  await expect(cardsIn(page, 'Review')).toHaveCount(0)
})

test('shows a live preview while dragging and commits only on drop', async ({ page }) => {
  await drag(
    page,
    card(page, 'Design the empty state'),
    await pointIn(column(page, 'Review'), 'bottom'),
    false,
  )

  // The placeholder sits in the target column before anything is committed.
  await expect(cardsIn(page, 'Review')).toHaveCount(2)
  await expect(page.locator('[data-dnd-overlay]')).toHaveCount(1)

  await page.mouse.up()
  await expect(page.locator('[data-dnd-overlay]')).toHaveCount(0)
  await expect(cardsIn(page, 'Review')).toHaveText([
    'Accessible card dialog',
    'Design the empty state',
  ])
})

test('Escape cancels the drag and the release does not open the card', async ({ page }) => {
  await drag(page, card(page, 'Design the empty state'), await pointIn(column(page, 'Done')), false)
  await page.keyboard.press('Escape')
  await page.mouse.up()

  await expect(cardsIn(page, 'To do')).toHaveText([
    'Design the empty state',
    'Write keyboard shortcuts doc',
    'Pick an icon set',
  ])
  await expect(page.getByRole('dialog', { name: 'Edit card' })).toBeHidden()
})

test('dropping does not open the card dialog', async ({ page }) => {
  await drag(
    page,
    card(page, 'Pick an icon set'),
    await pointIn(card(page, 'Design the empty state'), 'top'),
  )

  await expect(cardsIn(page, 'To do').first()).toHaveText('Pick an icon set')
  await expect(page.getByRole('dialog', { name: 'Edit card' })).toBeHidden()
})

test('a click without movement still opens the card', async ({ page }) => {
  await card(page, 'Pick an icon set').click()
  await expect(page.getByRole('dialog', { name: 'Edit card' })).toBeVisible()
})

test('reorders columns by dragging the header', async ({ page }) => {
  const doneHeader = column(page, 'Done').locator('header')
  const todoHeader = column(page, 'To do').locator('header')
  const target = await pointIn(todoHeader)
  await drag(page, doneHeader, { x: target.x - 100, y: target.y })

  await expect(columnTitles(page)).toHaveText(['Done', 'To do', 'In progress', 'Review'])
})

test('auto-scrolls the board near its edge', async ({ page }) => {
  await page.setViewportSize({ width: 700, height: 600 })
  const board = page.locator('main > div')
  expect(await board.evaluate((el) => el.scrollLeft)).toBe(0)

  const viewport = page.viewportSize()!
  await drag(page, card(page, 'Design the empty state'), { x: viewport.width - 8, y: 200 }, false)
  await page.waitForTimeout(600)

  expect(await board.evaluate((el) => el.scrollLeft)).toBeGreaterThan(100)
  await page.keyboard.press('Escape')
  await page.mouse.up()
})

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })

  test('drops instantly without animations', async ({ page }) => {
    await drag(page, card(page, 'Pick an icon set'), await pointIn(column(page, 'Done'), 'bottom'))

    await expect(page.locator('[data-dnd-overlay]')).toHaveCount(0)
    await expect(cardsIn(page, 'Done').last()).toHaveText('Pick an icon set')
  })
})
