import { describe, expect, it } from 'vitest'
import { historyActions, createHistory } from '@/shared/lib/history'
import { cardId, columnId, layoutOf, makeBoard } from '@/test/factories'
import { boardActions as a, type BoardAction } from './actions'
import { boardHistoryReducer, describeAction, type BoardHistory } from './history'

const board = makeBoard({ todo: ['a', 'b'], done: ['c'] })
const run = (...actions: Parameters<typeof boardHistoryReducer>[1][]) =>
  actions.reduce(boardHistoryReducer, createHistory(board) as BoardHistory)

describe('board history', () => {
  it('restores a deleted column together with its cards', () => {
    const history = run(a.deleteColumn(columnId('todo')), historyActions.undo())
    expect(history.present).toEqual(board)
  })

  it('undoes a move in a single step', () => {
    const history = run(a.moveCard(cardId('a'), columnId('done'), 0))
    expect(layoutOf(history.present)).toEqual({ todo: ['b'], done: ['a', 'c'] })
    expect(layoutOf(boardHistoryReducer(history, historyActions.undo()).present)).toEqual(
      layoutOf(board),
    )
  })

  it('ignores actions that change nothing', () => {
    const history = run(a.renameColumn(columnId('todo'), 'todo'))
    expect(history.past).toHaveLength(0)
  })

  it('shares unchanged data between snapshots', () => {
    const history = run(a.renameColumn(columnId('done'), 'Shipped'))
    expect(history.present.cards).toBe(history.past[0]?.state.cards)
  })
})

describe('describeAction', () => {
  it.each<[BoardAction, string]>([
    [a.addCard({ columnId: columnId('todo'), title: ' New ' }), 'Add card “New”'],
    [a.updateCard(cardId('a'), { title: 'X' }), 'Edit card “Card a”'],
    [a.deleteCard(cardId('a')), 'Delete card “Card a”'],
    [a.moveCard(cardId('c'), columnId('todo'), 0), 'Move card “Card c”'],
    [a.addColumn({ title: 'Review' }), 'Add column “Review”'],
    [a.renameColumn(columnId('todo'), 'Backlog'), 'Rename column “todo”'],
    [a.deleteColumn(columnId('done')), 'Delete column “done”'],
    [a.moveColumn(columnId('done'), 0), 'Move column “done”'],
  ])('%j → %s', (action, label) => {
    expect(describeAction(action, board)).toBe(label)
  })
})
