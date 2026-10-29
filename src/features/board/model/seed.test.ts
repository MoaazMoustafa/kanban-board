import { expect, it } from 'vitest'
import { selectCardCount } from './selectors'
import { createSeedBoard } from './seed'

it('creates a deterministic, populated demo board', () => {
  const board = createSeedBoard()
  expect(board.columnOrder).toHaveLength(4)
  expect(selectCardCount(board)).toBe(8)
  expect(createSeedBoard()).toEqual(board)
})
