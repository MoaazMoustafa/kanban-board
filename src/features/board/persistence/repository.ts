import type { BoardState } from '../model/types'

/** The board plus the server's revision counter, which increases by one on every save. */
export interface BoardSnapshot {
  readonly board: BoardState
  readonly revision: number
}

/**
 * Where boards are stored. The UI only talks to this interface, so swapping localStorage for a
 * real API (or a fake one with latency and failures) doesn't touch any component.
 */
export interface BoardRepository {
  /** The stored board, or null if nothing has been saved yet. */
  load(): Promise<BoardSnapshot | null>
  /**
   * Saves `board` if the stored revision is still `baseRevision` (optimistic concurrency).
   * Resolves with the new revision. Rejects with ConflictError, RejectedError or NetworkError.
   */
  save(board: BoardState, baseRevision: number): Promise<number>
  /** Calls `listener` when the board is saved somewhere else (another tab). */
  subscribe(listener: (snapshot: BoardSnapshot) => void): () => void
}
