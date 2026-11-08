// Interaction benchmarks against the production build.
//   npm run bench               # 50 columns × 100 cards
//   npm run bench -- 20x50      # another size
// Each scenario dispatches a real DOM event and measures until the next frame has painted,
// which is the delay a user would feel. Reports the median and the worst of N runs.
import { spawn } from 'node:child_process'
import { chromium } from '@playwright/test'

const size = process.argv[2] ?? '50x100'
const RUNS = 15
const PORT = 4173

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  stdio: 'ignore',
})
await new Promise((resolve) => setTimeout(resolve, 1500))

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })

const results = []
const record = (name, samples) => {
  const sorted = samples.toSorted((a, b) => a - b)
  results.push({
    scenario: name,
    median: sorted[Math.floor(sorted.length / 2)].toFixed(1),
    worst: sorted.at(-1).toFixed(1),
  })
}

/** Source for an action that presses `k` on the focused element (see `timed`). */
const key = (k) =>
  `() => document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: ${JSON.stringify(k)}, bubbles: true }))`

/**
 * Runs `action` in the page and resolves when the following frame has been painted.
 * `action` is sent as source text, so it can't use variables from this file (see `key`).
 */
const timed = (action) =>
  page.evaluate(
    async (source) => {
      const run = new Function(`return (${source})()`)
      const start = performance.now()
      run()
      await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)))
      return performance.now() - start
    },
    typeof action === 'string' ? action : action.toString(),
  )

try {
  // ── Load ─────────────────────────────────────────────────────────────────────
  const loads = []
  for (let i = 0; i < 5; i++) {
    await page.goto(`http://localhost:${PORT}/?bench=${size}`)
    await page.locator('[data-dnd-handle]').nth(1).waitFor()
    loads.push(
      await page.evaluate(
        () =>
          new Promise((r) => requestAnimationFrame(() => setTimeout(() => r(performance.now())))),
      ),
    )
  }
  record('Load until the board is painted', loads)
  const cardCount = await page.locator('li > button[data-dnd-handle]').count()

  const samples = async (name, setup, action, runs = RUNS) => {
    const list = []
    for (let i = 0; i < runs; i++) {
      await setup(i)
      list.push(await timed(action))
    }
    record(name, list)
  }

  // ── Board changes ────────────────────────────────────────────────────────────
  await samples(
    'Rename a column (Enter)',
    async (i) => {
      await page
        .getByRole('button', { name: /^Column 1$|^Renamed/ })
        .first()
        .click()
      await page.getByRole('textbox', { name: 'Column title' }).fill(`Renamed ${i}`)
    },
    () =>
      document
        .querySelector('input[aria-label="Column title"]')
        .dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })),
  )

  await page.getByRole('button', { name: /^Add a card to Column 2$/ }).click()
  await samples(
    'Add a card (Enter)',
    async (i) => page.getByRole('textbox', { name: 'New card title in Column 2' }).fill(`New ${i}`),
    () =>
      document
        .querySelector('textarea[aria-label="New card title in Column 2"]')
        .dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })),
  )
  await page.keyboard.press('Escape')

  await samples(
    'Undo (Ctrl+Z)',
    async () => {},
    () =>
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'z', code: 'KeyZ', ctrlKey: true, bubbles: true }),
      ),
    10,
  )

  // ── Card dialog ──────────────────────────────────────────────────────────────
  await samples(
    'Open a card',
    async () => {
      if (await page.getByRole('dialog').isVisible()) await page.keyboard.press('Escape')
    },
    () => document.querySelector('li > button[data-dnd-handle]').click(),
  )
  await page.keyboard.press('Escape')

  // ── Keyboard drag ────────────────────────────────────────────────────────────
  const focusFirstCard = async () => {
    await page.evaluate(() => document.querySelector('li > button[data-dnd-handle]').focus())
  }
  // Space toggles pick up / drop, so pick up and drop in pairs, measuring only the pick-ups.
  const pickUps = []
  for (let i = 0; i < 10; i++) {
    await focusFirstCard()
    pickUps.push(await timed(key(' ')))
    await page.keyboard.press('Escape')
  }
  record('Drag: pick up a card (Space)', pickUps)

  await focusFirstCard()
  await page.keyboard.press('Space')
  const dragging = await page.evaluate(
    () => !!document.querySelector('[data-dnd-active="keyboard"]'),
  )
  if (!dragging) throw new Error('Benchmark setup failed: no keyboard drag in progress')
  await samples('Drag: move within a column (↓)', async () => {}, key('ArrowDown'))
  await samples('Drag: move to the next column (→)', async () => {}, key('ArrowRight'))
  await samples('Drag: cancel (Escape)', async () => {}, key('Escape'), 1)

  console.log(`\nBoard: ${size} (${cardCount} cards), production build, ${RUNS} runs`)
  console.log('One frame (~16 ms) is the floor: the update painted in the next frame.\n')
  console.log('| Scenario | Median (ms) | Worst (ms) |')
  console.log('|---|---:|---:|')
  for (const r of results) console.log(`| ${r.scenario} | ${r.median} | ${r.worst} |`)
} finally {
  await browser.close()
  server.kill()
}
