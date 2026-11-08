import { assertNever } from '@/shared/lib/assert'
import { arrayMove, insertAt, removeAt } from '@/shared/lib/array'
import { omitKeys } from '@/shared/lib/object'
import type { BoardAction } from './actions'
import { normalizeLabels } from './labels'
import { findColumnIdOfCard } from './selectors'
import type { BoardState, Column } from './types'

type Payload<T extends BoardAction['type']> = Extract<BoardAction, { type: T }>['payload']

export const emptyBoard: BoardState = { cards: {}, columns: {}, columnOrder: [] }

/**
 * Pure reducer: (state, action) → new state, never mutating the input.
 *
 * Invalid actions (unknown IDs, empty titles, moves that change nothing) return the *same*
 * state object instead of throwing. Stale actions are normal once undo/redo and sync exist,
 * and an unchanged reference lets React skip re-rendering and history skip recording.
 */
export function boardReducer(state: BoardState, action: BoardAction): BoardState {
  switch (action.type) {
    case 'card/added':
      return addCard(state, action.payload)
    case 'card/updated':
      return updateCard(state, action.payload)
    case 'card/deleted':
      return deleteCard(state, action.payload)
    case 'card/moved':
      return moveCard(state, action.payload)
    case 'column/added':
      return addColumn(state, action.payload)
    case 'column/renamed':
      return renameColumn(state, action.payload)
    case 'column/deleted':
      return deleteColumn(state, action.payload)
    case 'column/moved':
      return moveColumn(state, action.payload)
    default:
      return assertNever(action, 'Unknown board action')
  }
}

function withColumn(state: BoardState, column: Column): BoardState {
  return { ...state, columns: { ...state.columns, [column.id]: column } }
}

function addCard(state: BoardState, { card, columnId, index }: Payload<'card/added'>): BoardState {
  const column = state.columns[columnId]
  const title = card.title.trim()
  if (!column || !title || state.cards[card.id]) return state

  return {
    ...state,
    cards: { ...state.cards, [card.id]: { ...card, title, labels: normalizeLabels(card.labels) } },
    columns: {
      ...state.columns,
      [columnId]: {
        ...column,
        cardIds: insertAt(column.cardIds, index ?? column.cardIds.length, card.id),
      },
    },
  }
}

function updateCard(state: BoardState, { cardId, changes }: Payload<'card/updated'>): BoardState {
  const card = state.cards[cardId]
  if (!card) return state

  const title = changes.title?.trim() ?? card.title
  const description = changes.description ?? card.description
  const labels = changes.labels ? normalizeLabels(changes.labels) : card.labels
  if (!title) return state
  const sameLabels =
    labels.length === card.labels.length && labels.every((l, i) => l === card.labels[i])
  if (title === card.title && description === card.description && sameLabels) return state

  return {
    ...state,
    cards: {
      ...state.cards,
      // Keep the old array when unchanged, so selectors on labels don't see a "new" value.
      [cardId]: { ...card, title, description, labels: sameLabels ? card.labels : labels },
    },
  }
}

function deleteCard(state: BoardState, { cardId }: Payload<'card/deleted'>): BoardState {
  const columnId = findColumnIdOfCard(state, cardId)
  const column = columnId && state.columns[columnId]
  if (!column) return state

  return {
    ...withColumn(state, { ...column, cardIds: column.cardIds.filter((id) => id !== cardId) }),
    cards: omitKeys(state.cards, [cardId]),
  }
}

function moveCard(
  state: BoardState,
  { cardId, toColumnId, toIndex }: Payload<'card/moved'>,
): BoardState {
  const fromColumnId = findColumnIdOfCard(state, cardId)
  const from = fromColumnId && state.columns[fromColumnId]
  const to = state.columns[toColumnId]
  if (!from || !to) return state

  const fromIndex = from.cardIds.indexOf(cardId)

  if (from.id === to.id) {
    const cardIds = arrayMove(from.cardIds, fromIndex, toIndex)
    if (cardIds.every((id, i) => id === from.cardIds[i])) return state
    return withColumn(state, { ...from, cardIds })
  }

  return withColumn(withColumn(state, { ...from, cardIds: removeAt(from.cardIds, fromIndex) }), {
    ...to,
    cardIds: insertAt(to.cardIds, toIndex, cardId),
  })
}

function addColumn(state: BoardState, { id, title, index }: Payload<'column/added'>): BoardState {
  const trimmed = title.trim()
  if (!trimmed || state.columns[id]) return state

  return {
    ...withColumn(state, { id, title: trimmed, cardIds: [] }),
    columnOrder: insertAt(state.columnOrder, index ?? state.columnOrder.length, id),
  }
}

function renameColumn(
  state: BoardState,
  { columnId, title }: Payload<'column/renamed'>,
): BoardState {
  const column = state.columns[columnId]
  const trimmed = title.trim()
  if (!column || !trimmed || trimmed === column.title) return state

  return withColumn(state, { ...column, title: trimmed })
}

function deleteColumn(state: BoardState, { columnId }: Payload<'column/deleted'>): BoardState {
  const column = state.columns[columnId]
  if (!column) return state

  return {
    cards: omitKeys(state.cards, column.cardIds),
    columns: omitKeys(state.columns, [columnId]),
    columnOrder: state.columnOrder.filter((id) => id !== columnId),
  }
}

function moveColumn(state: BoardState, { columnId, toIndex }: Payload<'column/moved'>): BoardState {
  const fromIndex = state.columnOrder.indexOf(columnId)
  if (fromIndex === -1) return state

  const columnOrder = arrayMove(state.columnOrder, fromIndex, toIndex)
  if (columnOrder.every((id, i) => id === state.columnOrder[i])) return state

  return { ...state, columnOrder }
}
