import { boardActions as a, type BoardAction } from './actions'
import { boardReducer, emptyBoard } from './reducer'
import type { LabelId } from './labels'
import type { BoardState, CardId, ColumnId } from './types'

const layout: Record<string, [title: string, labels: LabelId[]][]> = {
  'To do': [
    ['Design the empty state', ['design']],
    ['Write keyboard shortcuts doc', ['chore']],
    ['Pick an icon set', ['design', 'research']],
  ],
  'In progress': [
    ['Build the drag overlay', ['feature']],
    ['Persist board to localStorage', ['feature', 'urgent']],
  ],
  Review: [['Accessible card dialog', ['feature']]],
  Done: [
    ['Scaffold the project', ['chore']],
    ['Normalized board model', []],
  ],
}

/** Demo board built by replaying actions, so it is valid by construction. Stable IDs keep it deterministic. */
export function createSeedBoard(): BoardState {
  const actions: BoardAction[] = Object.entries(layout).flatMap(([title, cards], col) => {
    const columnId = `seed-column-${col}` as ColumnId
    return [
      a.addColumn({ id: columnId, title }),
      ...cards.map(([cardTitle, labels], i) =>
        a.addCard({
          columnId,
          title: cardTitle,
          labels,
          id: `seed-card-${col}-${i}` as CardId,
          createdAt: 0,
        }),
      ),
    ]
  })
  return actions.reduce(boardReducer, emptyBoard)
}
