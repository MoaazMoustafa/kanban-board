import { expect, test, type Page } from '@playwright/test'

const cardsIn = (page: Page, name: string) =>
  page.getByRole('region', { name, exact: true }).getByRole('list').getByRole('listitem')

async function addCard(page: Page, column: string, title: string) {
  await page.getByRole('button', { name: `Add a card to ${column}` }).click()
  await page.keyboard.type(title)
  await page.keyboard.press('Enter')
  await page.keyboard.press('Escape')
}

test('keeps the board across reloads', async ({ page }) => {
  await page.goto('/')
  await addCard(page, 'Review', 'Survives a reload')
  await expect(page.getByText('Saved', { exact: true })).toBeVisible()

  await page.reload()
  await expect(cardsIn(page, 'Review')).toHaveText(['Accessible card dialog', 'Survives a reload'])
})

test('shows changes from another tab live', async ({ context }) => {
  const first = await context.newPage()
  const second = await context.newPage()
  await first.goto('/')
  await second.goto('/')

  await addCard(first, 'Review', 'Made in tab one')
  await expect(cardsIn(second, 'Review')).toHaveText(['Accessible card dialog', 'Made in tab one'])
})

test('a conflict between tabs ends with the latest saved version and a notice', async ({
  context,
}) => {
  const fast = await context.newPage()
  const slow = await context.newPage()
  await fast.goto('/?api=fake&latency=0&fail=0')
  await slow.goto('/?api=fake&latency=3000&fail=0') // its saves take 1–3s to arrive
  await expect(slow.getByRole('region', { name: 'Review', exact: true })).toBeVisible()

  await addCard(slow, 'Done', 'Slow tab change') // saving, slowly…
  await addCard(fast, 'Review', 'Fast tab change') // …while this one is saved first

  // The slow tab's save was based on an old revision, so the stored version wins.
  await expect(slow.getByText(/changed in another tab/)).toBeVisible({ timeout: 10_000 })
  await expect(cardsIn(slow, 'Review')).toHaveText(['Accessible card dialog', 'Fast tab change'])
  await expect(cardsIn(slow, 'Done')).toHaveCount(2)
})

test.describe('with the fake API', () => {
  test('keeps work while offline and saves when back online', async ({ page, context }) => {
    await page.goto('/?api=fake&latency=50&fail=0')
    await expect(page.getByRole('region', { name: 'Review', exact: true })).toBeVisible()

    await context.setOffline(true)
    await addCard(page, 'Review', 'Written offline')
    await expect(page.getByText(/Not saved/)).toBeVisible()
    await expect(page.getByText(/Your changes are kept/)).toBeVisible()
    await expect(cardsIn(page, 'Review')).toHaveText(['Accessible card dialog', 'Written offline'])

    // The `online` event triggers an immediate retry instead of waiting for the backoff.
    await context.setOffline(false)
    await expect(page.getByText('Saved', { exact: true })).toBeVisible()
    await page.reload()
    await expect(cardsIn(page, 'Review')).toHaveText(['Accessible card dialog', 'Written offline'])
  })

  test('offers a retry when the board fails to load', async ({ page }) => {
    await page.goto('/?api=fake&latency=50&fail=1')
    await expect(page.getByRole('alert')).toHaveText(/Couldn't load your board/)
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()
  })

  test('rolls back a change the server rejects', async ({ page }) => {
    await page.goto('/?api=fake&latency=50&fail=0&reject=1')
    await addCard(page, 'Review', 'Refused')
    await expect(
      page.getByText(/Couldn't save your recent changes, so they were undone/),
    ).toBeVisible()
    await expect(cardsIn(page, 'Review')).toHaveText(['Accessible card dialog'])
  })
})
