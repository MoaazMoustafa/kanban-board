import type { BoardState, Card, CardId, Column, ColumnId } from '@/features/board'

export const cardId = (id: string) => id as CardId
export const columnId = (id: string) => id as ColumnId

export function makeCard(id: string, overrides: Partial<Omit<Card, 'id'>> = {}): Card {
  return {
    id: cardId(id),
    title: `Card ${id}`,
    description: '',
    labels: [],
    createdAt: 0,
    ...overrides,
  }
}

/**
 * Builds a board from a compact layout, e.g. `makeBoard({ todo: ['a', 'b'], done: ['c'] })`.
 * Object key order becomes column order; card titles default to `Card <id>`.
 */
export function makeBoard(layout: Record<string, string[]> = {}): BoardState {
  const cards: Record<CardId, Card> = {}
  const columns: Record<ColumnId, Column> = {}
  const columnOrder: ColumnId[] = []

  for (const [colId, ids] of Object.entries(layout)) {
    columns[columnId(colId)] = { id: columnId(colId), title: colId, cardIds: ids.map(cardId) }
    columnOrder.push(columnId(colId))
    for (const id of ids) cards[cardId(id)] = makeCard(id)
  }

  return { cards, columns, columnOrder }
}

/** Recursively freezes a value so any accidental mutation throws in tests. */
export function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const child of Object.values(value)) deepFreeze(child)
  }
  return value
}

/** The inverse of makeBoard: `{ todo: ['a', 'b'], done: ['c'] }`. Handy for readable assertions. */
export function layoutOf(state: BoardState): Record<string, string[]> {
  return Object.fromEntries(
    state.columnOrder.map((id) => [id, [...(state.columns[id]?.cardIds ?? [])]]),
  )
}
