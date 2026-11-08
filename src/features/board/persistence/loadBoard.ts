import { createSeedBoard } from '../model/seed'
import { CorruptDataError } from './errors'
import type { BoardRepository, BoardSnapshot } from './repository'

export interface LoadedBoard {
  snapshot: BoardSnapshot
  /** Set when the stored board couldn't be used and a fresh one was started instead. */
  recovered?: { backupKey: string }
}

/**
 * Loads the board for the app: the stored one, a demo board on first run, or, if the stored
 * data is unreadable, a demo board plus a backup of the unreadable data (never silently lost).
 * Network errors propagate, so the UI can offer a retry.
 */
export async function loadBoard(
  repository: BoardRepository,
  backup: Storage = window.localStorage,
  now = Date.now,
): Promise<LoadedBoard> {
  try {
    const stored = await repository.load()
    // revision 0: nothing stored yet; the first save creates revision 1.
    return { snapshot: stored ?? { board: createSeedBoard(), revision: 0 } }
  } catch (error) {
    if (!(error instanceof CorruptDataError)) throw error
    const backupKey = `kanban:board:unreadable:${now()}`
    backup.setItem(backupKey, error.raw)
    return { snapshot: { board: createSeedBoard(), revision: 0 }, recovered: { backupKey } }
  }
}
