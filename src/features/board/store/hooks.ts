import { use, useMemo, type Context } from 'react'
import { historyActions } from '@/shared/lib/history'
import { boardActions } from '../model/actions'
import { describeAction } from '../model/history'
import type { BoardState } from '../model/types'
import {
  BoardDispatchContext,
  BoardHistoryContext,
  BoardStateContext,
  type BoardDispatch,
} from './context'

function useRequiredContext<T>(context: Context<T | null>, name: string): T {
  const value = use(context)
  if (value === null) throw new Error(`${name} must be used inside <BoardProvider>`)
  return value
}

/**
 * Reads a slice of board state. Today every caller re-renders on any board change, because
 * Context has no way to subscribe to a slice. The API is shaped like `useSyncExternalStore`
 * on purpose: in Phase 7 we swap the implementation and only changed slices re-render.
 */
export function useBoardSelector<T>(selector: (state: BoardState) => T): T {
  return selector(useRequiredContext(BoardStateContext, 'useBoardSelector'))
}

/** Raw dispatch, for code that already has an action object. */
export function useBoardDispatch(): BoardDispatch {
  return useRequiredContext(BoardDispatchContext, 'useBoardDispatch')
}

type BoundActions = {
  [K in keyof typeof boardActions]: (...args: Parameters<(typeof boardActions)[K]>) => void
}

/** Action creators bound to dispatch: `actions.moveCard(id, col, 0)`. Stable across renders. */
export function useBoardActions(): BoundActions {
  const dispatch = useRequiredContext(BoardDispatchContext, 'useBoardActions')
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
  const history = useRequiredContext(BoardHistoryContext, 'useBoardHistory')
  const dispatch = useRequiredContext(BoardDispatchContext, 'useBoardHistory')
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
