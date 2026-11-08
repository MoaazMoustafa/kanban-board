import { createLocalStorageRepository, withNetwork, type BoardRepository } from '@/features/board'

/**
 * localStorage by default. Add `?api=fake` to the URL to simulate a slow, unreliable server:
 *   ?api=fake&latency=800&fail=0.3&reject=0.1
 * latency: max delay in ms · fail: chance of a network error · reject: chance a save is refused
 */
export function createAppRepository(search: string): BoardRepository {
  const params = new URLSearchParams(search)
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
