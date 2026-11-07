import type { ReactNode } from 'react'
import { BoardDndProvider, BoardProvider, createSeedBoard } from '@/features/board'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <BoardProvider initialState={createSeedBoard()}>
      <BoardDndProvider>{children}</BoardDndProvider>
    </BoardProvider>
  )
}
