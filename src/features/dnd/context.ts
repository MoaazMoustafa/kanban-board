import { createContext } from 'react'
import type { DndEngine } from './engine'

export const DndEngineContext = createContext<DndEngine | null>(null)
