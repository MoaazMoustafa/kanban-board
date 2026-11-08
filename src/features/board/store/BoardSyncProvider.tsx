import { useEffect, useState, type ReactNode } from 'react'
import { historyActions } from '@/shared/lib/history'
import { useToast } from '@/shared/ui/toastContext'
import type { BoardRepository, BoardSnapshot } from '../persistence/repository'
import { createBoardSync, type ReplaceReason } from '../persistence/sync'
import { useBoardStore } from './hooks'
import { BoardSyncContext } from './syncContext'

const REPLACE_MESSAGES: Record<ReplaceReason, { message: string; tone: 'info' | 'error' } | null> =
  {
    remote: null, // Another tab saved and we had nothing unsaved: just show it.
    conflict: {
      message: 'This board was changed in another tab, so you are now seeing the latest version.',
      tone: 'info',
    },
    rejected: { message: "Couldn't save your recent changes, so they were undone.", tone: 'error' },
  }

interface BoardSyncProviderProps {
  repository: BoardRepository
  initial: BoardSnapshot
  children: ReactNode
}

/**
 * Saves the committed board (it sits outside the drag preview) and applies boards that arrive
 * from elsewhere. Must be inside BoardProvider and ToastProvider.
 */
export function BoardSyncProvider({ repository, initial, children }: BoardSyncProviderProps) {
  const store = useBoardStore()
  const toast = useToast()

  // Created once; it only starts doing anything when connected below.
  const [sync] = useState(() =>
    createBoardSync({
      repository,
      initial,
      onReplace(next, reason) {
        // Resets history too: old snapshots would bring back what the server just rejected.
        store.dispatch(historyActions.reset(next))
        const notice = REPLACE_MESSAGES[reason]
        if (notice) toast(notice)
      },
    }),
  )

  useEffect(() => sync.connect(), [sync])

  // Subscribes directly instead of selecting state: saving never needs a re-render.
  useEffect(() => {
    sync.update(store.getState())
    return store.subscribe(() => sync.update(store.getState()))
  }, [sync, store])

  // Tell the user once when saving starts failing; the header shows the ongoing status.
  useEffect(
    () =>
      sync.subscribe(() => {
        const status = sync.getStatus()
        if (status.kind === 'retrying' && status.attempt === 1) {
          toast({
            message: "Couldn't save. Your changes are kept and will be retried.",
            tone: 'error',
            action: { label: 'Retry now', onClick: sync.retryNow },
          })
        }
      }),
    [sync, toast],
  )

  useEffect(() => {
    // Save right away when the tab is hidden (it may never come back), skipping the debounce.
    const onVisibility = () => document.visibilityState === 'hidden' && sync.flush()
    const onOnline = () => sync.retryNow()
    // Only a slow (remote) save can still be pending here; warn before losing it.
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      sync.flush()
      if (sync.hasUnsavedChanges()) event.preventDefault()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('online', onOnline)
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
  }, [sync])

  return <BoardSyncContext value={sync}>{children}</BoardSyncContext>
}
