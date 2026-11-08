import { createContext } from 'react'
import type { BoardStateSource, BoardStore } from './boardStore'

/** The real store: dispatch, history, and the committed state. */
export const BoardStoreContext = createContext<BoardStore | null>(null)

/**
 * Where components read state from. Usually the store itself; inside the drag preview, a
 * derived source that shows the board as if the drop had already happened.
 */
export const BoardStateSourceContext = createContext<BoardStateSource | null>(null)
