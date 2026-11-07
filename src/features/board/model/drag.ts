import { boardActions, type BoardAction } from './actions'
import type { CardId, ColumnId } from './types'

/** Drag types and the container that holds the columns. Board-specific names for the generic engine. */
export const DRAG_TYPE = { card: 'card', column: 'column' } as const
export const COLUMNS_CONTAINER_ID = 'board-columns'

interface Drag {
  active: { id: string; type: string }
  target: { containerId: string; index: number }
}

/**
 * Translates a drag into a board action. Used twice: to compute the live preview while dragging,
 * and to commit on drop, so what you see while dragging is exactly what you get.
 * Card containers are columns, so a card's target container ID is a ColumnId.
 */
export function dragToAction({ active, target }: Drag): BoardAction | null {
  switch (active.type) {
    case DRAG_TYPE.card:
      return boardActions.moveCard(
        active.id as CardId,
        target.containerId as ColumnId,
        target.index,
      )
    case DRAG_TYPE.column:
      return boardActions.moveColumn(active.id as ColumnId, target.index)
    default:
      return null
  }
}
