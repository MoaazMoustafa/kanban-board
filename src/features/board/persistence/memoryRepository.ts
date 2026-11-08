import { ConflictError } from './errors'
import type { BoardRepository, BoardSnapshot } from './repository'

/** Keeps the board in memory only: for benchmarks and tests that must not touch real storage. */
export function createMemoryRepository(initial: BoardSnapshot | null = null): BoardRepository {
  let stored = initial
  return {
    load: async () => stored,
    async save(board, baseRevision) {
      if (stored && stored.revision !== baseRevision) throw new ConflictError(stored)
      stored = { board, revision: baseRevision + 1 }
      return stored.revision
    },
    subscribe: () => () => {},
  }
}
