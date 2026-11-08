import {
  createLocalStorageRepository,
  createMemoryRepository,
  generateBoard,
  withNetwork,
  type BoardRepository,
} from '@/features/board'

/**
 * localStorage by default. Add `?api=fake` to the URL to simulate a slow, unreliable server:
 *   ?api=fake&latency=800&fail=0.3&reject=0.1
 * latency: max delay in ms · fail: chance of a network error · reject: chance a save is refused
 *
 * `?bench=50x100` loads a generated board (50 columns × 100 cards) kept in memory only, for
 * performance measurements that must not overwrite the real board.
 */
export function createAppRepository(search: string): BoardRepository {
  const params = new URLSearchParams(search)
  const bench = /^(\d+)x(\d+)$/.exec(params.get('bench') ?? '')
  if (bench) {
    const board = generateBoard({ columns: Number(bench[1]), cardsPerColumn: Number(bench[2]) })
    return createMemoryRepository({ board, revision: 1 })
  }
  const storage = createLocalStorageRepository()
  if (params.get('api') !== 'fake') return storage

  const number = (name: string, fallback: number) => {
    const value = Number(params.get(name) ?? fallback)
    return Number.isFinite(value) ? value : fallback
  }
  const maxLatency = number('latency', 800)
  return withNetwork(storage, {
    latency: [maxLatency / 3, maxLatency],
    failureRate: number('fail', 0.2),
    rejectRate: number('reject', 0),
  })
}
