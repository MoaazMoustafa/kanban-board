import type { LabelId } from './labels'
import type { BoardState, Card, CardId, ColumnId } from './types'

/** What the user is filtering by. UI state: not saved, not undoable. */
export interface CardFilter {
  readonly query: string
  /** A card matches if it has *any* of these labels. Empty means "any card". */
  readonly labels: readonly LabelId[]
}

export const NO_FILTER: CardFilter = { query: '', labels: [] }

export const isFilterActive = (filter: CardFilter) =>
  filter.query.trim() !== '' || filter.labels.length > 0

/** Every word of the query must appear in the title or description (case-insensitive). */
export function cardMatches(card: Card, filter: CardFilter): boolean {
  if (filter.labels.length > 0 && !card.labels.some((label) => filter.labels.includes(label))) {
    return false
  }
  const words = filter.query.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  const text = `${card.title} ${card.description}`.toLowerCase()
  return words.every((word) => text.includes(word))
}

/**
 * While filtered, the drag engine only sees visible cards, so its drop index counts visible
 * cards. This converts it to an index in the full list (both "among the other cards", the
 * reducer's convention):
 * - before the i-th visible card → just before that card in the full list;
 * - after the last visible card → just after it (hidden cards further down stay below);
 * - into a column showing no cards → at the end.
 */
export function toFullDropIndex(
  cardIds: readonly CardId[],
  activeId: CardId,
  visibleIndex: number,
  isVisible: (id: CardId) => boolean,
): number {
  const others = cardIds.filter((id) => id !== activeId)
  const visibleOthers = others.filter(isVisible)

  const before = visibleOthers[visibleIndex]
  if (before) return others.indexOf(before)
  const last = visibleOthers.at(-1)
  return last ? others.indexOf(last) + 1 : others.length
}

/** Convenience for a column in a board. */
export function toFullDropIndexIn(
  state: BoardState,
  columnId: ColumnId,
  activeId: CardId,
  visibleIndex: number,
  filter: CardFilter,
): number {
  const column = state.columns[columnId]
  if (!column || !isFilterActive(filter)) return visibleIndex
  // The dragged card stays visible even if it doesn't match: it is in the user's hand.
  const isVisible = (id: CardId) => {
    const card = state.cards[id]
    return id === activeId || (card !== undefined && cardMatches(card, filter))
  }
  return toFullDropIndex(column.cardIds, activeId, visibleIndex, isVisible)
}
