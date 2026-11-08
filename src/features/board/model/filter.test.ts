import { describe, expect, it } from 'vitest'
import { cardId, makeCard } from '@/test/factories'
import { cardMatches, isFilterActive, NO_FILTER, toFullDropIndex } from './filter'

describe('cardMatches', () => {
  const card = makeCard('a', {
    title: 'Fix login button',
    description: 'Safari only',
    labels: ['bug', 'urgent'],
  })

  it.each([
    ['', [], true],
    ['login', [], true],
    ['LOGIN safari', [], true], // every word, any field, any case
    ['login chrome', [], false],
    ['', ['bug'], true],
    ['', ['design', 'urgent'], true], // any of the labels
    ['', ['design'], false],
    ['login', ['design'], false],
  ] as const)('query %j, labels %j → %s', (query, labels, expected) => {
    expect(cardMatches(card, { query, labels: [...labels] })).toBe(expected)
  })
})

it('isFilterActive ignores whitespace-only queries', () => {
  expect(isFilterActive(NO_FILTER)).toBe(false)
  expect(isFilterActive({ query: '  ', labels: [] })).toBe(false)
  expect(isFilterActive({ query: 'x', labels: [] })).toBe(true)
  expect(isFilterActive({ query: '', labels: ['bug'] })).toBe(true)
})

/** In these tests, uppercase card IDs are the visible ones. */
const visible = (id: string) => id === id.toUpperCase()

describe('toFullDropIndex', () => {
  // Full column: a B c D e (uppercase = visible), dragging X from elsewhere.
  const ids = ['a', 'B', 'c', 'D', 'e'].map(cardId)
  const index = (visibleIndex: number, active = cardId('X')) =>
    toFullDropIndex(ids, active, visibleIndex, visible)

  it('drops before the visible card it was placed before', () => {
    expect(index(0)).toBe(1) // before B
    expect(index(1)).toBe(3) // before D
  })

  it('drops right after the last visible card, keeping hidden cards below it', () => {
    expect(index(2)).toBe(4) // after D, before hidden e
  })

  it('counts positions without the dragged card when it is in the same column', () => {
    // Dragging B down past D: others are a c D e; after D → index 3.
    expect(toFullDropIndex(ids, cardId('B'), 1, visible)).toBe(3)
  })

  it('drops at the end of a column that shows no cards', () => {
    expect(toFullDropIndex(ids, cardId('X'), 0, () => false)).toBe(5)
  })
})
