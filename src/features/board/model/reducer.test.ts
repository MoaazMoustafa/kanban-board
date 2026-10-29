import { beforeEach, describe, expect, it } from 'vitest'
import { cardId, columnId, deepFreeze, layoutOf, makeBoard } from '@/test/factories'
import { boardActions as a } from './actions'
import { boardReducer } from './reducer'
import type { BoardState } from './types'

let board: BoardState

beforeEach(() => {
  // Frozen, so any mutation inside the reducer throws instead of passing silently.
  board = deepFreeze(makeBoard({ todo: ['a', 'b', 'c'], doing: ['d'], done: [] }))
})

describe('card/added', () => {
  it('adds the card to the end of the column by default', () => {
    const next = boardReducer(
      board,
      a.addCard({ columnId: columnId('doing'), title: 'New', id: cardId('x') }),
    )
    expect(layoutOf(next)).toMatchObject({ doing: ['d', 'x'] })
    expect(next.cards[cardId('x')]).toMatchObject({ title: 'New', description: '' })
  })

  it('inserts at the given index', () => {
    const next = boardReducer(
      board,
      a.addCard({ columnId: columnId('todo'), title: 'New', id: cardId('x'), index: 1 }),
    )
    expect(layoutOf(next)).toMatchObject({ todo: ['a', 'x', 'b', 'c'] })
  })

  it('trims the title', () => {
    const next = boardReducer(
      board,
      a.addCard({ columnId: columnId('done'), title: '  Hi  ', id: cardId('x') }),
    )
    expect(next.cards[cardId('x')]?.title).toBe('Hi')
  })

  it.each([
    ['an empty title', { columnId: columnId('todo'), title: '   ', id: cardId('x') }],
    ['an unknown column', { columnId: columnId('nope'), title: 'New', id: cardId('x') }],
    ['a duplicate id', { columnId: columnId('todo'), title: 'New', id: cardId('a') }],
  ])('ignores %s', (_, input) => {
    expect(boardReducer(board, a.addCard(input))).toBe(board)
  })
})

describe('card/updated', () => {
  it('updates title and description', () => {
    const next = boardReducer(board, a.updateCard(cardId('a'), { title: ' T ', description: 'D' }))
    expect(next.cards[cardId('a')]).toMatchObject({ title: 'T', description: 'D' })
  })

  it('leaves unchanged fields alone', () => {
    const next = boardReducer(board, a.updateCard(cardId('a'), { description: 'D' }))
    expect(next.cards[cardId('a')]?.title).toBe('Card a')
  })

  it.each([
    ['an unknown card', cardId('nope'), { title: 'T' }],
    ['an empty title', cardId('a'), { title: '  ' }],
    ['identical values', cardId('a'), { title: 'Card a', description: '' }],
  ])('ignores %s', (_, id, changes) => {
    expect(boardReducer(board, a.updateCard(id, changes))).toBe(board)
  })
})

describe('card/deleted', () => {
  it('removes the card from its column and from the card table', () => {
    const next = boardReducer(board, a.deleteCard(cardId('b')))
    expect(layoutOf(next)).toMatchObject({ todo: ['a', 'c'] })
    expect(next.cards[cardId('b')]).toBeUndefined()
  })

  it('ignores an unknown card', () => {
    expect(boardReducer(board, a.deleteCard(cardId('nope')))).toBe(board)
  })
})

