/**
 * One undoable step. In `past`, `state` is the state *before* `action` (what undo restores);
 * in `future`, it is the state *after* `action` (what redo restores).
 */
export interface HistoryEntry<S, A> {
  readonly state: S
  readonly action: A
}

/**
 * Snapshot-based undo history. Each step stores a whole state, which is cheap because
 * immutable updates share every unchanged part with the previous state.
 */
export interface History<S, A> {
  readonly past: readonly HistoryEntry<S, A>[]
  readonly present: S
  readonly future: readonly HistoryEntry<S, A>[]
}

export type HistoryAction<S> =
  | { type: 'history/undo' }
  | { type: 'history/redo' }
  /** Replace the present from outside (e.g. a save from another tab) and forget history. */
  | { type: 'history/reset'; state: S }

export const historyActions = {
  undo: (): HistoryAction<never> => ({ type: 'history/undo' }),
  redo: (): HistoryAction<never> => ({ type: 'history/redo' }),
  reset: <S>(state: S): HistoryAction<S> => ({ type: 'history/reset', state }),
}

export function createHistory<S, A>(present: S): History<S, A> {
  return { past: [], present, future: [] }
}

const isHistoryAction = <S>(action: { type: string }): action is HistoryAction<S> =>
  action.type.startsWith('history/')

/**
 * Higher-order reducer: wraps `reducer` so its state gains undo/redo.
 *
 * - Actions that return the same state object (no-ops) are not recorded.
 * - A new action clears the redo stack, as in every editor.
 * - Only the most recent `limit` steps are kept.
 */
export function withHistory<S, A extends { type: string }>(
  reducer: (state: S, action: A) => S,
  { limit = 100 }: { limit?: number } = {},
) {
  return function historyReducer(
    history: History<S, A>,
    action: A | HistoryAction<S>,
  ): History<S, A> {
    const { past, present, future } = history

    if (isHistoryAction<S>(action)) {
      // Old snapshots would bring back a board the outside world has moved past, so they go.
      if (action.type === 'history/reset') return createHistory(action.state)
      if (action.type === 'history/undo') {
        const previous = past.at(-1)
        if (!previous) return history
        return {
          past: past.slice(0, -1),
          present: previous.state,
          future: [{ state: present, action: previous.action }, ...future],
        }
      }
      const [next, ...rest] = future
      if (!next) return history
      return {
        past: [...past, { state: present, action: next.action }],
        present: next.state,
        future: rest,
      }
    }

    const next = reducer(present, action)
    if (next === present) return history
    return {
      past: [...past, { state: present, action }].slice(-limit),
      present: next,
      future: [],
    }
  }
}
