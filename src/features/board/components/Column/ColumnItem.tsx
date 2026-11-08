import { memo } from 'react'
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
function ColumnItemBase({ columnId, onOpenCard }: ColumnItemProps) {
  const { ref, handleProps, describedBy, dragMode } = useSortableItem({
    id: columnId,
    type: DRAG_TYPE.column,
    containerId: COLUMNS_CONTAINER_ID,
  })

  return (
    <li ref={ref} className={styles.slot} data-dnd-active={dragMode ?? undefined}>
      <Column
        columnId={columnId}
        onOpenCard={onOpenCard}
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
export const ColumnItem = memo(ColumnItemBase)
