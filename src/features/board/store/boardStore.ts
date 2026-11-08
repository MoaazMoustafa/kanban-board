import { createHistory, type HistoryAction } from '@/shared/lib/history'
import type { BoardAction } from '../model/actions'
import { boardHistoryReducer, type BoardHistory } from '../model/history'
import type { BoardState } from '../model/types'

/** Anything components can read board state from: the real store, or the drag preview. */
export interface BoardStateSource {
  getState(): BoardState
  subscribe(listener: () => void): () => void
}

export interface BoardStore extends BoardStateSource {
  getHistory(): BoardHistory
  dispatch(action: BoardAction | HistoryAction<BoardState>): void
}

/**
 * The board's state lives outside React. Components subscribe to *slices* of it with
 * useSyncExternalStore, so a change re-renders only the components whose slice changed,
 * which Context can't do (every consumer re-renders when its value changes).
 */
export function createBoardStore(initial: BoardState): BoardStore {
  let history: BoardHistory = createHistory(initial)
  const listeners = new Set<() => void>()

  return {
    getState: () => history.present,
    getHistory: () => history,
    dispatch(action) {
      const next = boardHistoryReducer(history, action)
      if (next === history) return
      history = next
      for (const listener of listeners) listener()
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
