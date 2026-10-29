import { describe, expect, it } from 'vitest'
import { cardId, columnId, makeBoard } from '@/test/factories'
import { findColumnIdOfCard, selectCardCount, selectColumnCards } from './selectors'

const board = makeBoard({ todo: ['a', 'b'], done: ['c'] })

describe('selectColumnCards', () => {
  it('returns the cards in display order', () => {
    expect(selectColumnCards(board, columnId('todo')).map((c) => c.id)).toEqual(['a', 'b'])
  })

  it('returns an empty array for an unknown column', () => {
    expect(selectColumnCards(board, columnId('nope'))).toEqual([])
  })
})

describe('findColumnIdOfCard', () => {
  it('finds the column that contains the card', () => {
    expect(findColumnIdOfCard(board, cardId('c'))).toBe('done')
  })

  it('returns undefined for an unknown card', () => {
    expect(findColumnIdOfCard(board, cardId('nope'))).toBeUndefined()
  })
})

it('selectCardCount counts all cards', () => {
  expect(selectCardCount(board)).toBe(3)
})
