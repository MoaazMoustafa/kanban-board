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
export function CardItem({ cardId, columnId, onOpen }: CardItemProps) {
  const { ref, handleProps, isDragging } = useSortableItem({
    id: cardId,
    type: DRAG_TYPE.card,
    containerId: columnId,
  })

  return (
    <li ref={ref} data-dnd-active={isDragging || undefined}>
      <Card cardId={cardId} onOpen={onOpen} dragHandleProps={handleProps} />
    </li>
  )
}
