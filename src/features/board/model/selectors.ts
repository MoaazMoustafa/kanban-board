import type { BoardState, Card, CardId, Column, ColumnId } from './types'

export const selectCard = (state: BoardState, id: CardId): Card | undefined => state.cards[id]

export const selectColumn = (state: BoardState, id: ColumnId): Column | undefined =>
  state.columns[id]

export const selectColumnOrder = (state: BoardState): readonly ColumnId[] => state.columnOrder

/** Cards of a column, in display order. Allocates a new array: memoize before using in React (Phase 7). */
export function selectColumnCards(state: BoardState, id: ColumnId): Card[] {
  const column = state.columns[id]
  if (!column) return []
  return column.cardIds.flatMap((cardId) => state.cards[cardId] ?? [])
}

/** Linear scan over columns. Fine for tens of columns; cards don't store their column on purpose. */
export function findColumnIdOfCard(state: BoardState, cardId: CardId): ColumnId | undefined {
  return state.columnOrder.find((id) => state.columns[id]?.cardIds.includes(cardId))
}

export const selectCardCount = (state: BoardState): number => Object.keys(state.cards).length
