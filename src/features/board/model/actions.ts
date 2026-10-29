import { createCardId, createColumnId } from './ids'
import type { Card, CardId, ColumnId } from './types'

export type CardChanges = Partial<Pick<Card, 'title' | 'description'>>

/** Every way the board can change. The `type` field discriminates the union. */
export type BoardAction =
  | {
      type: 'card/added'
      payload: { card: Card; columnId: ColumnId; index?: number | undefined }
    }
  | { type: 'card/updated'; payload: { cardId: CardId; changes: CardChanges } }
  | { type: 'card/deleted'; payload: { cardId: CardId } }
  | { type: 'card/moved'; payload: { cardId: CardId; toColumnId: ColumnId; toIndex: number } }
  | { type: 'column/added'; payload: { id: ColumnId; title: string; index?: number | undefined } }
  | { type: 'column/renamed'; payload: { columnId: ColumnId; title: string } }
  | { type: 'column/deleted'; payload: { columnId: ColumnId } }
  | { type: 'column/moved'; payload: { columnId: ColumnId; toIndex: number } }

export type BoardActionType = BoardAction['type']

/**
 * Action creators. Impure work (new IDs, timestamps) happens here, so the reducer stays pure
 * and replaying the same actions always produces the same state.
 */
export const boardActions = {
  addCard: (input: {
    columnId: ColumnId
    title: string
    description?: string
    index?: number
    id?: CardId
    createdAt?: number
  }): BoardAction => ({
    type: 'card/added',
    payload: {
      columnId: input.columnId,
      index: input.index,
      card: {
        id: input.id ?? createCardId(),
        title: input.title,
        description: input.description ?? '',
        createdAt: input.createdAt ?? Date.now(),
      },
    },
  }),
  updateCard: (cardId: CardId, changes: CardChanges): BoardAction => ({
    type: 'card/updated',
    payload: { cardId, changes },
  }),
  deleteCard: (cardId: CardId): BoardAction => ({ type: 'card/deleted', payload: { cardId } }),
  moveCard: (cardId: CardId, toColumnId: ColumnId, toIndex: number): BoardAction => ({
    type: 'card/moved',
    payload: { cardId, toColumnId, toIndex },
  }),
  addColumn: (input: { title: string; index?: number; id?: ColumnId }): BoardAction => ({
    type: 'column/added',
    payload: { id: input.id ?? createColumnId(), title: input.title, index: input.index },
  }),
  renameColumn: (columnId: ColumnId, title: string): BoardAction => ({
    type: 'column/renamed',
    payload: { columnId, title },
  }),
  deleteColumn: (columnId: ColumnId): BoardAction => ({
    type: 'column/deleted',
    payload: { columnId },
  }),
  moveColumn: (columnId: ColumnId, toIndex: number): BoardAction => ({
    type: 'column/moved',
    payload: { columnId, toIndex },
  }),
}
