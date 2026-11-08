import { expect, it, vi } from 'vitest'
import { historyActions } from '@/shared/lib/history'
import { cardId, columnId, makeBoard } from '@/test/factories'
import { boardActions as a } from '../model/actions'
import { createBoardStore } from './boardStore'

it('dispatches through the history reducer and notifies subscribers', () => {
  const store = createBoardStore(makeBoard({ todo: ['a'] }))
  const listener = vi.fn<() => void>()
  store.subscribe(listener)

  store.dispatch(a.renameColumn(columnId('todo'), 'Backlog'))
  expect(store.getState().columns[columnId('todo')]?.title).toBe('Backlog')
  expect(listener).toHaveBeenCalledTimes(1)

  store.dispatch(historyActions.undo())
  expect(store.getState().columns[columnId('todo')]?.title).toBe('todo')
  expect(listener).toHaveBeenCalledTimes(2)
})

it('does not notify when nothing changed', () => {
  const store = createBoardStore(makeBoard({ todo: ['a'] }))
  const listener = vi.fn<() => void>()
  const unsubscribe = store.subscribe(listener)

  store.dispatch(a.deleteCard(cardId('missing')))
  expect(listener).not.toHaveBeenCalled()
  unsubscribe()
  store.dispatch(a.deleteCard(cardId('a')))
  expect(listener).not.toHaveBeenCalled()
})
