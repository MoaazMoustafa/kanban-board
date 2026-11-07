import { createContext } from 'react'
import type { DndEngine } from './engine'

export interface DndContextValue {
  engine: DndEngine
  /** ID of the hidden keyboard instructions; handles point to it with aria-describedby. */
  instructionsId: string
}

export const DndContext = createContext<DndContextValue | null>(null)
