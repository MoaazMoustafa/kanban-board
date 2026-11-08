import { createContext, type Dispatch } from 'react'
import type { HistoryAction } from '@/shared/lib/history'
import type { BoardAction } from '../model/actions'
import type { BoardHistory } from '../model/history'
import type { BoardState } from '../model/types'

export type BoardDispatch = Dispatch<BoardAction | HistoryAction<BoardState>>

/*
 * State and dispatch live in separate contexts. `dispatch` never changes, so components that
 * only *send* actions (forms, buttons) don't re-render when the board changes.
 * History has its own context: only undo/redo controls care about it.
 */
export const BoardStateContext = createContext<BoardState | null>(null)
export const BoardDispatchContext = createContext<BoardDispatch | null>(null)
export const BoardHistoryContext = createContext<BoardHistory | null>(null)
