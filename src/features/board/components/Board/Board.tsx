import { useCallback, useState } from 'react'
import { DndProvider, useSortableContainer, type DragEvent, type DropEvent } from '@/features/dnd'
import { COLUMNS_CONTAINER_ID, describeDrag, DRAG_TYPE, dragToAction } from '../../model/drag'
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

  // The committed state (outside the preview), which describeDrag needs for positions.
  const state = useBoardSelector((s) => s)
  const announce = useCallback((event: DragEvent) => describeDrag(state, event), [state])

  return (
    <DndProvider onDrop={handleDrop} announce={announce}>
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
