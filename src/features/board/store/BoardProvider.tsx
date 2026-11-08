import { useState, type ReactNode } from 'react'
import type { BoardState } from '../model/types'
import { createBoardStore } from './boardStore'
import { BoardStateSourceContext, BoardStoreContext } from './context'

interface BoardProviderProps {
  initialState: BoardState
  children: ReactNode
}

export function BoardProvider({ initialState, children }: BoardProviderProps) {
  // Created once. The context value never changes, so the provider never re-renders anyone:
  // components re-render only through their own store subscriptions.
  const [store] = useState(() => createBoardStore(initialState))

  return (
    <BoardStoreContext value={store}>
      <BoardStateSourceContext value={store}>{children}</BoardStateSourceContext>
    </BoardStoreContext>
  )
}
