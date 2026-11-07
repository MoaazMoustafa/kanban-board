import { useEffect, useLayoutEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { DndEngineContext } from './context'
import { createDndEngine, type DropEvent } from './engine'
import './dnd.css'

interface DndProviderProps {
  /** Called once per successful drop. The engine never changes app state itself. */
  onDrop: (event: DropEvent) => void
  children: ReactNode
}

export function DndProvider({ onDrop, children }: DndProviderProps) {
  const [engine] = useState(() => createDndEngine({ onDrop }))
  // Subscribing re-renders the provider on every snapshot change, which runs the effect below.
  useSyncExternalStore(engine.subscribe, engine.getSnapshot)

  useLayoutEffect(() => {
    engine.setOptions({ onDrop })
  }, [engine, onDrop])

  // After every commit (children's refs are attached by now): run FLIP and settle drops.
  useLayoutEffect(() => {
    engine.afterCommit()
  })

  useEffect(() => () => engine.cancel(), [engine])

  return <DndEngineContext value={engine}>{children}</DndEngineContext>
}
