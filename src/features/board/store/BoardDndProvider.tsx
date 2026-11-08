import { useCallback, type ReactNode } from 'react'
import { DndProvider, type DragEvent, type DropEvent } from '@/features/dnd'
import { describeDrag, dragToAction } from '../model/drag'
import { BoardDragPreview } from './BoardDragPreview'
import { useBoardStore } from './hooks'

/**
 * Drag-and-drop for the board: commits drops, announces each step, and shows the live preview
 * to everything below. Placed high in the tree so app chrome (like undo buttons) can see drags.
 */
export function BoardDndProvider({ children }: { children: ReactNode }) {
  const store = useBoardStore()

  const handleDrop = useCallback(
    (event: DropEvent) => {
      const action = dragToAction(event)
      if (action) store.dispatch(action)
    },
    [store],
  )

  // Reads the committed state when an event happens, instead of subscribing: this provider
  // never needs to re-render because the board changed.
  const announce = useCallback((event: DragEvent) => describeDrag(store.getState(), event), [store])

  return (
    <DndProvider onDrop={handleDrop} announce={announce}>
      <BoardDragPreview>{children}</BoardDragPreview>
    </DndProvider>
  )
}
