import type { BoardState } from '../model/types'
import { ConflictError, NetworkError, RejectedError } from './errors'
import type { BoardRepository, BoardSnapshot } from './repository'

export type SyncStatus =
  | { readonly kind: 'saved' }
  | { readonly kind: 'saving' }
  | { readonly kind: 'retrying'; readonly retryAt: number; readonly attempt: number }

/** Why the synced board replaced the local one. */
export type ReplaceReason = 'remote' | 'conflict' | 'rejected'

export interface BoardSyncOptions {
  repository: BoardRepository
  initial: BoardSnapshot
  /** The local board must become `board`: another tab saved, or our changes were undone. */
  onReplace: (board: BoardState, reason: ReplaceReason) => void
  debounceMs?: number
  /** Waits between retries after network errors; the last one repeats. */
  retryDelays?: readonly number[]
  now?: () => number
}

export type BoardSync = ReturnType<typeof createBoardSync>

const SAVED: SyncStatus = { kind: 'saved' }

/**
 * Keeps the local (optimistic) board and the stored one in step.
 *
 * - `confirmed` is what the server last acknowledged; `local` is what the user sees.
 * - Saves are debounced, and only one is ever in flight. Changes made meanwhile are coalesced
 *   into the next save, so responses can't arrive out of order and overwrite newer data.
 * - Network errors keep the user's work and retry with backoff.
 * - A conflict (another tab saved first) or a rejection replaces the local board, via `onReplace`.
 */
export function createBoardSync({
  repository,
  initial,
  onReplace,
  debounceMs = 300,
  retryDelays = [1000, 2000, 5000, 10_000, 30_000],
  now = Date.now,
}: BoardSyncOptions) {
  let confirmed = initial
  let local = initial.board
  let inFlight = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let attempt = 0
  let status: SyncStatus = SAVED
  let connected = false
  let unsubscribe: (() => void) | undefined
  const listeners = new Set<() => void>()

  function setStatus(next: SyncStatus) {
    if (next === status) return
    status = next
    for (const listener of listeners) listener()
  }

  function settle() {
    if (!inFlight && local === confirmed.board) setStatus(SAVED)
  }

  function replace(snapshot: BoardSnapshot, reason: ReplaceReason) {
    confirmed = snapshot
    local = snapshot.board
    attempt = 0
    clearTimeout(timer)
    setStatus(SAVED)
    onReplace(snapshot.board, reason)
  }

  function flush() {
    clearTimeout(timer)
    timer = undefined
    if (!connected || inFlight) return
    if (local === confirmed.board) return settle()

    const sending = local
    inFlight = true
    setStatus({ kind: 'saving' })

    repository.save(sending, confirmed.revision).then(
      (revision) => {
        inFlight = false
        // Record the acknowledgement even when disconnected: it is the server's truth.
        attempt = 0
        confirmed = { board: sending, revision }
        if (!connected) return
        // Changes made while this save was in flight go out next, based on the new revision.
        if (local !== sending) flush()
        else settle()
      },
      (error: unknown) => {
        inFlight = false
        if (!connected) return
        if (error instanceof ConflictError) return replace(error.latest, 'conflict')
        if (error instanceof RejectedError) return replace(confirmed, 'rejected')

        if (!(error instanceof NetworkError)) console.error('Unexpected save error', error)
        const delay = retryDelays[Math.min(attempt, retryDelays.length - 1)] ?? 1000
        attempt += 1
        setStatus({ kind: 'retrying', retryAt: now() + delay, attempt })
        timer = setTimeout(flush, delay)
      },
    )
  }

  function onRemoteSave(snapshot: BoardSnapshot) {
    if (snapshot.revision <= confirmed.revision) return
    // With unsaved changes we don't overwrite them here: the next save will hit a conflict,
    // which resolves it in one place.
    if (local === confirmed.board && !inFlight) replace(snapshot, 'remote')
  }

  return {
    /** The user changed the board. */
    update(board: BoardState) {
      if (board === local) return
      local = board
      // While backing off after errors, wait for the scheduled retry instead of hammering.
      if (status.kind === 'retrying') return
      clearTimeout(timer)
      if (local === confirmed.board) return settle() // e.g. undone back to what's saved
      setStatus({ kind: 'saving' })
      timer = setTimeout(flush, debounceMs)
    },
    /** Save now, skipping the debounce (e.g. when the tab is being hidden). */
    flush,
    retryNow() {
      if (status.kind === 'retrying') flush()
    },
    hasUnsavedChanges: () => local !== confirmed.board,
    getStatus: () => status,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    /**
     * Starts listening for saves from elsewhere and allows saving. Returns `disconnect`.
     * Separate from creation so React can do it in an effect (and StrictMode can redo it).
     */
    connect() {
      connected = true
      unsubscribe = repository.subscribe(onRemoteSave)
      if (local !== confirmed.board) timer = setTimeout(flush, debounceMs)
      return () => {
        connected = false
        clearTimeout(timer)
        unsubscribe?.()
      }
    },
  }
}
