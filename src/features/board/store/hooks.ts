import { use, useMemo, type Context } from 'react'
import { boardActions } from '../model/actions'
import type { BoardState } from '../model/types'
import { BoardDispatchContext, BoardStateContext } from './context'

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
