import { use, useMemo, type ReactNode } from 'react'
import { useDragState } from '@/features/dnd'
import { dragToAction } from '../model/drag'
import { boardReducer } from '../model/reducer'
import { BoardStateContext } from './context'

/**
 * While dragging, everything below sees the board *as if* the drop had already happened:
 * the real reducer applied to the real state, without dispatching. The DOM reorders itself,
 * so the dragged item's own element becomes the placeholder in its new spot.
 * Escape simply drops the preview; a drop dispatches the same action for real.
 */
export function BoardDragPreview({ children }: { children: ReactNode }) {
  const state = use(BoardStateContext)
  if (!state) throw new Error('BoardDragPreview must be used inside <BoardProvider>')
  const { status, active, target } = useDragState()

  const preview = useMemo(() => {
    if (status !== 'dragging' || !active || !target) return state
    const action = dragToAction({ active, target })
    return action ? boardReducer(state, action) : state
  }, [state, status, active, target])

  return <BoardStateContext value={preview}>{children}</BoardStateContext>
}
