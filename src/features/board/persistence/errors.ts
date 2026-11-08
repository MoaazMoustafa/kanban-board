import type { BoardSnapshot } from './repository'

/** The request never got an answer. Safe to retry. */
export class NetworkError extends Error {
  override name = 'NetworkError'
}

/** Someone else saved first. Carries the latest stored board. */
export class ConflictError extends Error {
  override name = 'ConflictError'
  readonly latest: BoardSnapshot

  constructor(latest: BoardSnapshot) {
    super(`Conflict: the board is now at revision ${latest.revision}`)
    this.latest = latest
  }
}

/** The server refused this change for good (e.g. validation). Retrying won't help. */
export class RejectedError extends Error {
  override name = 'RejectedError'
}

/** Stored data exists but can't be read. Carries the raw text so it can be backed up. */
export class CorruptDataError extends Error {
  override name = 'CorruptDataError'
  readonly raw: string

  constructor(raw: string, reason: string) {
    super(`Stored board is unreadable: ${reason}`)
    this.raw = raw
  }
}
