import { z } from 'zod'
import type { BoardState } from '../model/types'
import { ConflictError, CorruptDataError } from './errors'
import { migrate, UnsupportedVersionError } from './migrations'
import type { BoardRepository, BoardSnapshot } from './repository'
import { storedBoardSchema, toSnapshot, toStored } from './schema'

export const DEFAULT_STORAGE_KEY = 'kanban:board'

/** Parses, migrates and validates stored text. Throws CorruptDataError if anything is off. */
export function parseStoredBoard(raw: string): BoardSnapshot {
  let data: unknown
  try {
    data = migrate(JSON.parse(raw))
  } catch (error) {
    const reason = error instanceof UnsupportedVersionError ? error.message : 'invalid JSON'
    throw new CorruptDataError(raw, reason)
  }
  const result = storedBoardSchema.safeParse(data)
  if (!result.success) throw new CorruptDataError(raw, z.prettifyError(result.error))
  return toSnapshot(result.data)
}

/**
 * Stores the board in localStorage. It plays the role of the server: it owns the revision
 * counter and refuses saves based on an outdated revision, which is how two tabs editing the
 * same board find out about each other.
 */
export function createLocalStorageRepository(
  key = DEFAULT_STORAGE_KEY,
  storage: Storage = window.localStorage,
): BoardRepository {
  function read(): BoardSnapshot | null {
    const raw = storage.getItem(key)
    return raw === null ? null : parseStoredBoard(raw)
  }

  return {
    // async: callers treat every repository the same, whether or not it is really asynchronous.
    async load() {
      return read()
    },

    async save(board: BoardState, baseRevision: number) {
      // Unreadable data was already backed up when it was loaded, so it counts as revision 0.
      let current: BoardSnapshot | null = null
      try {
        current = read()
      } catch (error) {
        if (!(error instanceof CorruptDataError)) throw error
      }
      if (current && current.revision !== baseRevision) throw new ConflictError(current)

      const revision = baseRevision + 1
      storage.setItem(key, JSON.stringify(toStored(board, revision)))
      return revision
    },

    subscribe(listener) {
      // The `storage` event fires in *other* tabs of the same origin, never in the writer.
      const onStorage = (event: StorageEvent) => {
        if (event.key !== key || event.newValue === null) return
        try {
          listener(parseStoredBoard(event.newValue))
        } catch {
          // Another tab wrote something unreadable; ignore it rather than replace a good board.
        }
      }
      window.addEventListener('storage', onStorage)
      return () => window.removeEventListener('storage', onStorage)
    },
  }
}
