import { createContext, use, useSyncExternalStore } from 'react'
import type { BoardSync, SyncStatus } from '../persistence/sync'

export const BoardSyncContext = createContext<BoardSync | null>(null)

function useBoardSync(): BoardSync {
  const sync = use(BoardSyncContext)
  if (!sync) throw new Error('Must be used inside <BoardSyncProvider>')
  return sync
}

export function useSyncStatus(): { status: SyncStatus; retryNow: () => void } {
  const sync = useBoardSync()
  const status = useSyncExternalStore(sync.subscribe, sync.getStatus)
  return { status, retryNow: sync.retryNow }
}
