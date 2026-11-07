import { useCallback, useState } from 'react'
import { DndProvider, useSortableContainer, type DropEvent } from '@/features/dnd'
import { COLUMNS_CONTAINER_ID, DRAG_TYPE, dragToAction } from '../../model/drag'
import { selectColumnOrder } from '../../model/selectors'
import type { CardId } from '../../model/types'
import { BoardDragPreview } from '../../store/BoardDragPreview'
import { useBoardDispatch, useBoardSelector } from '../../store/hooks'
import { AddColumnForm } from '../AddColumnForm/AddColumnForm'
import { CardDetailsDialog } from '../CardDetailsDialog/CardDetailsDialog'
import { ColumnItem } from '../Column/ColumnItem'
import styles from './Board.module.css'

export function Board() {
  const dispatch = useBoardDispatch()
  const handleDrop = useCallback(
    (event: DropEvent) => {
      const action = dragToAction(event)
      if (action) dispatch(action)
    },
    [dispatch],
  )

  return (
    <DndProvider onDrop={handleDrop}>
      <BoardDragPreview>
        <BoardColumns />
      </BoardDragPreview>
    </DndProvider>
  )
}

function BoardColumns() {
  const columnOrder = useBoardSelector(selectColumnOrder)
  // Which card's details are open is UI state, not board data, so it stays out of the reducer.
  const [openCardId, setOpenCardId] = useState<CardId | null>(null)
  const closeCard = useCallback(() => setOpenCardId(null), [])
  const containerRef = useSortableContainer({
    id: COLUMNS_CONTAINER_ID,
    type: DRAG_TYPE.column,
    axis: 'horizontal',
  })

  return (
    <div className={styles.board}>
      <ol ref={containerRef} className={styles.columns} aria-label="Columns">
        {columnOrder.map((columnId) => (
          <ColumnItem key={columnId} columnId={columnId} onOpenCard={setOpenCardId} />
        ))}
        <li className={styles.addColumnSlot}>
          <AddColumnForm />
        </li>
      </ol>
      <CardDetailsDialog cardId={openCardId} onClose={closeCard} />
    </div>
  )
}
