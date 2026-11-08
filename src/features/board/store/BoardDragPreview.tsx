import { useState, type ReactNode } from 'react'
import { useDragStore, type DragSnapshot, type DragStore } from '@/features/dnd'
import { dragToAction, resolveFilteredDrag } from '../model/drag'
import type { CardFilter } from '../model/filter'
import { boardReducer } from '../model/reducer'
import type { BoardState } from '../model/types'
import type { BoardStateSource } from './boardStore'
import { BoardStateSourceContext } from './context'
import { useFilterStore, type FilterStore } from './filterStore'
import { useBoardStore } from './hooks'

/**
 * A state source that shows the board *as if* the current drag had already been dropped:
 * the real reducer applied to the real state, without dispatching. Recomputed only when the
 * board or the drag changes, and cached so subscribers get the same object until then.
 */
function createPreviewSource(
  base: BoardStateSource,
  drag: DragStore,
  filters: FilterStore,
): BoardStateSource {
  let cache:
    | { state: BoardState; snapshot: DragSnapshot; filter: CardFilter; preview: BoardState }
    | undefined

  return {
    getState() {
      const state = base.getState()
      const snapshot = drag.getSnapshot()
      const filter = filters.get()
      if (cache?.state === state && cache.snapshot === snapshot && cache.filter === filter) {
        return cache.preview
      }

      const { status, active, target } = snapshot
      const action =
        status === 'dragging' &&
        active &&
        target &&
        dragToAction(resolveFilteredDrag({ active, target }, state, filter))
      const preview = action ? boardReducer(state, action) : state
      cache = { state, snapshot, filter, preview }
      return preview
    },
    subscribe(listener) {
      const unsubscribeBase = base.subscribe(listener)
      const unsubscribeDrag = drag.subscribe(listener)
      const unsubscribeFilter = filters.subscribe(listener)
      return () => {
        unsubscribeBase()
        unsubscribeDrag()
        unsubscribeFilter()
      }
    },
  }
}

/**
 * Everything below reads the preview: the DOM reorders itself while dragging, so the dragged
 * item's own element is the placeholder. Escape drops the preview; a drop dispatches for real.
 */
export function BoardDragPreview({ children }: { children: ReactNode }) {
  const store = useBoardStore()
  const drag = useDragStore()
  const filters = useFilterStore()
  const [source] = useState(() => createPreviewSource(store, drag, filters))

  return <BoardStateSourceContext value={source}>{children}</BoardStateSourceContext>
}
