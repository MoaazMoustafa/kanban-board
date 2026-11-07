import {
  use,
  useCallback,
  useSyncExternalStore,
  type PointerEvent as ReactPointerEvent,
  type RefCallback,
} from 'react'
import type { Axis } from './core/types'
import { DndEngineContext } from './context'
import type { DndEngine, DragSnapshot } from './engine'

function useEngine(): DndEngine {
  const engine = use(DndEngineContext)
  if (!engine) throw new Error('Drag-and-drop hooks must be used inside <DndProvider>')
  return engine
}

/** The current drag: status, active item and drop target. Re-renders when any of them change. */
export function useDragState(): DragSnapshot {
  const engine = useEngine()
  return useSyncExternalStore(engine.subscribe, engine.getSnapshot)
}

interface SortableContainerOptions {
  id: string
  /** Only items of this type can be dropped here. */
  type: string
  axis: Axis
}

/** Registers a list whose direct children are sortable items. Give it `position: relative`. */
export function useSortableContainer({
  id,
  type,
  axis,
}: SortableContainerOptions): RefCallback<HTMLElement> {
  const engine = useEngine()
  return useCallback(
    (element: HTMLElement | null) =>
      element ? engine.registerContainer({ id, type, axis, element }) : undefined,
    [engine, id, type, axis],
  )
}

interface SortableItemOptions {
  id: string
  type: string
  containerId: string
}

export interface SortableItem {
  /** Attach to the item element: a direct child of its container. */
  ref: RefCallback<HTMLElement>
  /** Spread onto the element the user grabs (the item itself, or a header acting as a handle). */
  handleProps: { onPointerDown: (event: ReactPointerEvent) => void }
  /** This item is the one being dragged; render it as a placeholder. */
  isDragging: boolean
}

export function useSortableItem({ id, type, containerId }: SortableItemOptions): SortableItem {
  const engine = useEngine()
  const { active } = useDragState()

  const ref = useCallback(
    (element: HTMLElement | null) =>
      element ? engine.registerItem({ id, type, containerId, element }) : undefined,
    [engine, id, type, containerId],
  )

  const onPointerDown = useCallback(
    (event: ReactPointerEvent) => engine.handlePointerDown(event.nativeEvent, id),
    [engine, id],
  )

  return { ref, handleProps: { onPointerDown }, isDragging: active?.id === id }
}
