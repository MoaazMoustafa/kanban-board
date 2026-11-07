import { useReducer, type ReactNode } from 'react'
import { createHistory } from '@/shared/lib/history'
import { boardHistoryReducer, type BoardHistory } from '../model/history'
import type { BoardState } from '../model/types'
import { BoardDispatchContext, BoardHistoryContext, BoardStateContext } from './context'

interface BoardProviderProps {
  initialState: BoardState
  children: ReactNode
}

export function BoardProvider({ initialState, children }: BoardProviderProps) {
  const [history, dispatch] = useReducer(boardHistoryReducer, initialState, (state): BoardHistory =>
    createHistory(state),
  )

  return (
    <BoardDispatchContext value={dispatch}>
      <BoardHistoryContext value={history}>
        <BoardStateContext value={history.present}>{children}</BoardStateContext>
      </BoardHistoryContext>
    </BoardDispatchContext>
  )
}
