import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeBoard } from '@/test/factories'
import type { BoardState } from '../model/types'
import { ConflictError, NetworkError, RejectedError } from './errors'
import type { BoardRepository, BoardSnapshot } from './repository'
import { createBoardSync, type ReplaceReason } from './sync'

/** A repository whose saves stay pending until the test settles them. */
function controlledRepository() {
  const saves: {
    board: BoardState
    base: number
    resolve: (revision: number) => void
    reject: (error: Error) => void
  }[] = []
  let push: ((snapshot: BoardSnapshot) => void) | undefined
  const repository: BoardRepository = {
    load: async () => null,
    save: (board, base) =>
      new Promise((resolve, reject) => saves.push({ board, base, resolve, reject })),
    subscribe(listener) {
      push = listener
      return () => (push = undefined)
    },
  }
  return { repository, saves, push: (snapshot: BoardSnapshot) => push?.(snapshot) }
}

const v0 = makeBoard({ todo: ['a'] })
const v1 = makeBoard({ todo: ['a', 'b'] })
const v2 = makeBoard({ todo: ['a', 'b', 'c'] })
const v3 = makeBoard({ todo: ['c'] })

function setup() {
  const repo = controlledRepository()
  const replaced: [BoardState, ReplaceReason][] = []
  const sync = createBoardSync({
    repository: repo.repository,
    initial: { board: v0, revision: 5 },
    onReplace: (board, reason) => replaced.push([board, reason]),
    debounceMs: 300,
    retryDelays: [1000, 2000],
  })
  const disconnect = sync.connect()
  return { ...repo, sync, replaced, disconnect }
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('board sync', () => {
  it('debounces changes into one save of the latest board', async () => {
    const { sync, saves } = setup()
    sync.update(v1)
    await vi.advanceTimersByTimeAsync(200)
    sync.update(v2)
    await vi.advanceTimersByTimeAsync(299)
    expect(saves).toHaveLength(0)
    expect(sync.getStatus().kind).toBe('saving')

    await vi.advanceTimersByTimeAsync(1)
    expect(saves.map((s) => [s.board, s.base])).toEqual([[v2, 5]])

    saves[0]!.resolve(6)
    await vi.advanceTimersByTimeAsync(0)
    expect(sync.getStatus().kind).toBe('saved')
    expect(sync.hasUnsavedChanges()).toBe(false)
  })

  it('never has two saves in flight, and bases the next one on the new revision', async () => {
    const { sync, saves } = setup()
    sync.update(v1)
    sync.flush()
    sync.update(v2)
    sync.flush()
    await vi.advanceTimersByTimeAsync(1000)
    expect(saves).toHaveLength(1)

    saves[0]!.resolve(6)
    await vi.advanceTimersByTimeAsync(0)
    expect(saves.map((s) => [s.board, s.base])).toEqual([
      [v1, 5],
      [v2, 6],
    ])
  })

  it('cancels a pending save when the board goes back to what is saved', async () => {
    const { sync, saves } = setup()
    sync.update(v1)
    sync.update(v0) // e.g. undo
    await vi.advanceTimersByTimeAsync(1000)
    expect(saves).toHaveLength(0)
    expect(sync.getStatus().kind).toBe('saved')
  })

  it('retries network errors with backoff, keeping the local board', async () => {
    const { sync, saves, replaced } = setup()
    sync.update(v1)
    sync.flush()
    saves[0]!.reject(new NetworkError('offline'))
    await vi.advanceTimersByTimeAsync(0)
    expect(sync.getStatus()).toMatchObject({ kind: 'retrying', attempt: 1 })

    sync.update(v2) // a change while offline waits for the scheduled retry
    await vi.advanceTimersByTimeAsync(999)
    expect(saves).toHaveLength(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(saves[1]?.board).toBe(v2)

    saves[1]!.reject(new NetworkError('still offline'))
    await vi.advanceTimersByTimeAsync(1999)
    expect(saves).toHaveLength(2)
    await vi.advanceTimersByTimeAsync(1)
    saves[2]!.resolve(6)
    await vi.advanceTimersByTimeAsync(0)
    expect(sync.getStatus().kind).toBe('saved')
    expect(replaced).toEqual([])
  })

  it('retryNow skips the wait', async () => {
    const { sync, saves } = setup()
    sync.update(v1)
    sync.flush()
    saves[0]!.reject(new NetworkError('offline'))
    await vi.advanceTimersByTimeAsync(0)
    sync.retryNow()
    expect(saves).toHaveLength(2)
  })

  it('on conflict, takes the latest stored board', async () => {
    const { sync, saves, replaced } = setup()
    sync.update(v1)
    sync.flush()
    saves[0]!.reject(new ConflictError({ board: v3, revision: 9 }))
    await vi.advanceTimersByTimeAsync(0)
    expect(replaced).toEqual([[v3, 'conflict']])

    // Later saves are based on the revision we just learned about.
    sync.update(v2)
    sync.flush()
    expect(saves[1]?.base).toBe(9)
  })

  it('on rejection, rolls back to the last confirmed board', async () => {
    const { sync, saves, replaced } = setup()
    sync.update(v1)
    sync.flush()
    saves[0]!.reject(new RejectedError('no'))
    await vi.advanceTimersByTimeAsync(0)
    expect(replaced).toEqual([[v0, 'rejected']])
    expect(sync.getStatus().kind).toBe('saved')
  })

  it('applies saves from other tabs when there are no local changes', () => {
    const { sync, push, replaced } = setup()
    push({ board: v3, revision: 6 })
    push({ board: v1, revision: 6 }) // not newer: ignored
    expect(replaced).toEqual([[v3, 'remote']])
    expect(sync.hasUnsavedChanges()).toBe(false)
  })

  it('does not overwrite local changes with a remote save', () => {
    const { sync, push, replaced } = setup()
    sync.update(v1)
    push({ board: v3, revision: 6 })
    expect(replaced).toEqual([])
    expect(sync.hasUnsavedChanges()).toBe(true)
  })

  it('stops after disconnecting', async () => {
    const { sync, saves, push, replaced, disconnect } = setup()
    sync.update(v1)
    disconnect()
    await vi.advanceTimersByTimeAsync(1000)
    push({ board: v3, revision: 6 })
    expect(saves).toHaveLength(0)
    expect(replaced).toEqual([])
  })

  it('saves pending changes once reconnected (StrictMode remounts)', async () => {
    const { sync, saves, disconnect } = setup()
    sync.update(v1)
    disconnect()
    sync.connect()
    await vi.advanceTimersByTimeAsync(300)
    expect(saves.map((s) => s.board)).toEqual([v1])
  })
})
