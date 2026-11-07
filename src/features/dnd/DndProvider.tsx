import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { VisuallyHidden } from '@/shared/ui/VisuallyHidden'
import { DndContext } from './context'
import { createDndEngine, type DragEvent, type DropEvent } from './engine'
import './dnd.css'

const DEFAULT_INSTRUCTIONS =
  'To pick up a draggable item, press Space. While dragging, use the arrow keys to move it, ' +
  'Space or Enter to drop it, or Escape to cancel.'

interface DndProviderProps {
  /** Called once per successful drop. The engine never changes app state itself. */
  onDrop: (event: DropEvent) => void
  /** Text for screen readers at each step of a drag. Return undefined to stay silent. */
  announce?: (event: DragEvent) => string | undefined
  instructions?: string
  children: ReactNode
}

export function DndProvider({
  onDrop,
  announce,
  instructions = DEFAULT_INSTRUCTIONS,
  children,
}: DndProviderProps) {
  const [engine] = useState(() => createDndEngine({ onDrop }))
  // Subscribing re-renders the provider on every snapshot change, which runs the effect below.
  useSyncExternalStore(engine.subscribe, engine.getSnapshot)
  const instructionsId = useId()
  const liveRegion = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    engine.setOptions({
      onDrop,
      onEvent(event) {
        const message = announce?.(event)
        const region = liveRegion.current
        if (!message || !region) return
        // Screen readers skip a live region whose text didn't change, so alternate a trailing
        // non-breaking space: repeating "moved to position 1 of 3" is still announced.
        region.textContent = region.textContent === message ? `${message} ` : message
      },
    })
  }, [engine, onDrop, announce])

  // After every commit (children's refs are attached by now): FLIP, focus, and settling drops.
  useLayoutEffect(() => {
    engine.afterCommit()
  })

  useEffect(() => () => engine.cancel(), [engine])

  const value = useMemo(() => ({ engine, instructionsId }), [engine, instructionsId])

  return (
    <DndContext value={value}>
      {children}
      <div id={instructionsId} hidden>
        {instructions}
      </div>
      <VisuallyHidden ref={liveRegion} aria-live="assertive" aria-atomic="true" />
    </DndContext>
  )
}
