import {
  use,
  useCallback,
  useMemo,
  useSyncExternalStore,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type RefCallback,
} from 'react'
import type { Axis } from './core/types'
import { DndContext, type DndContextValue } from './context'
import type { DragMode, DragSnapshot } from './engine'

function useDndContext(): DndContextValue {
  const context = use(DndContext)
  if (!context) throw new Error('Drag-and-drop hooks must be used inside <DndProvider>')
  return context
}

/** The current drag: status, mode, active item and drop target. Re-renders when any change. */
export function useDragState(): DragSnapshot {
  const { engine } = useDndContext()
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
  const { engine } = useDndContext()
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
  /**
   * Spread onto the element the user grabs: the item itself, or a header acting as a handle.
   * If the handle isn't focusable, the first focusable element inside it is used for keyboard focus.
   */
  handleProps: {
    onPointerDown: (event: ReactPointerEvent) => void
    onKeyDown: (event: ReactKeyboardEvent) => void
    'data-dnd-handle': ''
  }
  /** ID of the keyboard instructions, for the focusable handle's aria-describedby. */
  describedBy: string
  /** How this item is being dragged right now, or null. Style the placeholder from it. */
  dragMode: DragMode | null
}

export function useSortableItem({ id, type, containerId }: SortableItemOptions): SortableItem {
  const { engine, instructionsId } = useDndContext()
  const { active, mode } = useDragState()

  const ref = useCallback(
    (element: HTMLElement | null) =>
      element ? engine.registerItem({ id, type, containerId, element }) : undefined,
    [engine, id, type, containerId],
  )

  const handleProps = useMemo(
    () => ({
      onPointerDown: (event: ReactPointerEvent) => engine.handlePointerDown(event.nativeEvent, id),
      onKeyDown: (event: ReactKeyboardEvent) => engine.handleKeyDown(event.nativeEvent, id),
      'data-dnd-handle': '' as const,
    }),
    [engine, id],
  )

  return {
    ref,
    handleProps,
    describedBy: instructionsId,
    dragMode: active?.id === id ? mode : null,
  }
}
