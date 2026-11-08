import { use, useMemo, useSyncExternalStore, type Context } from 'react'
import { historyActions } from '@/shared/lib/history'
import { boardActions } from '../model/actions'
import { describeAction } from '../model/history'
import type { BoardState } from '../model/types'
import type { BoardStore } from './boardStore'
import { BoardStateSourceContext, BoardStoreContext } from './context'

function useRequiredContext<T>(context: Context<T | null>, name: string): T {
  const value = use(context)
  if (value === null) throw new Error(`${name} must be used inside <BoardProvider>`)
  return value
}

/** The real store, for code that needs dispatch or the committed state outside rendering. */
export function useBoardStore(): BoardStore {
  return useRequiredContext(BoardStoreContext, 'useBoardStore')
}

/**
 * Reads a slice of board state and re-renders only when that slice changes (compared with
 * Object.is). The selector must return existing objects or primitives, never build new ones,
 * or the component would re-render on every change.
 */
export function useBoardSelector<T>(selector: (state: BoardState) => T): T {
  const source = useRequiredContext(BoardStateSourceContext, 'useBoardSelector')
  return useSyncExternalStore(source.subscribe, () => selector(source.getState()))
}

/** Raw dispatch, for code that already has an action object. */
export function useBoardDispatch(): BoardStore['dispatch'] {
  return useBoardStore().dispatch
}

type BoundActions = {
  [K in keyof typeof boardActions]: (...args: Parameters<(typeof boardActions)[K]>) => void
}

/** Action creators bound to dispatch: `actions.moveCard(id, col, 0)`. Stable across renders. */
export function useBoardActions(): BoundActions {
  const { dispatch } = useBoardStore()
  return useMemo(() => {
    const bind =
      <A extends unknown[]>(create: (...args: A) => Parameters<typeof dispatch>[0]) =>
      (...args: A) => {
        dispatch(create(...args))
      }
    return {
      addCard: bind(boardActions.addCard),
      updateCard: bind(boardActions.updateCard),
      deleteCard: bind(boardActions.deleteCard),
      moveCard: bind(boardActions.moveCard),
      addColumn: bind(boardActions.addColumn),
      renameColumn: bind(boardActions.renameColumn),
      deleteColumn: bind(boardActions.deleteColumn),
      moveColumn: bind(boardActions.moveColumn),
    }
  }, [dispatch])
}

export interface BoardHistoryControls {
  /** Label of the step undo would revert, e.g. "Move card “Fix login”"; null if none. */
  undoLabel: string | null
  redoLabel: string | null
  undo: () => void
  redo: () => void
}

export function useBoardHistory(): BoardHistoryControls {
  const store = useBoardStore()
  const history = useSyncExternalStore(store.subscribe, store.getHistory)
  const { dispatch } = store
  const last = history.past.at(-1)
  const next = history.future[0]

  return {
    undoLabel: last ? describeAction(last.action, last.state) : null,
    // A redo entry stores the state *after* its action; the label needs the state before it,
    // which is the current state.
    redoLabel: next ? describeAction(next.action, history.present) : null,
    undo: useMemo(() => () => dispatch(historyActions.undo()), [dispatch]),
    redo: useMemo(() => () => dispatch(historyActions.redo()), [dispatch]),
  }
}
