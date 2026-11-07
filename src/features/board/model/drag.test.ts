import { describe, expect, it } from 'vitest'
import { layoutOf, makeBoard } from '@/test/factories'
import { COLUMNS_CONTAINER_ID, DRAG_TYPE, dragToAction } from './drag'
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
