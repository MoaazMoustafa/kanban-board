import { useReducer, type ReactNode } from 'react'
import { boardReducer } from '../model/reducer'
import type { BoardState } from '../model/types'
import { BoardDispatchContext, BoardStateContext } from './context'

interface BoardProviderProps {
  initialState: BoardState
  children: ReactNode
}

export function BoardProvider({ initialState, children }: BoardProviderProps) {
  const [state, dispatch] = useReducer(boardReducer, initialState)

  return (
    <BoardDispatchContext value={dispatch}>
      <BoardStateContext value={state}>{children}</BoardStateContext>
    </BoardDispatchContext>
  )
}
