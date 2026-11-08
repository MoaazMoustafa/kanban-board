import { afterEach, describe, expect, it } from 'vitest'
import { makeBoard } from '@/test/factories'
import { ConflictError, CorruptDataError, NetworkError, RejectedError } from './errors'
import { createLocalStorageRepository, parseStoredBoard } from './localStorageRepository'
import { migrate } from './migrations'
import { CURRENT_VERSION, toStored } from './schema'
import { withNetwork } from './withNetwork'

const KEY = 'test:board'
const board = makeBoard({ todo: ['a', 'b'], done: ['c'] })
/** A scripted `random`: returns the given values in order, then 0.99 (no failure). */
const sequence =
  (...values: number[]) =>
  () =>
    values.shift() ?? 0.99
const store = (value: unknown) => localStorage.setItem(KEY, JSON.stringify(value))

afterEach(() => localStorage.clear())

describe('parseStoredBoard', () => {
  it('reads a valid board', () => {
    expect(parseStoredBoard(JSON.stringify(toStored(board, 3)))).toEqual({ board, revision: 3 })
  })

  it.each([
    ['invalid JSON', '{nope'],
    ['a wrong shape', JSON.stringify({ version: CURRENT_VERSION, revision: 0, board: {} })],
    ['a column pointing at a missing card', JSON.stringify(toStored({ ...board, cards: {} }, 0))],
    [
      'a column missing from columnOrder',
      JSON.stringify(toStored({ ...board, columnOrder: board.columnOrder.slice(1) }, 0)),
    ],
    ['a newer, unknown version', JSON.stringify({ ...toStored(board, 0), version: 99 })],
  ])('rejects %s', (_, raw) => {
    expect(() => parseStoredBoard(raw)).toThrow(CorruptDataError)
  })
})

describe('migrate', () => {
  it('upgrades version 1 (no revision, no card timestamps)', () => {
    const v1 = {
      version: 1,
      board: {
        ...board,
        cards: { a: { id: 'a', title: 'A', description: '' } },
        columns: { todo: { id: 'todo', title: 'todo', cardIds: ['a'] } },
        columnOrder: ['todo'],
      },
    }
    const snapshot = parseStoredBoard(JSON.stringify(v1))
    expect(snapshot.revision).toBe(0)
    expect(Object.values(snapshot.board.cards)[0]).toMatchObject({ createdAt: 0 })
  })

  it('upgrades version 2 (cards without labels)', () => {
    const cardsWithoutLabels = Object.fromEntries(
      Object.values(board.cards).map(({ labels: _labels, ...card }) => [card.id, card]),
    )
    const v2 = { version: 2, revision: 4, board: { ...board, cards: cardsWithoutLabels } }

    const snapshot = parseStoredBoard(JSON.stringify(v2))
    expect(snapshot.revision).toBe(4)
    expect(snapshot.board).toEqual(board) // every card gained `labels: []`
  })

  it('leaves current data alone', () => {
    const current = toStored(board, 1)
    expect(migrate(current)).toBe(current)
  })
})

describe('localStorage repository', () => {
  const repository = createLocalStorageRepository(KEY)

  it('loads null when nothing is stored', async () => {
    await expect(repository.load()).resolves.toBeNull()
  })

  it('saves and loads, increasing the revision', async () => {
    await expect(repository.save(board, 0)).resolves.toBe(1)
    await expect(repository.save(board, 1)).resolves.toBe(2)
    await expect(repository.load()).resolves.toEqual({ board, revision: 2 })
  })

  it('refuses a save based on an outdated revision', async () => {
    await repository.save(board, 0)
    await repository.save(board, 1)
    const error = await repository.save(board, 1).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ConflictError)
    expect((error as ConflictError).latest.revision).toBe(2)
  })

  it('throws CorruptDataError for unreadable data, but can save over it', async () => {
    localStorage.setItem(KEY, 'garbage')
    await expect(repository.load()).rejects.toBeInstanceOf(CorruptDataError)
    await expect(repository.save(board, 0)).resolves.toBe(1)
  })

  it('notifies about saves from other tabs', async () => {
    const received: number[] = []
    const unsubscribe = repository.subscribe((snapshot) => received.push(snapshot.revision))
    const newValue = JSON.stringify(toStored(board, 7))
    window.dispatchEvent(new StorageEvent('storage', { key: KEY, newValue }))
    window.dispatchEvent(new StorageEvent('storage', { key: 'other', newValue }))
    unsubscribe()
    window.dispatchEvent(new StorageEvent('storage', { key: KEY, newValue }))
    expect(received).toEqual([7])
  })

  it('ignores unreadable data from other tabs', () => {
    store('ignored')
    const received: unknown[] = []
    const unsubscribe = repository.subscribe((s) => received.push(s))
    window.dispatchEvent(new StorageEvent('storage', { key: KEY, newValue: '{bad' }))
    unsubscribe()
    expect(received).toEqual([])
  })
})

describe('withNetwork', () => {
  const inner = createLocalStorageRepository(KEY)

  it('passes through when nothing fails', async () => {
    const repository = withNetwork(inner, { failureRate: 0.5, random: sequence(0.9, 0.9) })
    await expect(repository.save(board, 0)).resolves.toBe(1)
  })

  it('loses requests as NetworkError', async () => {
    const repository = withNetwork(inner, { failureRate: 0.5, random: sequence(0.1) })
    await expect(repository.save(board, 0)).rejects.toBeInstanceOf(NetworkError)
    await expect(inner.load()).resolves.toBeNull()
  })

  it('refuses saves as RejectedError', async () => {
    const repository = withNetwork(inner, { rejectRate: 0.5, random: sequence(0.9, 0.1) })
    await expect(repository.save(board, 0)).rejects.toBeInstanceOf(RejectedError)
  })
})
