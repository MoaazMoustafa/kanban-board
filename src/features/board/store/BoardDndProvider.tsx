import { useCallback, type ReactNode } from 'react'
import { DndProvider, type DragEvent, type DropEvent } from '@/features/dnd'
import { describeDrag, dragToAction, resolveFilteredDrag } from '../model/drag'
import { BoardDragPreview } from './BoardDragPreview'
import { useFilterStore } from './filterStore'
import { useBoardStore } from './hooks'

/**
 * Drag-and-drop for the board: commits drops, announces each step, and shows the live preview
 * to everything below. Placed high in the tree so app chrome (like undo buttons) can see drags.
 */
export function BoardDndProvider({ children }: { children: ReactNode }) {
  const store = useBoardStore()
  const filters = useFilterStore()

  const handleDrop = useCallback(
    (event: DropEvent) => {
      const action = dragToAction(resolveFilteredDrag(event, store.getState(), filters.get()))
      if (action) store.dispatch(action)
    },
    [store, filters],
  )

  // Reads the committed state when an event happens, instead of subscribing: this provider
  // never needs to re-render because the board changed.
  const announce = useCallback(
    (event: DragEvent) => {
      const state = store.getState()
      // Positions are announced in the full column, matching where the card will be saved.
      const resolved = event.target ? resolveFilteredDrag(event, state, filters.get()) : event
      return describeDrag(state, resolved)
    },
    [store, filters],
  )

  return (
    <DndProvider onDrop={handleDrop} announce={announce}>
      <BoardDragPreview>{children}</BoardDragPreview>
    </DndProvider>
  )
}