describe('card/moved', () => {
  it('reorders within the same column', () => {
    const next = boardReducer(board, a.moveCard(cardId('a'), columnId('todo'), 2))
    expect(layoutOf(next)).toMatchObject({ todo: ['b', 'c', 'a'] })
  })

  it('moves to another column at the given index', () => {
    const next = boardReducer(board, a.moveCard(cardId('b'), columnId('doing'), 0))
    expect(layoutOf(next)).toEqual({ todo: ['a', 'c'], doing: ['b', 'd'], done: [] })
  })

  it('moves into an empty column', () => {
    const next = boardReducer(board, a.moveCard(cardId('d'), columnId('done'), 0))
    expect(layoutOf(next)).toEqual({ todo: ['a', 'b', 'c'], doing: [], done: ['d'] })
  })

  it('clamps an out-of-range index', () => {
    const next = boardReducer(board, a.moveCard(cardId('a'), columnId('doing'), 99))
    expect(layoutOf(next)).toMatchObject({ doing: ['d', 'a'] })
  })

  it('keeps untouched columns referentially equal', () => {
    const next = boardReducer(board, a.moveCard(cardId('a'), columnId('doing'), 0))
    expect(next.columns[columnId('done')]).toBe(board.columns[columnId('done')])
    expect(next.cards).toBe(board.cards)
  })

  it.each([
    ['an unknown card', cardId('nope'), columnId('todo'), 0],
    ['an unknown column', cardId('a'), columnId('nope'), 0],
    ['moving to the same position', cardId('b'), columnId('todo'), 1],
  ])('ignores %s', (_, card, column, index) => {
    expect(boardReducer(board, a.moveCard(card, column, index))).toBe(board)
  })
})

describe('column/added', () => {
  it('appends an empty column by default', () => {
    const next = boardReducer(board, a.addColumn({ title: ' Review ', id: columnId('review') }))
    expect(next.columnOrder).toEqual(['todo', 'doing', 'done', 'review'])
    expect(next.columns[columnId('review')]).toEqual({ id: 'review', title: 'Review', cardIds: [] })
  })

  it('inserts at the given index', () => {
    const next = boardReducer(board, a.addColumn({ title: 'R', id: columnId('r'), index: 0 }))
    expect(next.columnOrder).toEqual(['r', 'todo', 'doing', 'done'])
  })

  it.each([
    ['an empty title', { title: ' ', id: columnId('r') }],
    ['a duplicate id', { title: 'R', id: columnId('todo') }],
  ])('ignores %s', (_, input) => {
    expect(boardReducer(board, a.addColumn(input))).toBe(board)
  })
})

describe('column/renamed', () => {
  it('renames the column', () => {
    const next = boardReducer(board, a.renameColumn(columnId('todo'), ' Backlog '))
    expect(next.columns[columnId('todo')]?.title).toBe('Backlog')
  })

  it.each([
    ['an unknown column', columnId('nope'), 'X'],
    ['an empty title', columnId('todo'), ''],
    ['the same title', columnId('todo'), 'todo'],
  ])('ignores %s', (_, id, title) => {
    expect(boardReducer(board, a.renameColumn(id, title))).toBe(board)
  })
})

describe('column/deleted', () => {
  it('removes the column and all of its cards', () => {
    const next = boardReducer(board, a.deleteColumn(columnId('todo')))
    expect(next.columnOrder).toEqual(['doing', 'done'])
    expect(next.columns[columnId('todo')]).toBeUndefined()
    expect(Object.keys(next.cards)).toEqual(['d'])
  })

  it('ignores an unknown column', () => {
    expect(boardReducer(board, a.deleteColumn(columnId('nope')))).toBe(board)
  })
})

describe('column/moved', () => {
  it('reorders columns', () => {
    const next = boardReducer(board, a.moveColumn(columnId('done'), 0))
    expect(next.columnOrder).toEqual(['done', 'todo', 'doing'])
    expect(next.columns).toBe(board.columns)
  })

  it.each([
    ['an unknown column', columnId('nope'), 0],
    ['moving to the same position', columnId('doing'), 1],
  ])('ignores %s', (_, id, index) => {
    expect(boardReducer(board, a.moveColumn(id, index))).toBe(board)
  })
})

it('replaying the same actions produces the same state (purity)', () => {
  const actions = [
    a.addColumn({ title: 'R', id: columnId('r') }),
    a.addCard({ columnId: columnId('r'), title: 'X', id: cardId('x'), createdAt: 1 }),
    a.moveCard(cardId('a'), columnId('r'), 0),
    a.deleteColumn(columnId('doing')),
  ]
  const run = () => actions.reduce(boardReducer, board)
  expect(run()).toEqual(run())
})
