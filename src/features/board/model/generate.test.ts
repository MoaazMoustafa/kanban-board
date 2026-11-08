import { expect, it } from 'vitest'
import { storedBoardSchema, toStored } from '../persistence/schema'
import { generateBoard } from './generate'
import { selectCardCount } from './selectors'

it('generates the requested size, deterministically', () => {
  const board = generateBoard({ columns: 5, cardsPerColumn: 20 })
  expect(board.columnOrder).toHaveLength(5)
  expect(selectCardCount(board)).toBe(100)
  expect(generateBoard({ columns: 5, cardsPerColumn: 20 })).toEqual(board)
  expect(generateBoard({ columns: 5, cardsPerColumn: 20, seed: 2 })).not.toEqual(board)
})

it('produces a consistent board (passes the storage integrity checks)', () => {
  const board = generateBoard({ columns: 3, cardsPerColumn: 4 })
  expect(storedBoardSchema.safeParse(toStored(board, 1)).success).toBe(true)
})

it('is fast enough for big boards', () => {
  const start = performance.now()
  generateBoard({ columns: 50, cardsPerColumn: 100 })
  expect(performance.now() - start).toBeLessThan(200)
})
