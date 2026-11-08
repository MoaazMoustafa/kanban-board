import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { BoardState, LabelId } from '@/features/board'
import { makeBoard } from '@/test/factories'
import { renderWithProviders } from '@/test/renderWithProviders'
import { Board } from '../Board/Board'

/** To do: a, b, c, d (a and c mention "login"; c is a Bug). Done: e. */
function boardWithTitles(): BoardState {
  const board = makeBoard({ 'To do': ['a', 'b', 'c', 'd'], Done: ['e'] })
  const titles: Record<string, [string, LabelId[]]> = {
    a: ['Fix login redirect', []],
    b: ['Write docs', []],
    c: ['Login button misaligned', ['bug']],
    d: ['Plan sprint', []],
    e: ['Ship release', ['bug']],
  }
  const cards = Object.fromEntries(
    Object.entries(board.cards).map(([id, card]) => {
      const [title, labels] = titles[id]!
      return [id, { ...card, title, labels }]
    }),
  )
  return { ...board, cards }
}

const cardsIn = (name: string) =>
  within(within(screen.getByRole('region', { name })).getByRole('list'))
    .queryAllByRole('listitem')
    .map((li) => li.querySelector('[class*="title"]')?.textContent)
const filterInput = () => screen.getByRole('searchbox', { name: 'Filter cards' })
const announcement = () =>
  [...document.querySelectorAll('[aria-live="polite"]')].map((el) => el.textContent).join(' ')

function setup() {
  return renderWithProviders(<Board />, { board: boardWithTitles() })
}

describe('filtering', () => {
  it('shows only matching cards, with counts, and clears', async () => {
    const { user } = setup()
    await user.type(filterInput(), 'login')

    expect(cardsIn('To do')).toEqual(['Fix login redirect', 'Login button misaligned'])
    expect(cardsIn('Done')).toEqual([])
    expect(within(screen.getByRole('region', { name: 'To do' })).getByText('2/4')).toBeVisible()
    expect(
      within(screen.getByRole('region', { name: 'Done' })).getByText('No matching cards'),
    ).toBeVisible()
    expect(announcement()).toContain('2 of 5 cards shown.')

    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(cardsIn('To do')).toHaveLength(4)
  })

  it('filters by label (any of the selected labels)', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: 'Bug', pressed: false }))

    expect(cardsIn('To do')).toEqual(['Login button misaligned'])
    expect(cardsIn('Done')).toEqual(['Ship release'])
    expect(screen.getByRole('button', { name: 'Bug' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('"/" focuses the filter; Escape clears it, then leaves it', async () => {
    const { user } = setup()
    await user.keyboard('/')
    expect(filterInput()).toHaveFocus()

    await user.keyboard('docs{Escape}')
    expect(filterInput()).toHaveValue('')
    expect(filterInput()).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(filterInput()).not.toHaveFocus()
  })
})

describe('dragging while filtered', () => {
  it('places the card relative to the visible cards, keeping hidden ones in order', async () => {
    const { user } = setup()
    await user.type(filterInput(), 'login')

    // Visible: "Fix login redirect" (a), "Login button misaligned" (c). Move a below c.
    screen.getByRole('button', { name: 'Fix login redirect' }).focus()
    await user.keyboard(' {ArrowDown} ')

    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    // a lands right after c; hidden b stays above, hidden d stays below.
    expect(cardsIn('To do')).toEqual([
      'Write docs',
      'Login button misaligned',
      'Fix login redirect',
      'Plan sprint',
    ])
  })
})

describe('labels', () => {
  it('are edited in the card dialog and shown on the card', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: 'Write docs' }))
    await user.click(screen.getByRole('checkbox', { name: 'Feature' }))
    await user.click(screen.getByRole('checkbox', { name: 'Bug' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    const card = screen.getByRole('button', { name: 'Write docs' })
    // Palette order, regardless of the order they were ticked in.
    expect(card).toHaveAccessibleDescription(/^Labels: Bug, Feature/)
    expect(card).toHaveTextContent('BugFeature')
  })

  it('keep the card name equal to its title', () => {
    setup()
    expect(
      screen.getByRole('button', { name: 'Login button misaligned' }),
    ).toHaveAccessibleDescription(/Labels: Bug/)
  })
})

it('shows the full list in its original order once the filter is cleared', async () => {
  const { user } = setup()
  await user.type(filterInput(), 'login')
  await user.clear(filterInput())
  expect(cardsIn('To do')).toEqual([
    'Fix login redirect',
    'Write docs',
    'Login button misaligned',
    'Plan sprint',
  ])
})
