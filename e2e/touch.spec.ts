import { devices, expect, test, type Page } from '@playwright/test'

// Real touch input via the Chrome DevTools Protocol (Playwright's touchscreen can only tap).
test.skip(({ browserName }) => browserName !== 'chromium', 'Uses the Chrome DevTools Protocol')

// Only the phone's screen and input settings: spreading the whole device would also set
// `defaultBrowserType`, silently running the "firefox" project in Chromium.
const { viewport, deviceScaleFactor, isMobile, hasTouch, userAgent } = devices['Pixel 7']
test.use({ viewport, deviceScaleFactor, isMobile, hasTouch, userAgent })

type Point = { x: number; y: number }

type Touch = (steps: { type: 'start' | 'move' | 'end'; at?: Point }[]) => Promise<void>

/** One DevTools session per test: an ongoing touch belongs to the session that started it. */
async function touchscreen(page: Page): Promise<Touch> {
  const cdp = await page.context().newCDPSession(page)
  return async (steps) => {
    for (const step of steps) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: { start: 'touchStart', move: 'touchMove', end: 'touchEnd' }[step.type] as
          'touchStart' | 'touchMove' | 'touchEnd',
        touchPoints: step.at ? [{ x: step.at.x, y: step.at.y }] : [],
      })
    }
  }
}

const centerOf = async (page: Page, name: string) => {
  const box = (await page.getByRole('button', { name, exact: true }).boundingBox())!
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}
const cardsIn = (page: Page, name: string) =>
  page.getByRole('region', { name, exact: true }).getByRole('list').getByRole('listitem')

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('region', { name: 'To do' })).toBeVisible()
})

test('long-press then move drags a card', async ({ page }) => {
  const touch = await touchscreen(page)
  const from = await centerOf(page, 'Design the empty state')
  const to = await centerOf(page, 'Pick an icon set')

  await touch([{ type: 'start', at: from }])
  await page.waitForTimeout(400) // past the 250ms long-press delay
  const moves = Array.from({ length: 10 }, (_, i) => ({
    type: 'move' as const,
    at: { x: from.x, y: from.y + ((to.y + 20 - from.y) * (i + 1)) / 10 },
  }))
  await touch(moves)
  await page.waitForTimeout(150)
  await expect(page.locator('[data-dnd-overlay]')).toHaveCount(1)
  await touch([{ type: 'end' }])

  await expect(cardsIn(page, 'To do')).toHaveText([
    /Write keyboard shortcuts doc/,
    /Pick an icon set/,
    /Design the empty state/,
  ])
})

test('a quick swipe scrolls the board instead of dragging', async ({ page }) => {
  const touch = await touchscreen(page)
  const board = page.getByRole('list', { name: 'Columns' }).locator('..')
  const from = await centerOf(page, 'Design the empty state')

  await touch([
    { type: 'start', at: from },
    ...Array.from({ length: 8 }, (_, i) => ({
      type: 'move' as const,
      at: { x: from.x - (i + 1) * 30, y: from.y },
    })),
    { type: 'end' },
  ])

  await expect(page.locator('[data-dnd-overlay]')).toHaveCount(0)
  await expect.poll(() => board.evaluate((el) => el.scrollLeft)).toBeGreaterThan(50)
  await expect(cardsIn(page, 'To do').first()).toHaveText(/Design the empty state/)
})

test('a tap still opens the card', async ({ page }) => {
  await page.getByRole('button', { name: 'Pick an icon set', exact: true }).tap()
  await expect(page.getByRole('dialog', { name: 'Edit card' })).toBeVisible()
})
