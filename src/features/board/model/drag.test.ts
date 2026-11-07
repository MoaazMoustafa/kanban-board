import { describe, expect, it } from 'vitest'
import { layoutOf, makeBoard } from '@/test/factories'
import { COLUMNS_CONTAINER_ID, describeDrag, DRAG_TYPE, dragToAction } from './drag'
import { boardReducer } from './reducer'

const board = makeBoard({ todo: ['a', 'b'], done: ['c'] })
const apply = (drag: Parameters<typeof dragToAction>[0]) => {
  const action = dragToAction(drag)
  return action ? boardReducer(board, action) : board
}

describe('dragToAction', () => {
  it('moves a card to the target column and index', () => {
    const next = apply({
      active: { id: 'a', type: DRAG_TYPE.card },
      target: { containerId: 'done', index: 1 },
    })
    expect(layoutOf(next)).toEqual({ todo: ['b'], done: ['c', 'a'] })
  })

  it('moves a column', () => {
    const next = apply({
      active: { id: 'done', type: DRAG_TYPE.column },
      target: { containerId: COLUMNS_CONTAINER_ID, index: 0 },
    })
    expect(next.columnOrder).toEqual(['done', 'todo'])
  })

  it('ignores unknown drag types', () => {
    expect(
      dragToAction({ active: { id: 'a', type: 'image' }, target: { containerId: 'x', index: 0 } }),
    ).toBeNull()
  })
})

describe('describeDrag', () => {
  const card = { id: 'a', type: DRAG_TYPE.card, containerId: 'todo' }
  const column = { id: 'done', type: DRAG_TYPE.column, containerId: COLUMNS_CONTAINER_ID }

  it('describes picking up a card', () => {
    expect(
      describeDrag(board, {
        type: 'start',
        active: card,
        target: { containerId: 'todo', index: 0 },
      }),
    ).toBe('Picked up card “Card a”, position 1 of 2 in todo.')
  })

  it('counts the card itself when it moves into another column', () => {
    expect(
      describeDrag(board, {
        type: 'move',
        active: card,
        target: { containerId: 'done', index: 1 },
      }),
    ).toBe('Card “Card a” moved to position 2 of 2 in done.')
  })

  it('describes a drop', () => {
    expect(
      describeDrag(board, {
        type: 'drop',
        active: card,
        target: { containerId: 'todo', index: 1 },
      }),
    ).toBe('Card “Card a” dropped at position 2 of 2 in todo.')
  })

  it('describes a cancel with the original position', () => {
    expect(describeDrag(board, { type: 'cancel', active: card, target: null })).toBe(
      'Movement cancelled. Card “Card a” returned to position 1 of 2 in todo.',
    )
  })

  it('describes columns without a container name', () => {
    expect(
      describeDrag(board, {
        type: 'move',
        active: column,
        target: { containerId: COLUMNS_CONTAINER_ID, index: 0 },
      }),
    ).toBe('Column “done” moved to position 1 of 2.')
  })

  it('stays silent for unknown items', () => {
    expect(
      describeDrag(board, {
        type: 'start',
        active: { ...card, id: 'nope' },
        target: { containerId: 'todo', index: 0 },
      }),
    ).toBeUndefined()
  })
})
