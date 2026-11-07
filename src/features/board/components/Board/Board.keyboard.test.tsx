import { screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { makeBoard } from '@/test/factories'
import { renderWithProviders } from '@/test/renderWithProviders'
import { Board } from './Board'

// jsdom has no layout, but keyboard moves only need list order, so the whole flow runs here.
// Moves that depend on real geometry (between columns, scrolling) are covered by Playwright.

const cardsIn = (name: string) =>
  within(within(screen.getByRole('region', { name })).getByRole('list'))
    .getAllByRole('listitem')
    .map((li) => li.textContent)
const liveRegion = () => document.querySelector('[aria-live="assertive"]')

function setup() {
  return renderWithProviders(<Board />, {
    board: makeBoard({ 'To do': ['a', 'b', 'c'], Done: ['d'] }),
  })
}

it('explains how to drag with the keyboard', () => {
  setup()
  expect(screen.getByRole('button', { name: 'Card a' })).toHaveAccessibleDescription(/press Space/)
})

it('picks up with Space, moves with arrows, drops with Space, and keeps focus', async () => {
  const { user } = setup()
  const card = screen.getByRole('button', { name: 'Card a' })
  card.focus()

  await user.keyboard(' ')
  expect(card.closest('li')).toHaveAttribute('data-dnd-active', 'keyboard')
  expect(liveRegion()).toHaveTextContent('Picked up card “Card a”, position 1 of 3 in To do.')

  await user.keyboard('{ArrowDown}{ArrowDown}')
  expect(cardsIn('To do')).toEqual(['Card b', 'Card c', 'Card a'])
  expect(liveRegion()).toHaveTextContent('Card “Card a” moved to position 3 of 3 in To do.')

  await user.keyboard(' ')
  expect(liveRegion()).toHaveTextContent('Card “Card a” dropped at position 3 of 3 in To do.')
  expect(cardsIn('To do')).toEqual(['Card b', 'Card c', 'Card a'])
  expect(screen.getByRole('button', { name: 'Card a' })).toHaveFocus()
  // The Space that dropped the card must not also open it.
  expect(screen.queryByRole('dialog', { name: 'Edit card' })).not.toBeInTheDocument()
})

it('Escape returns the card to where it started', async () => {
  const { user } = setup()
  screen.getByRole('button', { name: 'Card a' }).focus()

  await user.keyboard(' {ArrowDown}{Escape}')

  expect(cardsIn('To do')).toEqual(['Card a', 'Card b', 'Card c'])
  expect(liveRegion()).toHaveTextContent(
    'Movement cancelled. Card “Card a” returned to position 1 of 3 in To do.',
  )
  expect(screen.getByRole('button', { name: 'Card a' })).toHaveFocus()
})

it('Enter still opens the card instead of picking it up', async () => {
  const { user } = setup()
  screen.getByRole('button', { name: 'Card a' }).focus()

  await user.keyboard('{Enter}')

  expect(screen.getByRole('dialog', { name: 'Edit card' })).toBeInTheDocument()
})

it('Tab cannot move focus away while carrying a card', async () => {
  const { user } = setup()
  const card = screen.getByRole('button', { name: 'Card a' })
  card.focus()

  await user.keyboard(' ')
  await user.tab()
  expect(card).toHaveFocus()
  await user.keyboard('{Escape}')
})

it('moves columns with Left and Right from the column title', async () => {
  const { user } = setup()
  screen.getByRole('button', { name: 'Done' }).focus()

  await user.keyboard(' {ArrowLeft} ')

  expect(
    screen.getAllByRole('region').map((r) => within(r).getByRole('heading').textContent),
  ).toEqual(['Done', 'To do'])
  expect(liveRegion()).toHaveTextContent('Column “Done” dropped at position 1 of 2.')
  expect(screen.getByRole('button', { name: 'Done' })).toHaveFocus()
})
