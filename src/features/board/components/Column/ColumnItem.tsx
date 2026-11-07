import { useSortableItem } from '@/features/dnd'
import { COLUMNS_CONTAINER_ID, DRAG_TYPE } from '../../model/drag'
import type { CardId, ColumnId } from '../../model/types'
import { Column } from './Column'
import styles from './Column.module.css'

interface ColumnItemProps {
  columnId: ColumnId
  onOpenCard: (id: CardId) => void
}

/** The sortable slot around a column: the column's header is the drag handle. */
export function ColumnItem({ columnId, onOpenCard }: ColumnItemProps) {
  const { ref, handleProps, isDragging } = useSortableItem({
    id: columnId,
    type: DRAG_TYPE.column,
    containerId: COLUMNS_CONTAINER_ID,
  })

  return (
    <li ref={ref} className={styles.slot} data-dnd-active={isDragging || undefined}>
      <Column columnId={columnId} onOpenCard={onOpenCard} dragHandleProps={handleProps} />
    </li>
  )
}
