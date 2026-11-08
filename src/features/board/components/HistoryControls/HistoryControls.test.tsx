import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { makeBoard } from '@/test/factories'
import { renderWithProviders } from '@/test/renderWithProviders'
import { Board } from '../Board/Board'
import { HistoryControls } from './HistoryControls'

const cardsIn = (name: string) =>
  within(within(screen.getByRole('region', { name })).getByRole('list'))
    .queryAllByRole('listitem')
    .map((li) => li.textContent)
const undoButton = () => screen.getByRole('button', { name: 'Undo' })
const redoButton = () => screen.getByRole('button', { name: 'Redo' })
const announcement = () => document.querySelector('[aria-live="polite"]')

function setup() {
  return renderWithProviders(
    <>
      <HistoryControls />
      <Board />
    </>,
    { board: makeBoard({ 'To do': ['a', 'b'], Done: ['c'] }) },
  )
}

async function addCard(user: ReturnType<typeof setup>['user'], title: string) {
  await user.click(screen.getByRole('button', { name: 'Add a card to Done' }))
  await user.type(
    screen.getByRole('textbox', { name: 'New card title in Done' }),
    `${title}{Enter}`,
  )
  await user.keyboard('{Escape}')
}

describe('undo and redo buttons', () => {
  it('start out with nothing to undo or redo', () => {
    setup()
    expect(undoButton()).toHaveAttribute('aria-disabled', 'true')
    expect(undoButton()).toHaveAttribute('title', 'Nothing to undo')
    expect(redoButton()).toHaveAttribute('aria-disabled', 'true')
  })

  it('undo and redo a change, naming it in the tooltip and announcement', async () => {
    const { user } = setup()
    await addCard(user, 'New')
    expect(undoButton()).toHaveAttribute('title', 'Undo: Add card “New” (Ctrl+Z)')

    await user.click(undoButton())
    expect(cardsIn('Done')).toEqual(['Card c'])
    expect(announcement()).toHaveTextContent('Undid: Add card “New”.')
    expect(redoButton()).toHaveAttribute('title', 'Redo: Add card “New” (Ctrl+Shift+Z)')

    await user.click(redoButton())
    expect(cardsIn('Done')).toEqual(['Card c', 'New'])
    expect(announcement()).toHaveTextContent('Redid: Add card “New”.')
  })

  it('keep focus on the button when the last step is undone', async () => {
    const { user } = setup()
    await addCard(user, 'New')
    await user.click(undoButton())

    expect(undoButton()).toHaveFocus()
    expect(undoButton()).toHaveAttribute('aria-disabled', 'true')
    await user.click(undoButton()) // nothing left: a no-op, not an error
    expect(cardsIn('Done')).toEqual(['Card c'])
  })

  it('bring back a deleted column with all of its cards', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: 'Delete column To do' }))
    await user.click(screen.getByRole('button', { name: 'Delete column' }))
    expect(screen.queryByRole('region', { name: 'To do' })).not.toBeInTheDocument()

    await user.click(undoButton())
    expect(cardsIn('To do')).toEqual(['Card a', 'Card b'])
  })
})

describe('keyboard shortcuts', () => {
  it('Ctrl+Z undoes and Ctrl+Shift+Z redoes', async () => {
    const { user } = setup()
    await addCard(user, 'New')

    await user.keyboard('{Control>}z{/Control}')
    expect(cardsIn('Done')).toEqual(['Card c'])
    await user.keyboard('{Control>}{Shift>}z{/Shift}{/Control}')
    expect(cardsIn('Done')).toEqual(['Card c', 'New'])
  })

  it('leave text fields their own undo', async () => {
    const { user } = setup()
    await addCard(user, 'New')
    await user.click(screen.getByRole('button', { name: 'Add a card to Done' }))
    await user.keyboard('typing{Control>}z{/Control}')

    expect(cardsIn('Done')).toEqual(['Card c', 'New'])
  })

  it('undo a whole keyboard drag in one step', async () => {
    const { user } = setup()
    screen.getByRole('button', { name: 'Card a' }).focus()
    await user.keyboard(' {ArrowDown} ')
    expect(cardsIn('To do')).toEqual(['Card b', 'Card a'])
    // Only the drop is recorded: the preview steps never reached the reducer.
    expect(undoButton()).toHaveAttribute('title', 'Undo: Move card “Card a” (Ctrl+Z)')

    await user.keyboard('{Control>}z{/Control}')
    expect(cardsIn('To do')).toEqual(['Card a', 'Card b'])
    expect(undoButton()).toHaveAttribute('aria-disabled', 'true')
  })

  it('move focus to the Undo button when undo removes the focused element', async () => {
    const { user } = setup()
    await addCard(user, 'New')
    screen.getByRole('button', { name: 'New' }).focus()

    await user.keyboard('{Control>}z{/Control}')
    expect(cardsIn('Done')).toEqual(['Card c'])
    await waitFor(() => expect(undoButton()).toHaveFocus())
  })

  it('are ignored while carrying a card', async () => {
    const { user } = setup()
    await addCard(user, 'New')
    screen.getByRole('button', { name: 'Card a' }).focus()
    await user.keyboard(' {Control>}z{/Control}')

    expect(cardsIn('Done')).toEqual(['Card c', 'New'])
    await user.keyboard('{Escape}')
  })
})
