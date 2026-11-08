import { afterEach, expect, it } from 'vitest'
import { makeBoard } from '@/test/factories'
import { createSeedBoard } from '../model/seed'
import { NetworkError } from './errors'
import { loadBoard } from './loadBoard'
import { createLocalStorageRepository } from './localStorageRepository'
import type { BoardRepository } from './repository'

const KEY = 'test:board'
const repository = createLocalStorageRepository(KEY)
afterEach(() => localStorage.clear())

it('loads the stored board', async () => {
  const board = makeBoard({ todo: ['a'] })
  await repository.save(board, 0)
  await expect(loadBoard(repository)).resolves.toEqual({ snapshot: { board, revision: 1 } })
})

it('starts with the demo board on first run', async () => {
  await expect(loadBoard(repository)).resolves.toEqual({
    snapshot: { board: createSeedBoard(), revision: 0 },
  })
})

it('backs up unreadable data and starts fresh', async () => {
  localStorage.setItem(KEY, '{broken')
  const result = await loadBoard(repository, localStorage, () => 123)

  expect(result.recovered).toEqual({ backupKey: 'kanban:board:unreadable:123' })
  expect(localStorage.getItem('kanban:board:unreadable:123')).toBe('{broken')
  expect(result.snapshot.board).toEqual(createSeedBoard())
})

it('lets network errors through so the UI can retry', async () => {
  const failing: BoardRepository = {
    ...repository,
    load: () => Promise.reject(new NetworkError('x')),
  }
  await expect(loadBoard(failing)).rejects.toBeInstanceOf(NetworkError)
})
