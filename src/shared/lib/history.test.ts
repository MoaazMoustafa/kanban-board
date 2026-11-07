import { describe, expect, it } from 'vitest'
import { createHistory, historyActions, withHistory, type History } from './history'

type Action = { type: 'add'; amount: number } | { type: 'noop' }
const counter = (state: number, action: Action) =>
  action.type === 'add' ? state + action.amount : state
const reducer = withHistory(counter, { limit: 3 })
const add = (amount: number): Action => ({ type: 'add', amount })

const run = (...actions: Parameters<typeof reducer>[1][]) =>
  actions.reduce(reducer, createHistory<number, Action>(0))

describe('withHistory', () => {
  it('records each change with the action that caused it', () => {
    const history = run(add(1), add(2))
    expect(history.present).toBe(3)
    expect(history.past).toEqual([
      { state: 0, action: add(1) },
      { state: 1, action: add(2) },
    ])
  })

  it('undoes and redoes', () => {
    const undone = run(add(1), add(2), historyActions.undo())
    expect(undone.present).toBe(1)
    expect(undone.future).toEqual([{ state: 3, action: add(2) }])

    const redone = reducer(undone, historyActions.redo())
    expect(redone.present).toBe(3)
    expect(redone.past.at(-1)).toEqual({ state: 1, action: add(2) })
    expect(redone.future).toEqual([])
  })

  it('does not record no-op actions', () => {
    const history = run(add(1))
    expect(reducer(history, { type: 'noop' })).toBe(history)
  })

  it('clears the redo stack on a new action', () => {
    const history = run(add(1), add(2), historyActions.undo(), add(10))
    expect(history.present).toBe(11)
    expect(history.future).toEqual([])
  })

  it('keeps only the most recent `limit` steps', () => {
    const history = run(add(1), add(1), add(1), add(1), add(1))
    expect(history.past.map((entry) => entry.state)).toEqual([2, 3, 4])
  })

  it('returns the same object when there is nothing to undo or redo', () => {
    const history: History<number, Action> = createHistory(0)
    expect(reducer(history, historyActions.undo())).toBe(history)
    expect(reducer(history, historyActions.redo())).toBe(history)
  })
})
