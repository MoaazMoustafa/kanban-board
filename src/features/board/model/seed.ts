import { boardActions as a, type BoardAction } from './actions'
import { boardReducer, emptyBoard } from './reducer'
import type { BoardState, CardId, ColumnId } from './types'

const layout: Record<string, string[]> = {
  'To do': ['Design the empty state', 'Write keyboard shortcuts doc', 'Pick an icon set'],
  'In progress': ['Build the drag overlay', 'Persist board to localStorage'],
  Review: ['Accessible card dialog'],
  Done: ['Scaffold the project', 'Normalized board model'],
}

/** Demo board built by replaying actions, so it is valid by construction. Stable IDs keep it deterministic. */
export function createSeedBoard(): BoardState {
  const actions: BoardAction[] = Object.entries(layout).flatMap(([title, cards], col) => {
    const columnId = `seed-column-${col}` as ColumnId
    return [
      a.addColumn({ id: columnId, title }),
      ...cards.map((cardTitle, i) =>
        a.addCard({
          columnId,
          title: cardTitle,
          id: `seed-card-${col}-${i}` as CardId,
          createdAt: 0,
        }),
      ),
    ]
  })
  return actions.reduce(boardReducer, emptyBoard)
}
