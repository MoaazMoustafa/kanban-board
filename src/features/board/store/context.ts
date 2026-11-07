import { createContext, type Dispatch } from 'react'
import type { BoardAction } from '../model/actions'
import type { BoardState } from '../model/types'

/*
 * State and dispatch live in separate contexts. `dispatch` never changes, so components that
 * only *send* actions (forms, buttons) don't re-render when the board changes.
 */
export const BoardStateContext = createContext<BoardState | null>(null)
export const BoardDispatchContext = createContext<Dispatch<BoardAction> | null>(null)
