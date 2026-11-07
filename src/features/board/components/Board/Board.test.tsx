import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { makeBoard } from '@/test/factories'
import { renderWithProviders } from '@/test/renderWithProviders'
import { Board } from './Board'

const column = (name: string) => screen.getByRole('region', { name })
const cardsIn = (name: string) =>
  within(within(column(name)).getByRole('list'))
    .queryAllByRole('listitem')
    .map((li) => li.textContent)

function renderBoard(layout: Record<string, string[]> = { 'To do': ['a', 'b'], Done: ['c'] }) {
  return renderWithProviders(<Board />, { board: makeBoard(layout) })
}

describe('Board', () => {
  it('renders each column with its cards in order', () => {
    renderBoard()
    expect(
      screen.getAllByRole('region').map((r) => r.getAttribute('aria-labelledby')),
    ).toHaveLength(2)
    expect(cardsIn('To do')).toEqual(['Card a', 'Card b'])
    expect(cardsIn('Done')).toEqual(['Card c'])
    expect(within(column('To do')).getByText('2')).toBeInTheDocument()
  })
})

describe('adding cards', () => {
  it('adds cards with Enter and keeps the composer open for the next one', async () => {
    const { user } = renderBoard()
    await user.click(within(column('Done')).getByRole('button', { name: 'Add a card to Done' }))
    const input = screen.getByRole('textbox', { name: 'New card title in Done' })

    await user.type(input, 'First{Enter}Second{Enter}')

    expect(cardsIn('Done')).toEqual(['Card c', 'First', 'Second'])
    expect(input).toHaveValue('')
    expect(input).toHaveFocus()
  })

  it('does not add a blank card', async () => {
    const { user } = renderBoard()
    await user.click(screen.getByRole('button', { name: 'Add a card to Done' }))
    await user.type(screen.getByRole('textbox', { name: 'New card title in Done' }), '   {Enter}')

    expect(cardsIn('Done')).toEqual(['Card c'])
    expect(screen.getByRole('button', { name: 'Add card' })).toBeDisabled()
  })

  it('closes with Escape and returns focus to the toggle', async () => {
    const { user } = renderBoard()
    await user.click(screen.getByRole('button', { name: 'Add a card to Done' }))
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add a card to Done' })).toHaveFocus()
  })
})

describe('columns', () => {
  it('adds a column at the end', async () => {
    const { user } = renderBoard()
    await user.click(screen.getByRole('button', { name: 'Add a column' }))
    await user.type(screen.getByRole('textbox', { name: 'New column title' }), 'Review{Enter}')

    expect(column('Review')).toBeInTheDocument()
    expect(cardsIn('Review')).toEqual([])
  })

  it('renames a column inline with Enter', async () => {
    const { user } = renderBoard()
    await user.click(screen.getByRole('button', { name: 'To do' }))
    const input = screen.getByRole('textbox', { name: 'Column title' })
    await user.clear(input)
    await user.type(input, 'Backlog{Enter}')

    expect(column('Backlog')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Backlog' })).toHaveFocus()
  })

  it('cancels a rename with Escape', async () => {
    const { user } = renderBoard()
    await user.click(screen.getByRole('button', { name: 'To do' }))
    await user.type(screen.getByRole('textbox', { name: 'Column title' }), 'xyz{Escape}')

    expect(column('To do')).toBeInTheDocument()
  })

  it('deletes an empty column without asking', async () => {
    const { user } = renderBoard({ Empty: [], Done: ['c'] })
    await user.click(screen.getByRole('button', { name: 'Delete column Empty' }))

    expect(screen.queryByRole('region', { name: 'Empty' })).not.toBeInTheDocument()
  })

  it('asks before deleting a column that has cards', async () => {
    const { user } = renderBoard()
    await user.click(screen.getByRole('button', { name: 'Delete column To do' }))
    const dialog = screen.getByRole('dialog', { name: 'Delete column?' })
    expect(dialog).toHaveTextContent('“To do” and its 2 cards will be deleted.')

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(column('To do')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Delete column To do' }))
    await user.click(screen.getByRole('button', { name: 'Delete column' }))
    expect(screen.queryByRole('region', { name: 'To do' })).not.toBeInTheDocument()
  })
})

describe('card details', () => {
  it('edits title and description, then returns focus to the card', async () => {
    const { user } = renderBoard()
    await user.click(screen.getByRole('button', { name: 'Card a' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit card' })
    expect(dialog).toHaveTextContent('In column To do')

    const title = within(dialog).getByRole('textbox', { name: 'Title' })
    await user.clear(title)
    await user.type(title, 'Renamed')
    await user.type(within(dialog).getByRole('textbox', { name: 'Description' }), 'Details')
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))

    expect(screen.queryByRole('dialog', { name: 'Edit card' })).not.toBeInTheDocument()
    const card = screen.getByRole('button', { name: 'Renamed' })
    expect(card).toHaveAccessibleDescription('Has description')
    expect(card).toHaveFocus()
  })

  it('discards edits on Cancel', async () => {
    const { user } = renderBoard()
    await user.click(screen.getByRole('button', { name: 'Card a' }))
    await user.type(screen.getByRole('textbox', { name: 'Title' }), ' changed')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(cardsIn('To do')).toEqual(['Card a', 'Card b'])
  })

  it('deletes the card', async () => {
    const { user } = renderBoard()
    await user.click(screen.getByRole('button', { name: 'Card b' }))
    await user.click(screen.getByRole('button', { name: 'Delete card' }))

    expect(cardsIn('To do')).toEqual(['Card a'])
    expect(screen.queryByRole('dialog', { name: 'Edit card' })).not.toBeInTheDocument()
  })
})
