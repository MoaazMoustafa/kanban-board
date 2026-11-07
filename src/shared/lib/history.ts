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

export type HistoryAction = { type: 'history/undo' } | { type: 'history/redo' }

export const historyActions = {
  undo: (): HistoryAction => ({ type: 'history/undo' }),
  redo: (): HistoryAction => ({ type: 'history/redo' }),
}

export function createHistory<S, A>(present: S): History<S, A> {
  return { past: [], present, future: [] }
}

const isHistoryAction = (action: { type: string }): action is HistoryAction =>
  action.type === 'history/undo' || action.type === 'history/redo'

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
  return function historyReducer(history: History<S, A>, action: A | HistoryAction): History<S, A> {
    const { past, present, future } = history

    if (isHistoryAction(action)) {
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
