import { boardActions, type BoardAction } from './actions'
import { toFullDropIndexIn, type CardFilter } from './filter'
import type { BoardState, CardId, ColumnId } from './types'

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

/**
 * While filtering, the engine's drop index counts only visible cards; this rewrites it as an
 * index in the full column, so the card lands exactly where it was shown.
 */
export function resolveFilteredDrag<T extends Drag>(
  drag: T,
  state: BoardState,
  filter: CardFilter,
): T {
  if (drag.active.type !== DRAG_TYPE.card) return drag
  const index = toFullDropIndexIn(
    state,
    drag.target.containerId as ColumnId,
    drag.active.id as CardId,
    drag.target.index,
    filter,
  )
  return index === drag.target.index ? drag : { ...drag, target: { ...drag.target, index } }
}

interface DragDescriptionEvent {
  type: 'start' | 'move' | 'drop' | 'cancel'
  active: { id: string; type: string; containerId: string }
  target: { containerId: string; index: number } | null
}

/**
 * Screen-reader text for each step of a drag, e.g.
 * "Picked up card “Fix login”, position 2 of 3 in To do."
 * Reads the committed state (the preview never changes it), so positions are computed here.
 */
export function describeDrag(state: BoardState, event: DragDescriptionEvent): string | undefined {
  const { active } = event
  const isCard = active.type === DRAG_TYPE.card
  const title = isCard
    ? state.cards[active.id as CardId]?.title
    : state.columns[active.id as ColumnId]?.title
  if (title === undefined) return undefined
  const name = `${isCard ? 'card' : 'column'} “${title}”`

  const place = (target: { containerId: string; index: number }) => {
    if (!isCard) return `position ${target.index + 1} of ${state.columnOrder.length}`
    const column = state.columns[target.containerId as ColumnId]
    if (!column) return undefined
    const total = column.cardIds.length + (column.cardIds.includes(active.id as CardId) ? 0 : 1)
    return `position ${target.index + 1} of ${total} in ${column.title}`
  }

  if (event.type === 'cancel') {
    const home = isCard
      ? state.columns[active.containerId as ColumnId]?.cardIds.indexOf(active.id as CardId)
      : state.columnOrder.indexOf(active.id as ColumnId)
    const where =
      home === undefined ? undefined : place({ containerId: active.containerId, index: home })
    return `Movement cancelled. ${capitalize(name)} returned to ${where ?? 'its original position'}.`
  }

  const where = event.target && place(event.target)
  if (!where) return undefined
  switch (event.type) {
    case 'start':
      return `Picked up ${name}, ${where}.`
    case 'move':
      return `${capitalize(name)} moved to ${where}.`
    case 'drop':
      return `${capitalize(name)} dropped at ${where}.`
  }
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)
