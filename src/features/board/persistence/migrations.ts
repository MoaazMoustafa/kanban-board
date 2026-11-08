import { CURRENT_VERSION } from './schema'

/**
 * Each migration upgrades data from version N to N + 1. They run in order on load, so data
 * saved by any older version of the app still opens. Migrations take `unknown` because old
 * data is only validated once it reaches the current version.
 *
 * Version 1 (an early prototype format) had no revision counter and no card timestamps.
 * Version 2 had no card labels.
 */
const migrations: Record<number, (data: Record<string, unknown>) => Record<string, unknown>> = {
  1: (data) => {
    const board = data['board'] as { cards?: Record<string, Record<string, unknown>> } | undefined
    const cards = Object.fromEntries(
      Object.entries(board?.cards ?? {}).map(([id, card]) => [id, { createdAt: 0, ...card }]),
    )
    return { ...data, version: 2, revision: 0, board: { ...board, cards } }
  },
  2: (data) => mapCards(data, 3, (card) => ({ labels: [], ...card })),
}

/** Applies `update` to every stored card and sets the new version. */
function mapCards(
  data: Record<string, unknown>,
  version: number,
  update: (card: Record<string, unknown>) => Record<string, unknown>,
) {
  const board = data['board'] as { cards?: Record<string, Record<string, unknown>> } | undefined
  const cards = Object.fromEntries(
    Object.entries(board?.cards ?? {}).map(([id, card]) => [id, update(card)]),
  )
  return { ...data, version, board: { ...board, cards } }
}

export class UnsupportedVersionError extends Error {
  override name = 'UnsupportedVersionError'
}

export function migrate(data: unknown): unknown {
  if (typeof data !== 'object' || data === null || !('version' in data)) return data
  let current = data as Record<string, unknown>

  while (typeof current['version'] === 'number' && current['version'] < CURRENT_VERSION) {
    const step = migrations[current['version']]
    if (!step) throw new UnsupportedVersionError(`No migration from version ${current['version']}`)
    current = step(current)
  }
  // Never "fix" data from a newer app version: saving over it would destroy the user's work.
  if (typeof current['version'] === 'number' && current['version'] > CURRENT_VERSION) {
    throw new UnsupportedVersionError(`Saved with a newer version (${current['version']})`)
  }
  return current
}
