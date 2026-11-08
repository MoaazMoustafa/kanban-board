import { memo } from 'react'
import { useSortableItem } from '@/features/dnd'
import { DRAG_TYPE } from '../../model/drag'
import type { CardId, ColumnId } from '../../model/types'
import { Card } from './Card'

interface CardItemProps {
  cardId: CardId
  columnId: ColumnId
  onOpen: (id: CardId) => void
}

/** The sortable list item around a card; the whole card is the drag handle. */
function CardItemBase({ cardId, columnId, onOpen }: CardItemProps) {
  const { ref, handleProps, describedBy, dragMode } = useSortableItem({
    id: cardId,
    type: DRAG_TYPE.card,
    containerId: columnId,
  })

  return (
    <li ref={ref} data-dnd-active={dragMode ?? undefined}>
      <Card
        cardId={cardId}
        onOpen={onOpen}
        dragHandleProps={handleProps}
        dragDescribedBy={describedBy}
      />
    </li>
  )
}

/**
 * Memoized: its props are IDs and stable callbacks, so it re-renders only through its own
 * store subscriptions, not whenever its parent list re-renders.
 */
export const CardItem = memo(CardItemBase)
