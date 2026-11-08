import { NetworkError, RejectedError } from './errors'
import type { BoardRepository } from './repository'

export interface NetworkOptions {
  /** Delay range per request in ms, e.g. [300, 900]. */
  latency?: readonly [number, number]
  /** Chance (0–1) that a request is lost: retryable. */
  failureRate?: number
  /** Chance (0–1) that a save is refused for good: rolled back. */
  rejectRate?: number
  random?: () => number
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Decorator: wraps any repository so it behaves like a remote API, slow and unreliable.
 * Same interface in, same interface out, so the app can't tell the difference.
 */
export function withNetwork(
  repository: BoardRepository,
  { latency = [0, 0], failureRate = 0, rejectRate = 0, random = Math.random }: NetworkOptions = {},
): BoardRepository {
  const [min, max] = latency
  // Like a real API, nothing gets through while the browser is offline.
  const lost = () => random() < failureRate || navigator.onLine === false
  // A fixed latency doesn't draw a random number, so tests can script `random` exactly.
  const delay = () => wait(min === max ? min : min + random() * (max - min))

  return {
    async load() {
      await delay()
      if (lost()) throw new NetworkError('Load failed: network error')
      return repository.load()
    },
    async save(board, baseRevision) {
      await delay()
      if (lost()) throw new NetworkError('Save failed: network error')
      if (random() < rejectRate) throw new RejectedError('Save rejected by the server')
      return repository.save(board, baseRevision)
    },
    // Stands in for a server push (e.g. a WebSocket): other tabs' saves still arrive.
    subscribe: (listener) => repository.subscribe(listener),
  }
}
