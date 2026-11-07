import type { ReactNode } from 'react'
import { BoardProvider, createSeedBoard } from '@/features/board'

export function AppProviders({ children }: { children: ReactNode }) {
  return <BoardProvider initialState={createSeedBoard()}>{children}</BoardProvider>
}
