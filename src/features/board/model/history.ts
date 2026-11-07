import { withHistory, type History } from '@/shared/lib/history'
import type { BoardAction } from './actions'
import { boardReducer } from './reducer'
import type { BoardState } from './types'

export type BoardHistory = History<BoardState, BoardAction>

/**
 * Every board action is undoable: they are all changes to the user's data. UI-only state
 * (open dialog, drag preview) never goes through the reducer, so it can't pollute history.
 */
export const boardHistoryReducer = withHistory(boardReducer, { limit: 100 })

/**
 * A short label for an action, e.g. "Move card “Fix login”", for undo buttons and announcements.
 * `before` is the state the action was applied to, so even deleted items still have their titles.
 */
export function describeAction(action: BoardAction, before: BoardState): string {
  const card = (id: keyof BoardState['cards']) => `card “${before.cards[id]?.title ?? ''}”`
  const column = (id: keyof BoardState['columns']) => `column “${before.columns[id]?.title ?? ''}”`

  switch (action.type) {
    case 'card/added':
      return `Add card “${action.payload.card.title.trim()}”`
    case 'card/updated':
      return `Edit ${card(action.payload.cardId)}`
    case 'card/deleted':
      return `Delete ${card(action.payload.cardId)}`
    case 'card/moved':
      return `Move ${card(action.payload.cardId)}`
    case 'column/added':
      return `Add column “${action.payload.title.trim()}”`
    case 'column/renamed':
      return `Rename ${column(action.payload.columnId)}`
    case 'column/deleted':
      return `Delete ${column(action.payload.columnId)}`
    case 'column/moved':
      return `Move ${column(action.payload.columnId)}`
  }
}
