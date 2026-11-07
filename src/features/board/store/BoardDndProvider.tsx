import { useCallback, type ReactNode } from 'react'
import { DndProvider, type DragEvent, type DropEvent } from '@/features/dnd'
import { describeDrag, dragToAction } from '../model/drag'
import { BoardDragPreview } from './BoardDragPreview'
import { useBoardDispatch, useBoardSelector } from './hooks'

/**
 * Drag-and-drop for the board: commits drops, announces each step, and shows the live preview
 * to everything below. Placed high in the tree so app chrome (like undo buttons) can see drags.
 */
export function BoardDndProvider({ children }: { children: ReactNode }) {
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
      <BoardDragPreview>{children}</BoardDragPreview>
    </DndProvider>
  )
}
