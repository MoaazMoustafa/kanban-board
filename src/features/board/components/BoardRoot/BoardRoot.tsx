import { Suspense, use, useEffect, useRef, useState } from 'react'
import { AppShell } from '@/shared/ui/AppShell'
import { Button } from '@/shared/ui/Button'
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary'
import { useToast } from '@/shared/ui/toastContext'
import { VisuallyHidden } from '@/shared/ui/VisuallyHidden'
import { loadBoard, type LoadedBoard } from '../../persistence/loadBoard'
import type { BoardRepository } from '../../persistence/repository'
import { BoardDndProvider } from '../../store/BoardDndProvider'
import { BoardProvider } from '../../store/BoardProvider'
import { BoardSyncProvider } from '../../store/BoardSyncProvider'
import { Board } from '../Board/Board'
import { HistoryControls } from '../HistoryControls/HistoryControls'
import { SaveStatus } from '../SaveStatus/SaveStatus'
import styles from './BoardRoot.module.css'

/**
 * Loads the board and renders the app. Loading uses Suspense: `use(promise)` suspends until the
 * board arrives, and a rejected promise is caught by the error boundary, which offers a retry.
 */
/**
 * Starts a load. StrictMode runs state initializers twice in development and drops one result;
 * a dropped promise that rejects would be reported as an unhandled rejection. Attaching a no-op
 * handler marks it handled; the promise we keep still rejects for `use()` and the error boundary.
 */
function startLoading(repository: BoardRepository): Promise<LoadedBoard> {
  const promise = loadBoard(repository)
  promise.catch(() => {})
  return promise
}

export function BoardRoot({ repository }: { repository: BoardRepository }) {
  // Created once per attempt and kept in state: a new promise every render would loop forever.
  const [loading, setLoading] = useState(() => startLoading(repository))

  return (
    <ErrorBoundary
      renderFallback={({ reset }) => (
        <AppShell>
          <LoadError
            onRetry={() => {
              setLoading(startLoading(repository))
              reset()
            }}
          />
        </AppShell>
      )}
    >
      <Suspense
        fallback={
          <AppShell>
            <BoardSkeleton />
          </AppShell>
        }
      >
        <LoadedBoardView loading={loading} repository={repository} />
      </Suspense>
    </ErrorBoundary>
  )
}

function LoadedBoardView({
  loading,
  repository,
}: {
  loading: Promise<LoadedBoard>
  repository: BoardRepository
}) {
  const { snapshot, recovered } = use(loading)
  const toast = useToast()
  const notified = useRef(false)

  useEffect(() => {
    if (!recovered || notified.current) return
    notified.current = true // StrictMode runs effects twice in development.
    toast({
      message: `Your saved board couldn't be read, so a fresh one was started. The old data was kept in localStorage under “${recovered.backupKey}”.`,
      tone: 'error',
    })
  }, [recovered, toast])

  return (
    <BoardProvider initialState={snapshot.board}>
      <BoardSyncProvider repository={repository} initial={snapshot}>
        <BoardDndProvider>
          <AppShell
            actions={
              <>
                <SaveStatus />
                <HistoryControls />
              </>
            }
          >
            <Board />
          </AppShell>
        </BoardDndProvider>
      </BoardSyncProvider>
    </BoardProvider>
  )
}

function BoardSkeleton() {
  return (
    // <output> is meant for the result of a calculation; a loading message is a plain status.
    // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
    <div className={styles.skeleton} role="status" aria-busy="true">
      <VisuallyHidden>Loading board…</VisuallyHidden>
      {[3, 2, 4].map((cards, i) => (
        <div key={i} className={styles.skeletonColumn} aria-hidden="true">
          <div className={styles.skeletonTitle} />
          {Array.from({ length: cards }, (_, j) => (
            <div key={j} className={styles.skeletonCard} />
          ))}
        </div>
      ))}
    </div>
  )
}

function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className={styles.error} role="alert">
      <h2 className={styles.errorTitle}>Couldn't load your board</h2>
      <p className={styles.errorText}>Check your connection and try again.</p>
      <Button variant="primary" onClick={onRetry}>
        Try again
      </Button>
    </div>
  )
}
