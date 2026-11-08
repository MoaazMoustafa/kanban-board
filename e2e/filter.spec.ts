import { expect, test } from '@playwright/test'

test('a mouse drag in a filtered view lands where it was shown', async ({ page }) => {
  await page.goto('/')
  // Only Design-labelled cards: "Design the empty state" and "Pick an icon set" (both in To do).
  await page.getByRole('button', { name: 'Design', exact: true, pressed: false }).click()
  const todo = page.getByRole('region', { name: 'To do', exact: true })
  await expect(todo.getByRole('listitem')).toHaveCount(2)

  const source = (await page
    .getByRole('button', { name: 'Pick an icon set', exact: true })
    .boundingBox())!
  const target = (await page
    .getByRole('button', { name: 'Design the empty state', exact: true })
    .boundingBox())!
  await page.mouse.move(source.x + 20, source.y + 10)
  await page.mouse.down()
  await page.mouse.move(target.x + 20, target.y + 4, { steps: 15 })
  await page.waitForTimeout(100)
  await page.mouse.up()

  await page.getByRole('button', { name: 'Clear filters' }).click()
  await expect(todo.getByRole('listitem')).toHaveText([
    /Pick an icon set/,
    /Design the empty state/,
    /Write keyboard shortcuts doc/,
  ])
})
